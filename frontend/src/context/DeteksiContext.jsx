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

  // Fetch detections - use ref to avoid dependency issues
  const fetchDetections = useCallback(async (page) => {
    // Don't fetch if no token (not logged in)
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }
    
    const pageToFetch = page ?? currentPageRef.current
    setLoading(true)
    try {
      const response = await apiRequest(`${API_ENDPOINTS.DETECTION_LIST}?page=${pageToFetch}&limit=${itemsPerPage}`)
      if (response.success) {
        setDetectionData(response.data.map((item, index) => ({
          id: index + 1 + (pageToFetch - 1) * itemsPerPage,
          ...item
        })))
        
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1)
          setTotalItems(response.pagination.total || 0)
        }
        
        const processing = new Set()
        response.data.forEach(item => {
          if (item.status === 'processing') {
            processing.add(item._id)
          }
        })
        setProcessingDetections(processing)
      }
    } catch (err) {
      console.error('Failed to fetch detections:', err)
      setError('Gagal memuat data deteksi')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for currentPage

  // Setup Socket.IO connection - only once
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected (Global):', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected (Global)')
    })

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message)
    })

    // Global listener for detection status changes
    socket.on('detection-status-changed', (data) => {
      console.log('🎉 Global detection status changed:', data)
      
      if (data.stage === 'completed') {
        fetchDetections()
        
        setSuccessMessage(`Deteksi selesai! Total kendaraan: ${data.countingData?.totalCounted || data.totalVehicles || 0}`)
        setTimeout(() => setSuccessMessage(''), 5000)
        
        // Update UI if this is our current tracking
        setCurrentTrackingId(prevTrackingId => {
          if (prevTrackingId && data.trackingId === prevTrackingId.toString()) {
            setUploading(false)
            setRealTimeProgress(null)
            setUploadProgress('')
            
            if (data.outputVideoUrl) {
              setVideoPreview(data.outputVideoUrl)
              setSelectedDetection({
                _id: data.detectionId,
                cloudinaryVideoUrl: data.outputVideoUrl,
                totalVehicles: data.totalVehicles,
                accuracy: data.accuracy,
                processingTime: data.processingTime,
                countingData: data.countingData,
                isProcessing: false
              })
            }
            return null
          }
          return prevTrackingId
        })
      }
      
      if (data.stage === 'error') {
        fetchDetections()
        setCurrentTrackingId(prevTrackingId => {
          if (prevTrackingId && data.trackingId === prevTrackingId.toString()) {
            setUploading(false)
            setRealTimeProgress(null)
            setError(data.message)
            setUploadProgress('')
            return null
          }
          return prevTrackingId
        })
      }
    })

    socketRef.current = socket

    // Initial fetch
    fetchDetections()

    return () => {
      socket.disconnect()
    }
  }, [fetchDetections]) // fetchDetections is stable now

  // Refetch when page changes
  useEffect(() => {
    fetchDetections(currentPage)
  }, [currentPage, fetchDetections])

  // Listen for real-time progress updates
  useEffect(() => {
    if (!socketRef.current || !currentTrackingId) return

    const eventName = `detection-progress-${currentTrackingId}`
    
    const handleProgress = (data) => {
      console.log('📊 Progress update:', data)
      setRealTimeProgress(data)
      setUploadProgress(data.message)

      setSelectedDetection(prev => ({
        ...prev,
        isProcessing: true,
        progress: data.progress,
        frameProgress: data.frameProgress
      }))
    }

    socketRef.current.on(eventName, handleProgress)

    return () => {
      socketRef.current?.off(eventName, handleProgress)
    }
  }, [currentTrackingId])

  // Handle delete detection
  const handleDeleteDetection = async (detectionId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus deteksi ini? Data tidak dapat dikembalikan.')) {
      return
    }

    try {
      await apiRequest(API_ENDPOINTS.DELETE_DETECTION(detectionId), {
        method: 'DELETE'
      })

      setDetectionData(prev => prev.filter(item => item._id !== detectionId))
      setTotalItems(prev => prev - 1)
      
      if (selectedDetection?._id === detectionId) {
        setSelectedDetection(null)
        setVideoPreview(null)
      }

      setError('')
      setSuccessMessage('Deteksi berhasil dihapus!')
      setTimeout(() => setSuccessMessage(''), 5000)

    } catch (err) {
      console.error('Failed to delete detection:', err)
      setError(`Gagal menghapus deteksi: ${err.message}`)
      setSuccessMessage('')
    }
  }

  // Handle view result
  const handleViewResult = (detection) => {
    console.log('🎯 Viewing detection result:', detection)
    setSelectedDetection({
      ...detection,
      isProcessing: false,
      isInputVideo: false
    })
    const videoUrl = detection.cloudinaryVideoUrl || detection.outputVideoPath || API_ENDPOINTS.DETECTION_VIDEO(detection._id)
    console.log('🎬 Playing output video URL:', videoUrl)
    setVideoPreview(videoUrl)
  }

  // Handle view input video
  const handleViewInputVideo = (detection) => {
    console.log('📹 Viewing input video:', detection)
    setSelectedDetection({ ...detection, isInputVideo: true, isProcessing: false })
    const videoUrl = detection.inputCloudinaryUrl || API_ENDPOINTS.DETECTION_VIDEO(detection._id)
    console.log('🎬 Playing input video URL:', videoUrl)
    setVideoPreview(videoUrl)
  }

  const value = {
    // State
    detectionData,
    setDetectionData,
    videoPreview,
    setVideoPreview,
    selectedDetection,
    setSelectedDetection,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    totalItems,
    setTotalItems,
    loading,
    setLoading,
    uploading,
    setUploading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    uploadProgress,
    setUploadProgress,
    processingDetections,
    setProcessingDetections,
    realTimeProgress,
    setRealTimeProgress,
    currentTrackingId,
    setCurrentTrackingId,
    itemsPerPage,
    
    // Refs
    socketRef,
    
    // Methods
    fetchDetections,
    handleDeleteDetection,
    handleViewResult,
    handleViewInputVideo,
  }

  return (
    <DeteksiContext.Provider value={value}>
      {children}
    </DeteksiContext.Provider>
  )
}

DeteksiProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useDeteksi() {
  const context = useContext(DeteksiContext)
  if (!context) {
    throw new Error('useDeteksi must be used within a DeteksiProvider')
  }
  return context
}
