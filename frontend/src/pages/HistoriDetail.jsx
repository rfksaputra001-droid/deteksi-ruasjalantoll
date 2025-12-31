import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import { API_ENDPOINTS, apiRequest } from '../config/api'

const imgPdfIcon = 'https://www.figma.com/api/mcp/asset/76415445-0e50-4f59-b9d3-1912365f7819'
const imgCsvIcon = 'https://www.figma.com/api/mcp/asset/ab2b1ed0-2311-4573-a6dc-fc2b667490aa'

// LOS description mapping
const losDescriptions = {
  A: { color: '#22c55e', desc: 'Kondisi arus bebas dengan kecepatan tinggi dan volume lalu lintas rendah' },
  B: { color: '#84cc16', desc: 'Kondisi lalu lintas stabil dengan kecepatan mulai dibatasi' },
  C: { color: '#eab308', desc: 'Kondisi lalu lintas stabil namun kecepatan dan gerak kendaraan dikendalikan' },
  D: { color: '#f97316', desc: 'Kondisi arus mendekati tidak stabil, kecepatan masih dapat ditoleransi' },
  E: { color: '#ef4444', desc: 'Kondisi arus tidak stabil, volume hampir sama dengan kapasitas' },
  F: { color: '#dc2626', desc: 'Kondisi arus dipaksakan, kecepatan rendah dan volume di bawah kapasitas' }
}

export default function HistoriDetail({ onLogout }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      fetchDetail()
    }
  }, [id])

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const response = await apiRequest(API_ENDPOINTS.HISTORY_DETAIL(id))
      if (response.status === 'success') {
        setData(response.data)
      }
    } catch (err) {
      console.error('Error fetching detail:', err)
      setError(err.message || 'Gagal mengambil data detail')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (!num) return '-'
    return parseFloat(num).toLocaleString('id-ID')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data detail...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="text-center py-16 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{error || 'Data Tidak Ditemukan'}</h2>
          <p className="text-gray-600 mb-6">Silahkan pilih riwayat analisis dari halaman Riwayat untuk melihat detail hasil perhitungan.</p>
          <Button variant="primary" size="md" onClick={() => navigate('/histori')} className="flex items-center gap-2 justify-center w-full">
            ← Kembali ke Riwayat
          </Button>
        </Card>
      </div>
    )
  }

  const losInfo = losDescriptions[data.los] || { color: '#6b7280', desc: 'Tidak diketahui' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="!p-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Detail Analisis Kinerja Ruas Jalan</h2>
          <div className="flex gap-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>🛣️</span>
              <span>{data.namaRuas || 'Ruas Jalan'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formatDate(data.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🚗</span>
              <span>{data.tipeJalan || '-'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="primary" size="md" onClick={() => navigate('/histori')} className="flex items-center gap-2">
          ← Kembali ke Riwayat
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="text-center">
          <p className="text-5xl font-bold mb-2" style={{ color: losInfo.color }}>{data.los || '-'}</p>
          <p className="text-sm text-gray-600">Level of Service</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-orange-600 mb-2">{data.dj ? parseFloat(data.dj).toFixed(3) : '-'}</p>
          <p className="text-sm text-gray-600">Derajat Kejenuhan</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(data.volume)}</p>
          <p className="text-sm text-gray-600">Volume (smp/jam)</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(data.kapasitas)}</p>
          <p className="text-sm text-gray-600">Kapasitas (smp/jam)</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-2">{data.durasiMenit || '-'}</p>
          <p className="text-sm text-gray-600">Durasi (menit)</p>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Detection Results or Manual Input */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {data.sumberData === 'deteksi' ? 'Hasil Deteksi YOLO' : 'Input Data'}
              </h3>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                data.sumberData === 'deteksi' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  data.sumberData === 'deteksi' ? 'bg-green-600' : 'bg-blue-600'
                }`}></span>
                {data.sumberData === 'deteksi' ? 'Auto Generated' : 'Manual'}
              </span>
            </div>
            <div className="space-y-4">
              {data.deteksiYOLO && (
                <>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-700">Total Kendaraan Terdeteksi</span>
                    <span className="font-bold text-gray-900">{formatNumber(data.deteksiYOLO.totalKendaraan)} unit</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-700">Durasi Video</span>
                    <span className="font-bold text-gray-900">{data.deteksiYOLO.durasiDetik ? Math.round(data.deteksiYOLO.durasiDetik / 60) : '-'} menit</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-700">Volume Lalu Lintas (Q)</span>
                <span className="font-bold text-gray-900">{formatNumber(data.volume)} smp/jam</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-700">Kapasitas Jalan (C)</span>
                <span className="font-bold text-gray-900">{formatNumber(data.kapasitas)} smp/jam</span>
              </div>
            </div>
          </Card>

          {/* Level of Service */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-6">Level of Service</h3>
            <div className="text-center mb-6">
              <p className="text-8xl font-bold mb-4" style={{ color: losInfo.color }}>{data.los || '-'}</p>
            </div>
            <div className="text-center">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Level of Service {data.los}</h4>
              <p className="text-sm text-gray-600">{losInfo.desc}</p>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Road Parameters */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Parameter Ruas Jalan</h3>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                DATA
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-700">Nama Ruas</span>
                <span className="font-bold text-gray-900">{data.namaRuas || '-'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-700">Tipe Jalan</span>
                <span className="font-bold text-gray-900">{data.tipeJalan || '-'}</span>
              </div>
              {data.parameterKapasitas && (
                <>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-700">Jumlah Lajur</span>
                    <span className="font-bold text-gray-900">{data.parameterKapasitas.jumlahLajur || '-'} lajur</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-700">Lebar Efektif</span>
                    <span className="font-bold text-gray-900">{data.parameterKapasitas.lebarEfektif || '-'} m</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-700">Kapasitas Dasar (C₀)</span>
                    <span className="font-bold text-gray-900">{formatNumber(data.parameterKapasitas.kapasitasDasar)} smp/jam/lajur</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* DJ Calculation */}
          <Card className="bg-orange-50 border border-orange-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Perhitungan DJ</h3>
            <div className="space-y-4 text-center">
              <div className="font-mono font-semibold text-gray-900 text-lg">DJ = Q / C</div>
              <div className="font-mono font-semibold text-gray-900 text-lg">
                DJ = {formatNumber(data.volume)} / {formatNumber(data.kapasitas)}
              </div>
              <div className="font-mono font-bold text-orange-700 text-4xl">
                DJ = {data.dj ? parseFloat(data.dj).toFixed(3) : '-'}
              </div>
            </div>
          </Card>

          {/* Conclusion */}
          <Card className="bg-blue-50 border border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Kesimpulan</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Berdasarkan hasil analisis kinerja lalu lintas pada <strong>{data.namaRuas || 'ruas jalan'}</strong> yang 
              dilakukan pada tanggal <strong>{formatDate(data.createdAt)}</strong>, 
              diperoleh nilai Derajat Kejenuhan (DJ) sebesar <strong>{data.dj ? parseFloat(data.dj).toFixed(3) : '-'}</strong>.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              Dengan volume lalu lintas sebesar <strong>{formatNumber(data.volume)} smp/jam</strong> dan 
              kapasitas jalan <strong>{formatNumber(data.kapasitas)} smp/jam</strong>, 
              ruas jalan ini memiliki <strong style={{ color: losInfo.color }}>Level of Service {data.los}</strong>, 
              yang menunjukkan {losInfo.desc.toLowerCase()}.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

HistoriDetail.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
