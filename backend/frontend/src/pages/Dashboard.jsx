import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { API_ENDPOINTS, apiRequest } from '../config/api'

const imgImage = 'https://www.figma.com/api/mcp/asset/b95c3451-d796-4d94-a410-d003a2bb8d9f'
const imgImage1 = 'https://www.figma.com/api/mcp/asset/7d8fb77f-5356-493b-9748-c3846bf7c228'

export default function Dashboard({ onLogout }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    totalTrafficCounter: 0,
    highestLOS: '-',
    highestLOSLocation: '-',
    losDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    losPercentages: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    totalPerhitungan: 0,
    totalDeteksi: 0,
    trafficData: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiRequest(API_ENDPOINTS.DASHBOARD_STATS)
      if (response.status === 'success') {
        setDashboardData(response.data)
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err.message || 'Gagal mengambil data dashboard')
    } finally {
      setLoading(false)
    }
  }

  const hasData = dashboardData.totalPerhitungan > 0 || dashboardData.totalDeteksi > 0

  // LOS colors
  const losColors = {
    A: '#22c55e', // green
    B: '#84cc16', // lime
    C: '#eab308', // yellow
    D: '#f97316', // orange
    E: '#ef4444', // red
    F: '#dc2626'  // dark red
  }

  // Calculate donut chart segments
  const calculateDonutSegments = () => {
    const total = Object.values(dashboardData.losDistribution).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    
    let currentAngle = 0
    const segments = []
    
    Object.entries(dashboardData.losDistribution).forEach(([los, count]) => {
      if (count > 0) {
        const percentage = (count / total) * 100
        const angle = (percentage / 100) * 360
        segments.push({
          los,
          percentage,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          color: losColors[los]
        })
        currentAngle += angle
      }
    })
    
    return segments
  }

  if (loading) {
    return (
      <div className="bg-[#f7f7f7] flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#f7f7f7] flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f7f7f7] flex flex-col gap-6 items-start justify-start p-6 relative w-full">
      {/* Stats Cards Section */}
      <div className="grid grid-cols-3 gap-6 relative w-full">
        {/* Card 1: Total Traffic Counter */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-8 flex flex-col items-start justify-start relative h-[280px]">
          <div className="flex items-center justify-between relative w-full">
            <div className="flex flex-col gap-1 items-start">
              <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.4' }}>
                Total Traffic Counter
              </p>
              <p className="text-4xl font-bold text-black" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '32px', lineHeight: '1.2' }}>
                {dashboardData.totalTrafficCounter.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Dari {dashboardData.totalDeteksi} deteksi
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <img alt="Traffic Icon" src={imgImage} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        {/* Card 2: LOS Tertinggi */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-8 flex flex-col items-start justify-start relative h-[280px]">
          <div className="flex items-center justify-between relative w-full">
            <div className="flex flex-col gap-1 items-start">
              <p className="text-sm font-medium text-gray-500" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.4' }}>
                LOS Tertinggi Hari Ini
              </p>
              <p className="text-4xl font-bold" style={{ 
                fontFamily: 'Poppins, sans-serif', 
                fontWeight: 700, 
                fontSize: '32px', 
                lineHeight: '1.2',
                color: losColors[dashboardData.highestLOS] || '#000'
              }}>
                {dashboardData.highestLOS}
              </p>
              <p className="text-sm font-regular text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: 'normal' }}>
                {dashboardData.highestLOSLocation}
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <img alt="LOS Icon" src={imgImage1} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Data LOS Donut Chart */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 flex flex-col gap-4 items-center justify-center relative h-[280px]">
          <div className="flex items-center justify-center relative w-full">
            <p className="text-2xl font-semibold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '24px', lineHeight: '1.2' }}>
              Data LOS
            </p>
          </div>

          {/* Donut Chart SVG */}
          <div className="flex items-center justify-center relative">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {calculateDonutSegments().length > 0 ? (
                  calculateDonutSegments().map((segment, index) => {
                    const radius = 35
                    const circumference = 2 * Math.PI * radius
                    const strokeDasharray = (segment.percentage / 100) * circumference
                    const strokeDashoffset = calculateDonutSegments()
                      .slice(0, index)
                      .reduce((acc, s) => acc + (s.percentage / 100) * circumference, 0)
                    
                    return (
                      <circle
                        key={segment.los}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="20"
                        strokeDasharray={`${strokeDasharray} ${circumference}`}
                        strokeDashoffset={-strokeDashoffset}
                      />
                    )
                  })
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-700 font-semibold text-sm">
                  {dashboardData.totalPerhitungan} data
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 items-center justify-center relative flex-wrap">
            {Object.entries(losColors).map(([los, color]) => (
              <div key={los} className="flex gap-1 items-center whitespace-nowrap">
                <div style={{ width: '24px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                <p className="text-xs font-regular text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '12px', lineHeight: 'normal' }}>
                  {los} ({dashboardData.losDistribution[los]})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic Data Table */}
      {hasData && dashboardData.trafficData.length > 0 && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-8 relative w-full">
          <div className="flex items-start justify-between gap-8 relative w-full mb-6">
            <div>
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '20px', lineHeight: '1.2' }}>
                Riwayat Perhitungan Terbaru
              </h3>
              <p className="text-base font-regular text-gray-500 mt-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '1.4' }}>
                Data perhitungan LOS berdasarkan standar PKJI 2023
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tanggal</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Nama Ruas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Volume</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Kapasitas</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">LOS</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.trafficData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {new Date(item.date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{item.namaRuas}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.volume?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.kapasitas?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span 
                        className="px-3 py-1 rounded-full text-white font-semibold text-xs"
                        style={{ backgroundColor: losColors[item.los] || '#6b7280' }}
                      >
                        {item.los}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State Message */}
      {!hasData && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-12 flex flex-col items-center justify-center gap-4 relative w-full">
          <p className="text-gray-400 font-medium text-lg">Tidak ada data untuk ditampilkan</p>
          <p className="text-gray-300 text-sm">Data akan tampil setelah Anda melakukan deteksi dan perhitungan</p>
        </div>
      )}
    </div>
  )
}

Dashboard.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
