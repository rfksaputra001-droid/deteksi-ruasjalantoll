import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { io } from 'socket.io-client'
import { SOCKET_URL, API_ENDPOINTS, apiRequest } from '../config/api'

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
        const processedData = response.data.map((item, index) => ({
          id: index + 1 + (currentPageRef.current - 1) * itemsPerPage,
          ...item
        }))
        
        setDetectionData(processedData)
        
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1)
          setTotalItems(response.pagination.totalItems || 0)
        }
      } else {
        throw new Error(response.message || 'Failed to fetch detection data')
      }
    } catch (error) {
      console.error('Error fetching detections:', error)
      setError(`Gagal memuat data deteksi: ${error.message}`)
      setDetectionData([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup Socket.IO connection - only once
  useEffect(() => {
    console.log('🔗 Initializing Socket.IO with URL:', SOCKET_URL)
    
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      forceNew: false,
      autoConnect: true,
      withCredentials: true,
      path: '/socket.io/'
    })

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected successfully:', socket.id)
      console.log('Transport:', socket.io.engine.transport.name)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err.message)
      console.error('Error details:', err)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts')
    })

    socket.on('reconnect_error', (err) => {
      console.error('❌ Socket.IO reconnect error:', err.message)
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
        
        // Clear real-time progress if it's for current tracking
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
      socket.disconnect()
    }
  }, [fetchDetections, currentTrackingId])

  // Initialize data on mount
  useEffect(() => {
    fetchDetections()
  }, [fetchDetections])

  const uploadVideo = async (file, progressCallback) => {
    if (!file) {
      throw new Error('File tidak valid')
    }

    try {
      setUploading(true)
      setUploadProgress('')
      setError('')
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(API_ENDPOINTS.UPLOAD_VIDEO, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed')
      }

      if (data.success && data.data) {
        const trackingId = data.data.trackingId
        
        // Add to processing set
        setProcessingDetections(prev => new Set([...prev, trackingId]))
        setCurrentTrackingId(trackingId)
        
        // Join Socket.IO room for this detection
        if (socketRef.current?.connected) {
          console.log('🎯 Joining detection room:', trackingId)
          socketRef.current.emit('join_detection', { tracking_id: trackingId })
        }
        
        setSuccessMessage('Video berhasil diupload! Deteksi dimulai...')
        
        // Refresh data
        await fetchDetections()
        
        return data.data
      } else {
        throw new Error(data.message || 'Upload response tidak valid')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(`Upload gagal: ${error.message}`)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const deleteDetection = async (id) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiRequest(API_ENDPOINTS.DETECTION_DELETE(id), {
        method: 'DELETE'
      })
      
      if (response.success) {
        setSuccessMessage('Data berhasil dihapus')
        await fetchDetections()
      } else {
        throw new Error(response.message || 'Gagal menghapus data')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setError(`Gagal menghapus: ${error.message}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
    // fetchDetections will be called automatically via useEffect
  }, [])

  // Update fetch when page changes
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
    fetchDetections,
    uploadVideo,
    deleteDetection,
    handlePageChange,
    setVideoPreview,
    setSelectedDetection,
    setError,
    setSuccessMessage,
    setUploadProgress
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

export function useDeteksi() {
  const context = useContext(DeteksiContext)
  if (context === null) {
    throw new Error('useDeteksi must be used within a DeteksiProvider')
  }
  return context
}