/**
 * Deteksi Context - REST API Based (No WebSocket)
 * Simple polling for video detection progress
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { API_ENDPOINTS, apiRequest } from '../config/api'

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
  const [processingStatus, setProcessingStatus] = useState(null)
  const [currentTrackingId, setCurrentTrackingId] = useState(null)
  
  const pollingRef = useRef(null)
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const fetchDetections = useCallback(async () => {
    if (loading) return
    
    try {
      setLoading(true)
      setError('')
      
      const response = await apiRequest(API_ENDPOINTS.DETECTION_LIST + '?page=' + currentPageRef.current + '&limit=' + itemsPerPage)
      
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
    } catch (err) {
      console.error('Error fetching detections:', err)
      setError('Gagal memuat data deteksi: ' + err.message)
      setDetectionData([])
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Poll for detection status
  const pollStatus = useCallback(async (trackingId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DETECTION_STATUS(trackingId))
      
      if (response.success && response.data) {
        const status = response.data
        setProcessingStatus(status)
        
        console.log('📊 Processing status: ' + status.status + ' - ' + status.progress + '%')
        
        // Update progress message
        setUploadProgress(status.message || 'Processing: ' + status.progress + '%')
        
        // Check if completed or error
        if (status.status === 'completed') {
          console.log('✅ Detection completed!')
          setSuccessMessage('Deteksi video selesai!')
          setUploading(false)
          setCurrentTrackingId(null)
          setProcessingStatus(null)
          
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          
          // Refresh detection list
          fetchDetections()
          return true
        }
        
        if (status.status === 'error') {
          console.error('❌ Detection error:', status.message)
          setError(status.message || 'Gagal memproses video')
          setUploading(false)
          setCurrentTrackingId(null)
          setProcessingStatus(null)
          
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          return false
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
    return null
  }, [fetchDetections])

  // Start polling for a tracking ID
  const startPolling = useCallback((trackingId) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    setCurrentTrackingId(trackingId)
    
    // Poll immediately, then every 2 seconds
    pollStatus(trackingId)
    
    pollingRef.current = setInterval(() => {
      pollStatus(trackingId)
    }, 2000)
    
    console.log('🔄 Started polling for ' + trackingId)
  }, [pollStatus])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setCurrentTrackingId(null)
    setProcessingStatus(null)
    console.log('⏹️ Stopped polling')
  }, [])

  // Upload video
  const uploadVideo = useCallback(async (file) => {
    if (!file) {
      setError('Pilih file video terlebih dahulu')
      return
    }

    try {
      setUploading(true)
      setError('')
      setUploadProgress('Mengunggah video...')
      
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('📤 Uploading video: ' + file.name)
      
      const token = localStorage.getItem('token')
      const response = await fetch(API_ENDPOINTS.UPLOAD_VIDEO, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail?.message || result.message || 'Upload gagal')
      }
      
      if (result.success && result.data?.tracking_id) {
        console.log('✅ Upload successful, tracking: ' + result.data.tracking_id)
        setUploadProgress('Video diunggah, memulai deteksi...')
        
        startPolling(result.data.tracking_id)
        
        return result.data
      } else {
        throw new Error(result.message || 'Upload gagal')
      }
      
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Gagal mengunggah video')
      setUploading(false)
      setUploadProgress('')
      throw err
    }
  }, [startPolling])

  // Handle file selection
  const handleVideoSelect = useCallback((file) => {
    if (!file) return

    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm']
    if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)) {
        setError('Format file tidak didukung. Gunakan MP4, AVI, MOV, MKV, atau WebM.')
        return
      }
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File terlalu besar. Maksimal 50MB.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setVideoPreview({
      file,
      url: previewUrl,
      name: file.name,
      size: file.size
    })

    console.log('📁 Video selected: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + 'MB)')
  }, [])

  // Clear video preview
  const clearVideoPreview = useCallback(() => {
    if (videoPreview?.url) {
      URL.revokeObjectURL(videoPreview.url)
    }
    setVideoPreview(null)
  }, [videoPreview])

  // Delete detection
  const deleteDetection = useCallback(async (detectionId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DELETE_DETECTION(detectionId), {
        method: 'DELETE'
      })
      
      if (response.success) {
        setSuccessMessage('Deteksi berhasil dihapus')
        fetchDetections()
      } else {
        throw new Error(response.message || 'Gagal menghapus')
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus deteksi')
    }
  }, [fetchDetections])

  // Context value
  const value = {
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
    processingStatus,
    currentTrackingId,
    
    setCurrentPage,
    setSelectedDetection,
    setError,
    setSuccessMessage,
    fetchDetections,
    uploadVideo,
    handleVideoSelect,
    clearVideoPreview,
    deleteDetection,
    startPolling,
    stopPolling,
  }

  return (
    <DeteksiContext.Provider value={value}>
      {children}
    </DeteksiContext.Provider>
  )
}

DeteksiProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useDeteksi() {
  const context = useContext(DeteksiContext)
  if (!context) {
    throw new Error('useDeteksi must be used within a DeteksiProvider')
  }
  return context
}
