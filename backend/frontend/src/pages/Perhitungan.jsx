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
  const [mode, setMode] = useState('sederhana') // 'sederhana', 'manual', or 'deteksi'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showResults, setShowResults] = useState(false)
  
  // Referensi PKJI
  const [referensi, setReferensi] = useState(null)
  
  // Simple constants
  const [simpleConstants, setSimpleConstants] = useState(null)
  
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
    loadSimpleConstants()
    loadPerhitunganHistory()
  }, [])

  // Load deteksi when mode changes to 'deteksi' or 'sederhana'
  useEffect(() => {
    if (mode === 'deteksi' || mode === 'sederhana') {
      loadDeteksiAvailable()
    }
  }, [mode])

  const loadSimpleConstants = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_SIMPLE_CONSTANTS)
      if (response.success) {
        setSimpleConstants(response.data)
      }
    } catch (err) {
      console.error('Failed to load simple constants:', err)
    }
  }

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

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_DARI_DETEKSI(selectedDeteksi._id), {
        method: 'POST',
        body: JSON.stringify({
          namaRuas: formData.namaRuas,
          tipeJalan: formData.tipeJalan,
          jumlahLajur: formData.jumlahLajur,
          lebarLajur: formData.lebarLajur,
          faktorPemisah: formData.faktorPemisah,
          hambatanSamping: formData.hambatanSamping,
          ukuranKota: formData.ukuranKota
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

  // Handler untuk perhitungan sederhana (rumus: C = n × C0 × FCLE)
  const handleCalculateSederhana = async () => {
    if (!selectedDeteksi) {
      setError('Pilih hasil deteksi YOLO terlebih dahulu')
      return
    }
    if (!formData.namaRuas) {
      setError('Nama ruas jalan wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(API_ENDPOINTS.PERHITUNGAN_SEDERHANA(selectedDeteksi._id), {
        method: 'POST',
        body: JSON.stringify({
          namaRuas: formData.namaRuas
        })
      })

      if (response.success) {
        setResults(response.data)
        setShowResults(true)
        setSuccess('Perhitungan kinerja jalan berhasil!')
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
          <p><strong>Nama Ruas:</strong> ${results.input?.namaRuas || '-'}</p>
          <p><strong>Tipe Jalan:</strong> ${results.input?.tipeJalan || '-'}</p>
          <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          
          <div class="section">
            <h2>Hasil Perhitungan</h2>
            <table>
              <tr><th>Parameter</th><th>Nilai</th></tr>
              <tr><td>Kapasitas Jalan (C)</td><td>${results.hasil?.kapasitas} smp/jam</td></tr>
              <tr><td>Volume Lalu Lintas (Q)</td><td>${results.hasil?.volume} smp/jam</td></tr>
              <tr><td>Derajat Kejenuhan (DJ)</td><td>${results.hasil?.derajatJenuh}</td></tr>
              <tr><td>Level of Service (LOS)</td><td class="result">${results.hasil?.los}</td></tr>
              <tr><td>Kondisi</td><td>${results.hasil?.kondisi}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Keterangan LOS ${results.hasil?.los}</h2>
            <p>${results.hasil?.losDescription}</p>
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
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 font-medium">{success}</p>
        </div>
      )}

      {/* Mode Selector */}
      <Card className="!p-4">
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => { setMode('sederhana'); setShowResults(false); setResults(null); setSelectedDeteksi(null); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'sederhana' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚀 Perhitungan Cepat (YOLO)
          </button>
          <button
            onClick={() => { setMode('manual'); setShowResults(false); setResults(null); setSelectedDeteksi(null); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'manual' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Input Manual / CSV
          </button>
          <button
            onClick={() => { setMode('deteksi'); setShowResults(false); setResults(null); setSelectedDeteksi(null); }}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'deteksi' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎯 Perhitungan PKJI (YOLO)
          </button>
        </div>
      </Card>

      {/* Mode Sederhana - Perhitungan Cepat dari YOLO */}
      {mode === 'sederhana' && (
        <Card className="!p-0">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900">🚀 Perhitungan Cepat Kinerja Jalan</h3>
            <p className="text-sm text-gray-600 mt-1">Analisis kinerja jalan menggunakan data dari deteksi YOLO dengan parameter standar</p>
          </div>

          <div className="p-6 grid grid-cols-2 gap-8">
            {/* Left: Pilih Deteksi + Nama Ruas */}
            <div className="space-y-6">
              {/* Pilih Deteksi */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">1️⃣ Pilih Hasil Deteksi YOLO</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-72 overflow-y-auto space-y-2">
                  {deteksiList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">Belum ada hasil deteksi</p>
                      <p className="text-sm text-gray-400">Upload video di halaman Deteksi terlebih dahulu</p>
                    </div>
                  ) : (
                    deteksiList.map(d => (
                      <div
                        key={d._id}
                        onClick={() => setSelectedDeteksi(d)}
                        className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedDeteksi?._id === d._id 
                            ? 'border-purple-500 bg-purple-50 shadow-md' 
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-gray-900">{d.videoFileName}</p>
                          {selectedDeteksi?._id === d._id && (
                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">Dipilih</span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-purple-600 font-semibold">Total: {d.totalKendaraan}</span>
                          <span className="text-gray-500">🚗 {(d.laneKiri?.mobil || 0) + (d.laneKanan?.mobil || 0)}</span>
                          <span className="text-gray-500">🚌 {(d.laneKiri?.bus || 0) + (d.laneKanan?.bus || 0)}</span>
                          <span className="text-gray-500">🚚 {(d.laneKiri?.truk || 0) + (d.laneKanan?.truk || 0)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(d.createdAt).toLocaleString('id-ID')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Nama Ruas Jalan */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">2️⃣ Nama Ruas Jalan</h4>
                <input
                  type="text"
                  value={formData.namaRuas}
                  onChange={(e) => setFormData({ ...formData, namaRuas: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  placeholder="Contoh: Jl. MBZ, Tol Jakarta-Cikampek"
                />
              </div>
            </div>

            {/* Right: Parameter Tetap & Rumus */}
            <div className="space-y-6">
              {/* Parameter Tetap */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">📋 Parameter Tetap</h4>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 space-y-3 border border-blue-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Tipe Jalan</p>
                      <p className="font-bold text-gray-900">4/2 D</p>
                      <p className="text-xs text-gray-400">4 lajur 2 arah + median</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Jenis Kendaraan</p>
                      <p className="font-bold text-gray-900">Mobil = 1 SMP</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Jumlah Lajur (n)</p>
                      <p className="font-bold text-gray-900">2</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">FCLE</p>
                      <p className="font-bold text-gray-900">1</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">C₀ (Kapasitas Dasar)</p>
                      <p className="font-bold text-gray-900">2500 SMP/jam</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Lebar Lajur</p>
                      <p className="font-bold text-gray-900">3.5 m</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Kecepatan Dasar</p>
                      <p className="font-bold text-gray-900">88 km/jam</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-500">Faktor Lebar Efektif</p>
                      <p className="font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rumus */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">📐 Rumus Perhitungan</h4>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 space-y-4 border border-green-200">
                  <div className="text-center">
                    <p className="text-lg font-mono font-bold text-green-800">C = n × C₀ × FCLE</p>
                    <p className="text-sm text-gray-600 mt-1">Kapasitas = 2 × 2500 × 1 = <span className="font-bold text-green-700">5,000 SMP/jam</span></p>
                  </div>
                  <hr className="border-green-200" />
                  <div className="text-center">
                    <p className="text-lg font-mono font-bold text-blue-800">DJ = Q / C</p>
                    <p className="text-sm text-gray-600 mt-1">Derajat Kejenuhan = Volume / Kapasitas</p>
                  </div>
                  <hr className="border-green-200" />
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Level of Service (LOS) ditentukan berdasarkan nilai DJ</p>
                  </div>
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculateSederhana}
                disabled={loading || !selectedDeteksi}
                className="w-full bg-purple-600 text-white font-semibold py-4 rounded-lg transition-all hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
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
                    🚀 Hitung Kinerja Jalan
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Mode Manual/Deteksi - Form Kompleks */}
      {(mode === 'manual' || mode === 'deteksi') && (
      <Card className="!p-0">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'manual' ? '📝 Perhitungan Manual' : '🎯 Perhitungan PKJI dari Deteksi'}
          </h3>
          {mode === 'manual' && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                <IconUpload />
                Upload CSV
              </div>
            </label>
          )}
        </div>

        <div className="p-6 grid grid-cols-2 gap-8">
          {/* Left: Form Inputs */}
          <div className="space-y-6">
            {/* Pilih Deteksi (jika mode deteksi) */}
            {mode === 'deteksi' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Pilih Hasil Deteksi</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto space-y-2">
                  {deteksiList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Belum ada hasil deteksi</p>
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
                        <p className="font-medium text-gray-900">{d.videoFileName}</p>
                        <p className="text-sm text-gray-500">
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
              <h4 className="font-semibold text-gray-900 mb-4">Informasi Ruas Jalan</h4>
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
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
            {/* Rumus */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Rumus Perhitungan (PKJI 2023)</h4>
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
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
              </div>
            </div>

            {/* Results Preview */}
            {showResults && results && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Hasil Perhitungan</h4>
                <div className="space-y-3 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Kapasitas (C):</span>
                    <span className="text-gray-900 font-bold text-lg">{results.hasil?.kapasitas} smp/jam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Volume (Q):</span>
                    <span className="text-gray-900 font-bold text-lg">{results.hasil?.volume} smp/jam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Derajat Jenuh (DJ):</span>
                    <span className="text-orange-600 font-bold text-lg">{results.hasil?.derajatJenuh}</span>
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
      )}

      {/* Results Card */}
      {showResults && results && (
        <Card className={`border-l-4 ${losColors[results.hasil?.los]?.border || 'border-gray-400'} bg-gradient-to-r from-white to-gray-50`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">📊</span>
            <h3 className="text-xl font-bold text-gray-900">Hasil Analisis Kinerja Ruas Jalan</h3>
          </div>

          {/* Kesimpulan untuk mode sederhana */}
          {mode === 'sederhana' && results.kesimpulan && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">📌 Kesimpulan</h4>
              <p className="text-gray-800 mb-2">{results.kesimpulan.ringkasan}</p>
              <p className="text-gray-700 text-sm mb-2">{results.kesimpulan.analisis}</p>
              <p className="text-purple-800 font-medium text-sm">{results.kesimpulan.rekomendasi}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Level of Service</p>
              <p className={`text-4xl font-bold rounded-lg py-2 ${losColors[results.hasil?.los]?.bg} ${losColors[results.hasil?.los]?.text}`}>
                {results.hasil?.los}
              </p>
              <p className="text-xs text-gray-500 mt-2">{results.hasil?.kondisi}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Derajat Kejenuhan (DJ)</p>
              <p className="text-3xl font-bold text-orange-600">{results.hasil?.derajatJenuh}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Volume (Q)</p>
              <p className="text-2xl font-bold text-gray-900">{results.hasil?.volume}</p>
              <p className="text-xs text-gray-500">smp/jam</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Kapasitas (C)</p>
              <p className="text-2xl font-bold text-gray-900">{results.hasil?.kapasitas}</p>
              <p className="text-xs text-gray-500">smp/jam</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📝 Keterangan LOS {results.hasil?.los}</h4>
            <p className="text-blue-800">{results.hasil?.losDescription}</p>
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
