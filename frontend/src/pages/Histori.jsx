import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import Card from '../components/UI/Card'
import Table from '../components/UI/Table'
import { API_ENDPOINTS, apiRequest } from '../config/api'

// LOS colors
const losColors = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
  F: '#dc2626'
}

export default function Histori({ onLogout }) {
  const navigate = useNavigate()
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchHistory()
  }, [currentPage])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiRequest(`${API_ENDPOINTS.HISTORY_LIST}?page=${currentPage}&limit=${itemsPerPage}`)
      
      if (response.status === 'success') {
        setHistoryData(response.data || [])
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1)
          setTotalItems(response.pagination.total || 0)
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err.message || 'Gagal mengambil data histori')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return

    try {
      await apiRequest(`${API_ENDPOINTS.HISTORY_DETAIL(id).replace('/detail', '')}`, {
        method: 'DELETE'
      })
      setSuccessMessage('Data berhasil dihapus')
      fetchHistory()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Gagal menghapus data')
    }
  }

  const columns = [
    { key: 'id', label: 'No' },
    { 
      key: 'date', 
      label: 'Tanggal',
      render: (date) => new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    { key: 'namaRuas', label: 'Nama Ruas Jalan' },
    { key: 'tipeJalan', label: 'Tipe Jalan' },
    { 
      key: 'volume', 
      label: 'Volume (smp/jam)',
      render: (vol) => vol?.toLocaleString() || '-'
    },
    { 
      key: 'kapasitas', 
      label: 'Kapasitas',
      render: (kap) => kap?.toLocaleString() || '-'
    },
    { 
      key: 'dj', 
      label: 'DJ',
      render: (dj) => dj ? parseFloat(dj).toFixed(3) : '-'
    },
    {
      key: 'los',
      label: 'LOS',
      render: (los) => (
        <span 
          className="px-3 py-1 rounded-full font-bold text-white text-xs"
          style={{ backgroundColor: losColors[los] || '#6b7280' }}
        >
          {los || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/histori/${row._id}`)}
            className="text-blue-600 hover:text-blue-800 font-semibold text-sm px-2 py-1 bg-blue-50 rounded"
            title="Lihat Detail"
          >
            👁️ Detail
          </button>
          <button 
            onClick={() => handleDelete(row._id)}
            className="text-red-600 hover:text-red-800 font-semibold text-sm px-2 py-1 bg-red-50 rounded"
            title="Hapus"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data histori...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <span>ℹ️</span>
        <p className="text-sm text-blue-900">Histori tersimpan otomatis setiap kali Anda melakukan perhitungan kinerja ruas jalan.</p>
      </div>

      {/* History Table */}
      <Card className="!p-0">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📋 Riwayat Perhitungan</h3>
            <p className="text-sm text-gray-500 mt-1">Total: {totalItems} data</p>
          </div>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="p-6">
          {historyData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg font-medium">Belum ada riwayat perhitungan</p>
              <p className="text-sm mt-2">Lakukan perhitungan kinerja ruas jalan di halaman <span className="text-blue-600 font-medium">Perhitungan</span> untuk melihat histori di sini</p>
              <button
                onClick={() => navigate('/perhitungan')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mulai Perhitungan
              </button>
            </div>
          ) : (
            <>
              <Table columns={columns} data={historyData} />

              {/* Pagination */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Menampilkan {historyData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
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

Histori.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
