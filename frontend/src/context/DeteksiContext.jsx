import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { socketClient } from '../utils/socketClient'
import { API_ENDPOINTS, apiRequest } from '../utils/api'

const DeteksiContext = createContext(null)

export function DeteksiProvider({ children }) {
  // Core state
  const [detectionData, setDetectionData] = useState([])
  const [videoPreview, setVideoPreview] = useState(null)
  const [selectedDetection, setSelectedDetection] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [processingDetections, setProcessingDetections] = useState(new Set())
  const [realTimeProgress, setRealTimeProgress] = useState(null)
  const [currentTrackingId, setCurrentTrackingId] = useState(null)
  
  const socketRef = useRef(null)
  const currentPageRef = useRef(currentPage)
  const itemsPerPage = 4

  // Keep currentPageRef in sync
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Clear messages after timeout
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('')
        setSuccessMessage('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchDetections = useCallback(async () => {
    if (loading) return
    
    try {
      setLoading(true)
      setError('')
      
      const response = await apiRequest(`${API_ENDPOINTS.DETECTION_LIST}?page=${currentPageRef.current}&limit=${itemsPerPage}`)
      
      if (response.success) {
        setDetectionData(response.data || [])
        setTotalPages(response.pagination?.total_pages || 1)
        setTotalItems(response.pagination?.total_items || 0)
      } else {
        throw new Error(response.message || 'Failed to fetch detections')
      }
    } catch (err) {
      console.error('Error fetching detections:', err)
      setError(`Gagal memuat data deteksi: ${err.message}`)
      setDetectionData([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup Socket.IO connection using socketClient
  useEffect(() => {
    console.log('🔌 Initializing Socket.IO connection...')
    
    // Connect to Socket.IO server
    const socket = socketClient.connect()
    
    if (!socket) {
      console.warn('⚠️ Socket.IO connection failed - no valid token')
      return
    }

    // Register event handlers using socketClient
    socketClient.on('connected', (data) => {
      console.log('✅ Socket.IO connected via socketClient:', data)
    })
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect()
      }
    })

    socket.on('connect_error', (err) => {
      console.error('🚫 Socket.IO connection error:', err.message)
      console.error('Error details:', err)
      
      // Try to reconnect with different transport if WebSocket fails
      if (err.message.includes('websocket error')) {
        console.log('🔄 Retrying with polling transport only...')
        socket.io.opts.transports = ['polling']
      }
    })
    
    socket.on('connected', (data) => {
      console.log('🎉 Server confirmed connection:', data)
    })

    // Global listener for detection status changes
    socket.on('detection-status-changed', (data) => {
      console.log('🎉 Global detection status changed:', data)
      
      if (data.stage === 'completed') {
        fetchDetections()
        
        // Remove from processing set
        setProcessingDetections(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.trackingId)
          return newSet
        })
        
        // Clear real-time progress if it's for current tracking
        if (data.trackingId === currentTrackingId) {
          setRealTimeProgress(null)
          setCurrentTrackingId(null)
        }
        
        setSuccessMessage('Deteksi video berhasil diselesaikan!')
      } else if (data.stage === 'error') {
        // Remove from processing set
        setProcessingDetections(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.trackingId)
          return newSet
        })
        
        // Clear progress
        if (data.trackingId === currentTrackingId) {
          setRealTimeProgress(null)
          setCurrentTrackingId(null)
        }
        
        setError(`Deteksi gagal: ${data.message || data.error}`)
      }
    })

    // Listen for real-time detection progress
    socket.on('detection-progress', (data) => {
      console.log('📊 Detection progress:', data)
      
      // Update real-time progress if this is the current tracking ID
      if (data.trackingId === currentTrackingId) {
        setRealTimeProgress(data)
      }
    })

    socketRef.current = socket

    return () => {
      console.log('🔌 Cleaning up Socket.IO connection')
      socket.disconnect()
    }
  }, []) 

  // Join detection room when tracking ID changes
  useEffect(() => {
    if (currentTrackingId && socketRef.current) {
      console.log('📺 Joining detection room:', currentTrackingId)
      socketRef.current.emit('join_detection', { tracking_id: currentTrackingId })
      
      return () => {
        if (socketRef.current) {
          console.log('📺 Leaving detection room:', currentTrackingId)
          socketRef.current.emit('leave_detection', { tracking_id: currentTrackingId })
        }
      }
    }
  }, [currentTrackingId])

  // Upload video function
  const uploadVideo = async (file) => {
    if (uploading) {
      console.warn('Upload already in progress')
      return
    }

    try {
      setUploading(true)
      setUploadProgress('Preparing upload...')
      setError('')
      setSuccessMessage('')

      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('File harus berupa video')
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File terlalu besar (maksimal 50MB)')
      }

      setUploadProgress('Uploading video...')

      const formData = new FormData()
      formData.append('file', file)

      const response = await apiRequest(API_ENDPOINTS.UPLOAD_VIDEO, {
        method: 'POST',
        body: formData,
        headers: {
          // Remove Content-Type to let browser set it with boundary for FormData
        }
      })

      if (response.success && response.data) {
        const { tracking_id, filename } = response.data
        
        setUploadProgress('Upload successful! Processing video...')
        setSuccessMessage('Video berhasil diunggah dan sedang diproses')
        
        // Start tracking this detection
        setCurrentTrackingId(tracking_id)
        setProcessingDetections(prev => new Set([...prev, tracking_id]))
        
        // Initialize progress
        setRealTimeProgress({
          trackingId: tracking_id,
          stage: 'starting',
          message: 'Memulai deteksi video...',
          progress: 0
        })
        
        setTimeout(() => {
          setUploadProgress('')
        }, 3000)
        
        return { tracking_id, filename }
      } else {
        throw new Error(response.message || 'Upload failed')
      }

    } catch (err) {
      console.error('Upload error:', err)
      setError(`Gagal mengunggah video: ${err.message}`)
      setUploadProgress('')
      throw err
    } finally {
      setUploading(false)
    }
  }

  // Delete detection function
  const deleteDetection = async (detectionId) => {
    try {
      setLoading(true)
      const response = await apiRequest(API_ENDPOINTS.DELETE_DETECTION(detectionId), {
        method: 'DELETE'
      })
      
      if (response.success) {
        setSuccessMessage('Data deteksi berhasil dihapus')
        await fetchDetections() // Refresh the list
      } else {
        throw new Error(response.message || 'Gagal menghapus data')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError(`Gagal menghapus data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Fetch detections when page changes
  useEffect(() => {
    fetchDetections()
  }, [currentPage, fetchDetections])

  const contextValue = {
    // State
    detectionData,
    videoPreview,
    selectedDetection,
    currentPage,
    totalPages,
    totalItems,
    loading,
    uploading,
    error,
    successMessage,
    uploadProgress,
    processingDetections,
    realTimeProgress,
    currentTrackingId,
    
    // Actions
    uploadVideo,
    deleteDetection,
    fetchDetections,
    setVideoPreview,
    setSelectedDetection,
    setError,
    setSuccessMessage,
    goToNextPage,
    goToPrevPage,
    goToPage,
    
    // Pagination
    itemsPerPage
  }

  return (
    <DeteksiContext.Provider value={contextValue}>
      {children}
    </DeteksiContext.Provider>
  )
}

DeteksiProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useDeteksi = () => {
  const context = useContext(DeteksiContext)
  if (context === null) {
    throw new Error('useDeteksi must be used within a DeteksiProvider')
  }
  return context
}