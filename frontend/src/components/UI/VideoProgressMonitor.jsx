import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useDeteksi } from '../../context/DeteksiContext'

export default function VideoProgressMonitor({ isOpen, onClose }) {
  const { processingDetections, realTimeProgress, currentTrackingId } = useDeteksi()
  const [processingList, setProcessingList] = useState([])

  useEffect(() => {
    // Convert Set to Array for display
    setProcessingList(Array.from(processingDetections))
  }, [processingDetections])

  if (!isOpen) return null

  const getProgressPercentage = () => {
    if (!realTimeProgress) return 0
    if (realTimeProgress.totalFrames && realTimeProgress.processedFrames) {
      return Math.round((realTimeProgress.processedFrames / realTimeProgress.totalFrames) * 100)
    }
    return 0
  }

  const getStatusText = () => {
    if (!realTimeProgress) return 'Menunggu...'
    
    switch (realTimeProgress.stage) {
      case 'initializing':
        return '🔄 Memulai deteksi...'
      case 'processing':
        return `📹 Memproses frame ${realTimeProgress.processedFrames || 0}/${realTimeProgress.totalFrames || 0}`
      case 'saving':
        return '💾 Menyimpan hasil...'
      case 'completed':
        return '✅ Selesai!'
      case 'error':
        return `❌ Error: ${realTimeProgress.message || 'Unknown error'}`
      default:
        return 'Processing...'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monitor Proses Video</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {processingList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>📹 Tidak ada video yang sedang diproses</p>
            <p className="text-sm mt-2">Upload video untuk melihat progress di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processingList.map((trackingId) => (
              <div key={trackingId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    ID: {trackingId.substring(0, 8)}...
                  </span>
                  <span className="text-xs text-gray-500">
                    {trackingId === currentTrackingId ? 'Aktif' : 'Menunggu'}
                  </span>
                </div>

                {trackingId === currentTrackingId && realTimeProgress && (
                  <div>
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{getStatusText()}</span>
                        <span className="text-sm font-bold text-blue-600">
                          {getProgressPercentage()}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage()}%` }}
                        />
                      </div>
                    </div>

                    {realTimeProgress.stage === 'processing' && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>⏱️ Waktu berlalu: {Math.round((Date.now() - new Date(realTimeProgress.startTime)) / 1000)}s</p>
                        {realTimeProgress.vehicleCounts && (
                          <p>🚗 Kendaraan terdeteksi: {realTimeProgress.vehicleCounts.total || 0}</p>
                        )}
                      </div>
                    )}

                    {realTimeProgress.stage === 'error' && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700">
                          ❌ {realTimeProgress.message || realTimeProgress.error}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {trackingId !== currentTrackingId && (
                  <div className="text-sm text-gray-500">
                    ⏳ Menunggu giliran untuk diproses...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

VideoProgressMonitor.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}