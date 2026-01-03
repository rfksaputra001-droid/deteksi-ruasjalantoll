import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Card from '../components/UI/Card'
import Table from '../components/UI/Table'
import { API_ENDPOINTS, apiRequest } from '../config/api'

// Icons
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,15 12,12 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconCalculate = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="10" x2="10" y2="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="14" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="2"/>
    <line x1="14" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const IconPdf = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const losColors = {
  'A': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500' },
  'B': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  'C': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  'D': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  'E': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  'F': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
}

export default function Perhitungan({ onLogout }) {
  const [mode, setMode] = useState('manual') // 'manual' or 'deteksi'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showResults, setShowResults] = useState(false)
  
  // Referensi PKJI
  const [referensi, setReferensi] = useState(null)
  
  // Deteksi available
  const [deteksiList, setDeteksiList] = useState([])
  const [selectedDeteksi, setSelectedDeteksi] = useState(null)
  
  // Perhitungan history
  const [perhitunganHistory, setPerhitunganHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)

  // Form data
  const [formData, setFormData] = useState({
    namaRuas: '',
    tipeJalan: '4/2 D',
    jumlahLajur: 2,
    lebarLajur: 3.5,
    faktorPemisah: '50-50',
    hambatanSamping: 'rendah',
    ukuranKota: 'besar',
    // Data kendaraan (untuk manual)
    mobil: 0,
    bus: 0,
    truk: 0,
    motor: 0,
    durasiMenit: 60,
    waktuObservasi: ''
  })

  // Hasil perhitungan
  const [results, setResults] = useState(null)

  // Load referensi PKJI on mount
  useEffect(() => {
    loadReferensi()
    loadPerhitunganHistory()
  }, [])

  // Load deteksi when mode changes to 'deteksi'
  useEffect(() => {
    if (mode === 'deteksi') {
      loadDeteksiAvailable()
    }
  }, [mode])

  const loadReferensi = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_REFERENSI)
      if (response.success) {
        setReferensi(response.data)
      }
    } catch (err) {
      console.error('Failed to load referensi:', err)
    }
  }

  const loadDeteksiAvailable = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_DETEKSI_AVAILABLE)
      if (response.success) {
        setDeteksiList(response.data)
      }
    } catch (err) {
      console.error('Failed to load deteksi:', err)
      setError('Gagal memuat daftar deteksi')
    }
  }

  const loadPerhitunganHistory = async () => {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.PERHITUNGAN_LIST}?page=${historyPage}&limit=5`)
      if (response.success) {
        setPerhitunganHistory(response.data)
        setHistoryTotal(response.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n')
        
        // Simple CSV parsing (expecting header + data row)
        if (lines.length >= 2) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          const values = lines[1].split(',').map(v => v.trim())
          
          const csvData = {}
          headers.forEach((h, i) => {
            csvData[h] = values[i]
          })
          
          // Map CSV fields to form
          setFormData(prev => ({
            ...prev,
            namaRuas: csvData['nama_ruas'] || csvData['namaruas'] || prev.namaRuas,
            tipeJalan: csvData['tipe_jalan'] || csvData['tipejalan'] || prev.tipeJalan,
            lebarLajur: parseFloat(csvData['lebar_lajur'] || csvData['lebarlajur']) || prev.lebarLajur,
            mobil: parseInt(csvData['mobil']) || 0,
            bus: parseInt(csvData['bus']) || 0,
            truk: parseInt(csvData['truk']) || 0,
            motor: parseInt(csvData['motor']) || 0,
            durasiMenit: parseInt(csvData['durasi']) || 60,
            waktuObservasi: csvData['waktu'] || ''
          }))
          
          setSuccess('Data CSV berhasil dimuat!')
          setTimeout(() => setSuccess(''), 3000)
        }
      } catch (err) {
        setError('Gagal membaca file CSV')
      }
    }
    reader.readAsText(file)
  }

  const handleCalculateManual = async () => {
    if (!formData.namaRuas) {
      setError('Nama ruas jalan wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_MANUAL, {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (response.success) {
        setResults(response.data)
        setShowResults(true)
        setSuccess('Perhitungan berhasil!')
        loadPerhitunganHistory() // Refresh history
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan perhitungan')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateFromDeteksi = async () => {
    if (!selectedDeteksi) {
      setError('Pilih hasil deteksi terlebih dahulu')
      return
    }
    if (!formData.namaRuas) {
      setError('Nama ruas jalan wajib diisi')
      return
    }
    if (!formData.waktuObservasi) {
      setError('Waktu observasi wajib diisi')
      return
    }
    
    // Validasi format waktu observasi
    const timeRangePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRangePattern.test(formData.waktuObservasi)) {
      setError('Format waktu observasi tidak valid. Gunakan format HH:MM-HH:MM (contoh: 07:00-08:00)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_SEDERHANA(selectedDeteksi._id), {
        method: 'POST',
        body: JSON.stringify({
          namaRuas: formData.namaRuas,
          waktuObservasi: formData.waktuObservasi
        })
      })

      if (response.success) {
        setResults(response.data)
        setShowResults(true)
        setSuccess('Perhitungan dari deteksi berhasil!')
        loadPerhitunganHistory()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan perhitungan')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePerhitungan = async (id) => {
    if (!window.confirm('Hapus perhitungan ini?')) return

    try {
      await apiRequest(API_ENDPOINTS.DELETE_PERHITUNGAN(id), { method: 'DELETE' })
      loadPerhitunganHistory()
      setSuccess('Perhitungan dihapus')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Gagal menghapus')
    }
  }

  const exportToPDF = () => {
    if (!results) return
    
    // Create printable content
    const printContent = `
      <html>
        <head>
          <title>Hasil Perhitungan Kinerja Ruas Jalan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e40af; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .result { font-size: 24px; font-weight: bold; color: #16a34a; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 8px; border: 1px solid #ddd; text-align: left; }
          </style>
        </head>
        <body>
          <h1>📊 Hasil Analisis Kinerja Ruas Jalan</h1>
          <p><strong>Nama Ruas:</strong> ${results.namaRuas || '-'}</p>
          <p><strong>Tipe Jalan:</strong> ${results.tipeJalan || '-'}</p>
          <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          
          <div class="section">
            <h2>Hasil Perhitungan</h2>
            <table>
              <tr><th>Parameter</th><th>Nilai</th></tr>
              <tr><td>Kapasitas Jalan (C)</td><td>${results.kapasitas?.kapasitas} smp/jam</td></tr>
              <tr><td>Volume Lalu Lintas (Q)</td><td>${results.volume?.volumeSMP} smp/jam</td></tr>
              <tr><td>Derajat Kejenuhan (DJ)</td><td>${results.DJ}</td></tr>
              <tr><td>Level of Service (LOS)</td><td class="result">${results.LOS}</td></tr>
              <tr><td>Kondisi</td><td>${results.losDescription}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Keterangan LOS ${results.LOS}</h2>
            <p>${results.losDescription}</p>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Dihitung berdasarkan PKJI 2023 (Pedoman Kapasitas Jalan Indonesia)
          </p>
        </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  const historyColumns = [
    { key: 'no', label: 'No' },
    { key: 'namaRuas', label: 'Nama Ruas', render: (_, row) => row.metrics?.namaRuas || '-' },
    { key: 'tipeJalan', label: 'Tipe Jalan', render: (_, row) => row.metrics?.tipeJalan || '-' },
    { key: 'DJ', label: 'DJ', render: (val) => val?.toFixed(2) || '-' },
    { 
      key: 'LOS', 
      label: 'LOS', 
      render: (val) => {
        const colors = losColors[val] || { bg: 'bg-gray-100', text: 'text-gray-800' }
        return <span className={`px-3 py-1 rounded-full font-bold ${colors.bg} ${colors.text}`}>{val}</span>
      }
    },
    { key: 'createdAt', label: 'Waktu', render: (val) => new Date(val).toLocaleString('id-ID') },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <button
          onClick={() => handleDeletePerhitungan(row._id)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Hapus
        </button>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <p className="text-green-600 font-medium text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Mode Selector */}
      <Card className="!p-3 sm:!p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={() => { setMode('manual'); setShowResults(false); setResults(null); }}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              mode === 'manual' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Input Manual / CSV
          </button>
          <button
            onClick={() => { setMode('deteksi'); setShowResults(false); setResults(null); }}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              mode === 'deteksi' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎯 Dari Hasil Deteksi YOLO
          </button>
        </div>
      </Card>

      {/* Main Form */}
      <Card className="!p-0">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {mode === 'manual' ? '📝 Perhitungan Manual' : '🎯 Perhitungan dari Deteksi'}
          </h3>
          {mode === 'manual' && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <div className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm sm:text-base">
                <IconUpload />
                Upload CSV
              </div>
            </label>
          )}
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left: Form Inputs */}
          <div className="space-y-4 sm:space-y-6">
            {/* Pilih Deteksi (jika mode deteksi) */}
            {mode === 'deteksi' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Pilih Hasil Deteksi</h4>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-h-60 overflow-y-auto space-y-2">
                  {deteksiList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">Belum ada hasil deteksi</p>
                  ) : (
                    deteksiList.map(d => (
                      <div
                        key={d._id}
                        onClick={() => setSelectedDeteksi(d)}
                        className={`p-3 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedDeteksi?._id === d._id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{d.videoFileName}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Total: {d.totalKendaraan} kendaraan | 
                          Mobil: {(d.laneKiri?.mobil || 0) + (d.laneKanan?.mobil || 0)} |
                          Bus: {(d.laneKiri?.bus || 0) + (d.laneKanan?.bus || 0)} |
                          Truk: {(d.laneKiri?.truk || 0) + (d.laneKanan?.truk || 0)}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString('id-ID')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Data Jalan */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Informasi Ruas Jalan</h4>
              <div className="space-y-3 sm:space-y-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-700 font-semibold mb-1">Nama Ruas Jalan *</label>
                  <input
                    type="text"
                    value={formData.namaRuas}
                    onChange={(e) => setFormData({ ...formData, namaRuas: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Contoh: Jl. MBZ, Tol Jakarta-Cikampek"
                  />
                </div>
                
                {mode === 'deteksi' ? (
                  // Parameter tetap untuk mode deteksi YOLO - disederhanakan
                  <>
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Waktu Observasi *</label>
                      <input
                        type="text"
                        value={formData.waktuObservasi}
                        onChange={(e) => setFormData({ ...formData, waktuObservasi: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Contoh: 07:00-08:00, 13:00-14:00, 17:00-18:00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: HH:MM-HH:MM (jam mulai - jam selesai observasi)</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '06:00-07:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          06:00-07:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '07:00-08:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          07:00-08:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '11:00-12:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          11:00-12:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '12:00-13:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          12:00-13:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '17:00-18:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          17:00-18:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, waktuObservasi: '18:00-19:00' })}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          18:00-19:00
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <span>📊</span> Parameter Tetap (Mode Deteksi YOLO)
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">Tipe Jalan:</span>
                        <span className="font-bold text-blue-900">4/2 D</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">Jumlah Lajur (n):</span>
                        <span className="font-bold text-blue-900">2</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">C₀ (Kapasitas Dasar):</span>
                        <span className="font-bold text-blue-900">2500 SMP/jam</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">FCle:</span>
                        <span className="font-bold text-blue-900">1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">Lebar Lajur:</span>
                        <span className="font-bold text-blue-900">3.5 m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">Kapasitas Total:</span>
                        <span className="font-bold text-green-600">5,000 SMP/jam</span>
                      </div>
                    </div>
                  </div>
                  </>
                ) : (
                  // Form lengkap untuk perhitungan manual
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Tipe Jalan</label>
                        <select
                          value={formData.tipeJalan}
                          onChange={(e) => setFormData({ ...formData, tipeJalan: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {referensi?.tipeJalan?.map(t => (
                            <option key={t} value={t}>{t}</option>
                          )) || (
                            <>
                              <option value="4/2 D">4/2 D (4 lajur 2 arah + median)</option>
                              <option value="4/2 UD">4/2 UD (4 lajur 2 arah tanpa median)</option>
                              <option value="2/2 UD">2/2 UD (2 lajur 2 arah)</option>
                              <option value="6/2 D">6/2 D (6 lajur 2 arah + median)</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Jumlah Lajur (per arah)</label>
                        <input
                          type="number"
                          value={formData.jumlahLajur}
                          onChange={(e) => setFormData({ ...formData, jumlahLajur: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          min="1"
                          max="4"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Lebar Lajur (m)</label>
                        <select
                          value={formData.lebarLajur}
                          onChange={(e) => setFormData({ ...formData, lebarLajur: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="2.75">2.75 m</option>
                          <option value="3.00">3.00 m</option>
                          <option value="3.25">3.25 m</option>
                          <option value="3.50">3.50 m</option>
                          <option value="3.75">3.75 m</option>
                          <option value="4.00">4.00 m</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Hambatan Samping</label>
                        <select
                          value={formData.hambatanSamping}
                          onChange={(e) => setFormData({ ...formData, hambatanSamping: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="sangat rendah">Sangat Rendah</option>
                          <option value="rendah">Rendah</option>
                          <option value="sedang">Sedang</option>
                          <option value="tinggi">Tinggi</option>
                          <option value="sangat tinggi">Sangat Tinggi</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Faktor Pemisah Arah</label>
                        <select
                          value={formData.faktorPemisah}
                          onChange={(e) => setFormData({ ...formData, faktorPemisah: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="50-50">50-50</option>
                          <option value="55-45">55-45</option>
                          <option value="60-40">60-40</option>
                          <option value="65-35">65-35</option>
                          <option value="70-30">70-30</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-semibold mb-1">Ukuran Kota</label>
                        <select
                          value={formData.ukuranKota}
                          onChange={(e) => setFormData({ ...formData, ukuranKota: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="kecil">Kecil (&lt; 0.1 juta)</option>
                          <option value="sedang">Sedang (0.1-0.5 juta)</option>
                          <option value="besar">Besar (0.5-1.0 juta)</option>
                          <option value="sangat besar">Sangat Besar (&gt; 1.0 juta)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Data Kendaraan (hanya untuk manual) */}
            {mode === 'manual' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Data Kendaraan</h4>
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Mobil</label>
                      <input
                        type="number"
                        value={formData.mobil}
                        onChange={(e) => setFormData({ ...formData, mobil: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Bus</label>
                      <input
                        type="number"
                        value={formData.bus}
                        onChange={(e) => setFormData({ ...formData, bus: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Truk</label>
                      <input
                        type="number"
                        value={formData.truk}
                        onChange={(e) => setFormData({ ...formData, truk: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Motor</label>
                      <input
                        type="number"
                        value={formData.motor}
                        onChange={(e) => setFormData({ ...formData, motor: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Durasi Observasi (menit)</label>
                      <input
                        type="number"
                        value={formData.durasiMenit}
                        onChange={(e) => setFormData({ ...formData, durasiMenit: parseInt(e.target.value) || 60 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-semibold mb-1">Waktu Observasi</label>
                      <input
                        type="text"
                        value={formData.waktuObservasi}
                        onChange={(e) => setFormData({ ...formData, waktuObservasi: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="08:00-09:00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Formula & Results */}
          <div className="space-y-6">
            {/* Rumus - berbeda untuk mode manual dan deteksi */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                {mode === 'deteksi' ? 'Rumus Perhitungan (Sederhana)' : 'Rumus Perhitungan (PKJI 2023)'}
              </h4>
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                {mode === 'deteksi' ? (
                  // Rumus sederhana untuk mode deteksi
                  <>
                    <div className="text-center">
                      <p className="text-xl font-mono text-blue-900 font-bold">C = n × C₀ × FCle</p>
                      <p className="text-sm text-gray-600 mt-1">Kapasitas Jalan</p>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="text-center">
                      <p className="text-xl font-mono text-blue-900 font-bold">DJ = Q / C</p>
                      <p className="text-sm text-gray-600 mt-1">Derajat Kejenuhan</p>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="text-center">
                      <p className="text-xl font-mono text-blue-900 font-bold">Q = Σ(N<sub>i</sub> × EMP<sub>i</sub>) × (60/t)</p>
                      <p className="text-sm text-gray-600 mt-1">Volume dalam SMP/jam</p>
                    </div>
                  </>
                ) : (
                  // Rumus lengkap PKJI untuk mode manual
                  <>
                    <div className="text-center">
                      <p className="text-lg font-mono text-blue-900 font-bold">C = n × C₀ × FC<sub>w</sub> × FC<sub>sp</sub> × FC<sub>sf</sub> × FC<sub>cs</sub></p>
                      <p className="text-sm text-gray-600 mt-1">Kapasitas Jalan</p>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="text-center">
                      <p className="text-lg font-mono text-blue-900 font-bold">DJ = Q / C</p>
                      <p className="text-sm text-gray-600 mt-1">Derajat Kejenuhan</p>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="text-center">
                      <p className="text-lg font-mono text-blue-900 font-bold">Q = Σ(N<sub>i</sub> × EMP<sub>i</sub>) × (60/t)</p>
                      <p className="text-sm text-gray-600 mt-1">Volume dalam SMP/jam</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results Preview */}
            {showResults && results && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Hasil Perhitungan</h4>
                <div className="space-y-3 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Kapasitas (C):</span>
                    <span className="text-gray-900 font-bold text-lg">{results.kapasitas?.kapasitas} smp/jam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Volume (Q):</span>
                    <span className="text-gray-900 font-bold text-lg">{results.volume?.volumeSMP} smp/jam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Derajat Jenuh (DJ):</span>
                    <span className="text-orange-600 font-bold text-lg">{results.DJ}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={mode === 'manual' ? handleCalculateManual : handleCalculateFromDeteksi}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menghitung...
                </>
              ) : (
                <>
                  <IconCalculate />
                  🧮 Hitung Kinerja Jalan
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Results Card */}
      {showResults && results && (
        <Card className={`border-l-4 ${losColors[results.LOS]?.border || 'border-gray-400'} bg-gradient-to-r from-white to-gray-50`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">📊</span>
            <h3 className="text-xl font-bold text-gray-900">Hasil Analisis Kinerja Ruas Jalan</h3>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Level of Service</p>
              <p className={`text-4xl font-bold rounded-lg py-2 ${losColors[results.LOS]?.bg} ${losColors[results.LOS]?.text}`}>
                {results.LOS}
              </p>
              <p className="text-xs text-gray-500 mt-2">{results.losDescription}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Derajat Kejenuhan (DJ)</p>
              <p className="text-3xl font-bold text-orange-600">{results.DJ}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Volume (Q)</p>
              <p className="text-2xl font-bold text-gray-900">{results.volume?.volumeSMP}</p>
              <p className="text-xs text-gray-500">smp/jam</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Kapasitas (C)</p>
              <p className="text-2xl font-bold text-gray-900">{results.kapasitas?.kapasitas}</p>
              <p className="text-xs text-gray-500">smp/jam</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📝 Keterangan LOS {results.LOS}</h4>
            <p className="text-blue-800">{results.losDescription}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-red-700 flex items-center gap-2"
            >
              <IconPdf />
              Export PDF
            </button>
            <button
              onClick={() => { setShowResults(false); setResults(null); }}
              className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-gray-50"
            >
              Hitung Ulang
            </button>
          </div>
        </Card>
      )}

      {/* LOS Reference */}
      <Card className="bg-blue-50 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          ℹ️ Referensi Level of Service (LOS) - PKJI 2023
        </h4>
        <div className="grid grid-cols-6 gap-3">
          {Object.entries(losColors).map(([level, colors]) => (
            <div key={level} className="text-center">
              <div className={`${colors.bg} ${colors.text} px-3 py-2 rounded-lg font-bold mb-1`}>{level}</div>
              <p className="text-xs text-gray-600">
                DJ ≤ {level === 'A' ? '0.20' : level === 'B' ? '0.44' : level === 'C' ? '0.72' : level === 'D' ? '0.84' : level === 'E' ? '0.92' : '> 0.92'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* History Table */}
      <Card className="!p-0">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📋 Riwayat Perhitungan</h3>
        </div>
        <div className="p-6">
          {perhitunganHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Belum ada riwayat perhitungan</p>
          ) : (
            <Table 
              columns={historyColumns} 
              data={perhitunganHistory.map((item, idx) => ({ ...item, no: idx + 1 }))} 
            />
          )}
        </div>
      </Card>
    </div>
  )
}

Perhitungan.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
