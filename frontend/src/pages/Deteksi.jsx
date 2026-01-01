import { useEffect } from 'react'
import PropTypes from 'prop-types'
import Card from '../components/UI/Card'
import Table from '../components/UI/Table'
import { API_ENDPOINTS } from '../config/api'
import { useDeteksi } from '../context/DeteksiContext'

// Use inline SVG icons instead of Figma assets to prevent cookie warnings
const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,15 12,12 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconPlay = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="5,3 19,12 5,21" fill="currentColor"/>
  </svg>
)

const IconCsv = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Deteksi({ onLogout }) {
  const {
    detectionData,
    videoPreview,
    setVideoPreview,
    selectedDetection,
    setSelectedDetection,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    uploading,
    setUploading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    uploadProgress,
    setUploadProgress,
    realTimeProgress,
    setRealTimeProgress,
    setCurrentTrackingId,
    itemsPerPage,
    fetchDetections,
    handleDeleteDetection,
    handleViewResult,
  } = useDeteksi()

  const columns = [
    { key: 'id', label: 'No' },
    { key: 'videoFileName', label: 'Nama Video' },
    { key: 'createdAt', label: 'Waktu Upload', render: (date) => new Date(date).toLocaleString('id-ID') },
    { key: 'countingData', label: 'Kendaraan Melintas', render: (data, row) => {
      if (row.status !== 'completed') return '-'
      const total = data?.totalCounted || 0
      return (
        <span className="font-bold text-green-600">{total}</span>
      )
    }},
    { key: 'processingTime', label: 'Waktu Proses', render: (time) => time ? `${time}s` : '-' },
    { key: 'accuracy', label: 'Akurasi', render: (acc) => acc ? `${parseFloat(acc).toFixed(1)}%` : '-' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => {
        const statusConfig = {
          'processing': { color: 'yellow', text: 'Processing' },
          'completed': { color: 'green', text: 'Completed' },
          'failed': { color: 'red', text: 'Failed' }
        }
        const config = statusConfig[status] || { color: 'gray', text: status }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex w-fit items-center gap-1`}
            style={{
              backgroundColor: config.color === 'green' ? '#dcfce7' : config.color === 'yellow' ? '#fef9c3' : config.color === 'red' ? '#fee2e2' : '#f3f4f6',
              color: config.color === 'green' ? '#166534' : config.color === 'yellow' ? '#854d0e' : config.color === 'red' ? '#991b1b' : '#374151'
            }}
          >
            <span className={`w-2 h-2 rounded-full`}
              style={{
                backgroundColor: config.color === 'green' ? '#16a34a' : config.color === 'yellow' ? '#ca8a04' : config.color === 'red' ? '#dc2626' : '#6b7280'
              }}
            ></span>
            {config.text}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="flex gap-2 flex-wrap">
          {/* Tombol lihat hasil YOLO (video dengan bounding box) */}
          {row.status === 'completed' && row.cloudinaryVideoUrl && (
            <button
              onClick={() => handleViewResult(row)}
              className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors"
              title="Lihat video hasil deteksi YOLO"
            >
              🎯 Lihat Hasil
            </button>
          )}
          {/* Saat processing */}
          {row.status === 'processing' && (
            <span className="text-yellow-600 text-xs font-medium flex items-center gap-1">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses...
            </span>
          )}
          {(row.status === 'completed' || row.status === 'failed') && (
            <button
              onClick={() => handleDeleteDetection(row._id)}
              className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors"
            >
              Hapus
            </button>
          )}
        </div>
      )
    }
  ]

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // File validation
    const maxSize = 5 * 1024 * 1024 * 1024 // 5GB
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska']
    
    if (file.size > maxSize) {
      setError('File terlalu besar. Maksimum 5GB.')
      return
    }

    // Check file extension if MIME type is not recognized
    const fileExt = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['mp4', 'avi', 'mov', 'mkv']
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
      setError('Format file tidak didukung. Gunakan MP4, AVI, MOV, atau MKV.')
      return
    }

    setUploading(true)
    setError('')
    setSuccessMessage('')
    setUploadProgress('Menyiapkan upload...')
    setRealTimeProgress({ stage: 'preparing', progress: 0, message: 'Menyiapkan upload...' })
    // Clear previous preview
    setVideoPreview(null)
    setSelectedDetection({ isProcessing: true, progress: 0 })

    try {
      // Upload to backend
      const formData = new FormData()
      formData.append('video', file)

      setUploadProgress('Mengirim video ke server...')

      const response = await fetch(API_ENDPOINTS.UPLOAD_VIDEO, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(text || 'Server error - response bukan JSON')
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed')
      }

      if (result.success || result.status === 'success') {
        // Get tracking ID and start listening for progress
        const trackingId = result.data.trackingId
        setCurrentTrackingId(trackingId)
        setUploadProgress('Video dikirim! Memulai proses deteksi...')
        
        // Socket will handle the rest via real-time updates
        console.log('🎯 Tracking detection:', trackingId)
      }

    } catch (err) {
      setError(err.message || 'Gagal mengupload video')
      setUploading(false)
      setRealTimeProgress(null)
      setSelectedDetection(null)
      console.error('Upload error:', err)
    }
  }

  // Refetch when page changes
  useEffect(() => {
    fetchDetections(currentPage)
  }, [currentPage, fetchDetections])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <p className="text-green-600 font-medium text-sm sm:text-base">{successMessage}</p>
        </div>
      )}

      {/* Real-time Progress Bar */}
      {realTimeProgress && (
        <Card className="!p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {realTimeProgress.stage !== 'completed' && realTimeProgress.stage !== 'error' && (
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span className="font-semibold text-blue-800">
                  {realTimeProgress.stage === 'uploading' && '📤 Uploading ke Cloud...'}
                  {realTimeProgress.stage === 'uploaded' && '✅ Upload selesai!'}
                  {realTimeProgress.stage === 'processing' && '🎯 Deteksi YOLO...'}
                  {realTimeProgress.stage === 'uploading_result' && '📤 Upload hasil...'}
                  {realTimeProgress.stage === 'saving' && '💾 Menyimpan...'}
                  {realTimeProgress.stage === 'completed' && '✅ Selesai!'}
                  {realTimeProgress.stage === 'error' && '❌ Error'}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600">{realTimeProgress.progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  realTimeProgress.stage === 'error' ? 'bg-red-500' :
                  realTimeProgress.stage === 'completed' ? 'bg-green-500' :
                  'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${realTimeProgress.progress}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-600">{realTimeProgress.message}</p>
            
            {/* Enhanced Progress Info */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              {realTimeProgress.frameProgress !== undefined && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  🎬 Frame: {realTimeProgress.frameProgress}%
                </span>
              )}
              {realTimeProgress.fps && (
                <span className="bg-green-100 px-2 py-1 rounded">
                  ⚡ {realTimeProgress.fps} fps
                </span>
              )}
              {realTimeProgress.eta && (
                <span className="bg-orange-100 px-2 py-1 rounded">
                  ⏱️ ETA: {realTimeProgress.eta}
                </span>
              )}
              {realTimeProgress.countingData && (
                <span className="bg-purple-100 px-2 py-1 rounded">
                  🚗 Total: {realTimeProgress.countingData.total} (Kiri: {realTimeProgress.countingData.kiri}, Kanan: {realTimeProgress.countingData.kanan})
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Upload Button - Centered */}
      <div className="flex justify-center">
        <label className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="file"
            accept="video/mp4,video/avi,video/mov,video/mkv"
            onChange={handleVideoUpload}
            className="hidden"
            disabled={uploading}
          />
          <div
            className={`${uploading ? 'bg-gray-400' : 'bg-blue-600'} text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm sm:text-base`}
            style={{ display: 'inline-flex' }}
            onMouseEnter={(e) => !uploading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => !uploading && (e.currentTarget.style.backgroundColor = uploading ? '#9ca3af' : '#2563eb')}
          >
            {uploading ? (
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <div className="w-4 h-4 sm:w-5 sm:h-5 text-white">
                <IconUpload />
              </div>
            )}
            {uploading ? 'MEMPROSES...' : 'UPLOAD VIDEO'}
          </div>
        </label>
      </div>

      {/* Video Player Box */}
      <Card className="!p-0">
        <div className="p-3 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {selectedDetection 
                ? (selectedDetection.isProcessing 
                    ? '🔄 Video Sedang Diproses...' 
                    : '🎯 Hasil Deteksi YOLO')
                : 'Video Player Preview'}
            </h3>
            {selectedDetection && !selectedDetection.isProcessing && selectedDetection.videoFileName && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-none">File: {selectedDetection.videoFileName}</p>
            )}
          </div>
          {selectedDetection && !selectedDetection.isProcessing && (
            <button
              onClick={() => { setSelectedDetection(null); setVideoPreview(null); }}
              className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 border rounded hover:bg-gray-100"
            >
              ✕ Tutup
            </button>
          )}
        </div>
        <div className="p-3 sm:p-6 bg-gray-50">
          {/* Processing state - show progress spinner */}
          {selectedDetection?.isProcessing ? (
            <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center px-4">
                <svg className="animate-spin h-10 w-10 sm:h-16 sm:w-16 text-blue-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-white text-base sm:text-xl font-semibold mb-2">🔄 Memproses Video dengan YOLO...</p>
                <p className="text-gray-400 text-sm mb-4">Mohon tunggu, video sedang dideteksi</p>
                {selectedDetection.progress !== undefined && (
                  <div className="w-56 sm:w-72 mx-auto">
                    <div className="bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${selectedDetection.progress}%` }}
                      />
                    </div>
                    <p className="text-blue-400 text-base sm:text-lg font-bold mt-3">{selectedDetection.progress}%</p>
                    {selectedDetection.frameProgress && (
                      <p className="text-gray-500 text-xs sm:text-sm">Frame: {selectedDetection.frameProgress}%</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : videoPreview && selectedDetection ? (
            <div className="space-y-4">
              <div className="relative">
                {/* Label video - hijau untuk hasil YOLO */}
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium z-10">
                  🎯 Video Hasil Deteksi YOLO
                </div>
                <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    src={videoPreview}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              {!selectedDetection.isProcessing && selectedDetection.countingData && (
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        📊 Data Counting Line
                        <span className="text-xs font-normal text-gray-500">
                          (Posisi garis: Y = {selectedDetection.countingData.linePosition}px)
                        </span>
                      </h4>
                      
                      {/* Total Counted */}
                      <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
                        <p className="text-sm text-gray-500">Total Kendaraan Melintas</p>
                        <p className="text-3xl font-bold text-green-600">{selectedDetection.countingData.totalCounted || 0}</p>
                      </div>

                      {/* Lane Statistics */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Lajur Kiri */}
                        <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-purple-500">
                          <p className="font-semibold text-purple-700 mb-2">🚗 Lajur KIRI</p>
                          <p className="text-2xl font-bold text-gray-800 mb-2">
                            {selectedDetection.countingData.laneKiri?.total || 0} <span className="text-sm font-normal text-gray-500">kendaraan</span>
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-blue-600">{selectedDetection.countingData.laneKiri?.mobil || 0}</p>
                              <p className="text-xs text-gray-500">Mobil</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-orange-600">{selectedDetection.countingData.laneKiri?.bus || 0}</p>
                              <p className="text-xs text-gray-500">Bus</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-red-600">{selectedDetection.countingData.laneKiri?.truk || 0}</p>
                              <p className="text-xs text-gray-500">Truk</p>
                            </div>
                          </div>
                        </div>

                        {/* Lajur Kanan */}
                        <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-pink-500">
                          <p className="font-semibold text-pink-700 mb-2">🚗 Lajur KANAN</p>
                          <p className="text-2xl font-bold text-gray-800 mb-2">
                            {selectedDetection.countingData.laneKanan?.total || 0} <span className="text-sm font-normal text-gray-500">kendaraan</span>
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-blue-600">{selectedDetection.countingData.laneKanan?.mobil || 0}</p>
                              <p className="text-xs text-gray-500">Mobil</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-orange-600">{selectedDetection.countingData.laneKanan?.bus || 0}</p>
                              <p className="text-xs text-gray-500">Bus</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="font-bold text-red-600">{selectedDetection.countingData.laneKanan?.truk || 0}</p>
                              <p className="text-xs text-gray-500">Truk</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="mx-auto mb-4 text-gray-400">
                  <IconPlay />
                </div>
                <p className="text-lg mb-2">Belum ada video hasil deteksi</p>
                <p className="text-sm">Upload video baru atau klik <span className="text-blue-400 font-medium">"Lihat Hasil"</span> pada tabel di bawah</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      <Card className="!p-0">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Tabel Grafik</h3>
          <button
            onClick={() => {
              if (detectionData.length === 0) {
                setError('Tidak ada data untuk di-export')
                return
              }
              // Create CSV content
              const headers = ['No', 'Nama Video', 'Waktu Upload', 'Durasi Proses', 'Kendaraan Melintas', 'Lajur Kiri', 'Lajur Kanan', 'Mobil', 'Bus', 'Truk', 'Akurasi', 'Status']
              const rows = detectionData.map((item, idx) => [
                idx + 1,
                item.videoFileName || '-',
                new Date(item.createdAt).toLocaleString('id-ID'),
                item.processingTime ? `${item.processingTime}s` : '-',
                item.countingData?.totalCounted || 0,
                item.countingData?.laneKiri?.total || 0,
                item.countingData?.laneKanan?.total || 0,
                (item.countingData?.laneKiri?.mobil || 0) + (item.countingData?.laneKanan?.mobil || 0),
                (item.countingData?.laneKiri?.bus || 0) + (item.countingData?.laneKanan?.bus || 0),
                (item.countingData?.laneKiri?.truk || 0) + (item.countingData?.laneKanan?.truk || 0),
                item.accuracy ? `${parseFloat(item.accuracy).toFixed(1)}%` : '-',
                item.status
              ])
              const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `deteksi_yolo_${new Date().toISOString().split('T')[0]}.csv`
              link.click()
              URL.revokeObjectURL(url)
              setSuccessMessage('Data berhasil di-export ke CSV!')
              setTimeout(() => setSuccessMessage(''), 3000)
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 hover:bg-green-600"
          >
            <div className="w-[18px] h-[18px] text-white">
              <IconCsv />
            </div>
            Export CSV
          </button>
        </div>
        <div className="p-6">
          {detectionData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Belum ada data deteksi</p>
              <p className="text-sm">Upload video untuk melihat hasil deteksi YOLO</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={detectionData} />

              {/* Pagination */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Menampilkan {detectionData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ◀
                  </button>
                  <div className="flex items-center px-3 py-1.5 border border-blue-600 rounded-lg bg-blue-600 text-white">
                    {currentPage}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

Deteksi.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
