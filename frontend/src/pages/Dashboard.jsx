import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { API_ENDPOINTS, apiRequest } from '../utils/api'

const imgImage = 'https://www.figma.com/api/mcp/asset/b95c3451-d796-4d94-a410-d003a2bb8d9f'
const imgImage1 = 'https://www.figma.com/api/mcp/asset/7d8fb77f-5356-493b-9748-c3846bf7c228'

export default function Dashboard({ onLogout }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]) // Default hari ini
  const [dashboardData, setDashboardData] = useState({
    totalTrafficCounter: 0,
    highestLOS: '-',
    highestLOSLocation: '-',
    highestLOSTime: '-',
    losDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    losPercentages: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    totalPerhitungan: 0,
    totalDeteksi: 0,
    trafficData: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [selectedDate]) // Reload saat tanggal berubah

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const url = selectedDate ? `${API_ENDPOINTS.DASHBOARD_STATS}?date=${selectedDate}` : API_ENDPOINTS.DASHBOARD_STATS
      const response = await apiRequest(url)
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

  // LOS colors
  const losColors = {
    A: '#22c55e', // green
    B: '#84cc16', // lime
    C: '#eab308', // yellow
    D: '#f97316', // orange
    E: '#ef4444', // red
    F: '#dc2626'  // dark red
  }

  // Generate time labels for x-axis (hourly)
  const timeLabels = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']

  // Generate chart data from trafficData using waktuObservasi
  const generateChartData = () => {
    if (!dashboardData.trafficData || dashboardData.trafficData.length === 0) {
      return timeLabels.map(time => ({ time, dj: null }))
    }
    return timeLabels.map(time => {
      // Find data point matching this time by waktuObservasi
      const dataPoint = dashboardData.trafficData.find(item => {
        // Use waktuObservasi if available
        if (item.waktuObservasi) {
          // waktuObservasi format baru: "HH:MM-HH:MM", ambil jam mulai saja
          const startTime = item.waktuObservasi.split('-')[0]
          return startTime === time
        }
        return false
      })
      return { 
        time, 
        dj: dataPoint ? dataPoint.dj : null,
        los: dataPoint ? dataPoint.los : null,
        namaRuas: dataPoint ? dataPoint.namaRuas : null,
        waktuObservasi: dataPoint ? dataPoint.waktuObservasi : null
      }
    })
  }

  // Find peak point
  const findPeakPoint = () => {
    const chartData = generateChartData()
    let peak = { time: '', dj: 0 }
    chartData.forEach(point => {
      if (point.dj !== null && point.dj > peak.dj) {
        peak = point
      }
    })
    return peak
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

  const chartData = generateChartData()
  const peak = findPeakPoint()
  const hasChartData = chartData.some(d => d.dj !== null)

  return (
    <div className="bg-[#f7f7f7] flex flex-col gap-4 sm:gap-6 items-start justify-start p-3 sm:p-4 md:p-6 relative w-full">
      {/* Date Picker Section */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 sm:p-4 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-700">Pilih Tanggal:</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-700 font-medium w-full sm:w-auto"
            style={{ colorScheme: 'light' }}
          />
          <div className="text-xs sm:text-sm text-gray-500">
            Data: {new Date(selectedDate).toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 relative w-full">
        {/* Card 1: Total Traffic Counter */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 sm:p-6 md:p-8 flex flex-col items-start justify-start relative min-h-[120px] sm:h-[160px]">
          <div className="flex items-center justify-between relative w-full">
            <div className="flex flex-col gap-1 items-start">
              <p className="text-xs sm:text-sm font-medium text-gray-500" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                Total Traffic Counter
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-black" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                {dashboardData.totalTrafficCounter.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
              <img alt="Traffic Icon" src={imgImage} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Card 2: LOS Tertinggi */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 sm:p-6 md:p-8 flex flex-col items-start justify-start relative min-h-[120px] sm:h-[160px]">
          <div className="flex items-center justify-between relative w-full">
            <div className="flex flex-col gap-1 items-start">
              <p className="text-xs sm:text-sm font-medium text-gray-500" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                LOS Tertinggi ({new Date(selectedDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })})
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ 
                fontFamily: 'Poppins, sans-serif', 
                fontWeight: 700, 
                lineHeight: '1.2',
                color: losColors[dashboardData.highestLOS] || '#000'
              }}>
                {dashboardData.highestLOS}
              </p>
              <p className="text-xs sm:text-sm font-regular text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: 'normal' }}>
                {dashboardData.highestLOSTime || dashboardData.highestLOSLocation || '-'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
              <img alt="LOS Icon" src={imgImage1} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Card 3: Data LOS Donut Chart */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 sm:p-4 flex flex-col gap-2 items-center justify-center relative min-h-[120px] sm:h-[160px] sm:col-span-2 lg:col-span-1">
          <p className="text-sm sm:text-lg font-semibold text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2' }}>
            Data LOS
          </p>

          {/* Donut Chart SVG */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
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
                <p className="text-gray-700 font-semibold text-xs">
                  {dashboardData.totalPerhitungan}
                </p>
              </div>
            </div>

            {/* Legend - compact */}
            <div className="flex flex-col gap-0.5">
              {Object.entries(losColors).map(([los, color]) => (
                <div key={los} className="flex gap-1 items-center whitespace-nowrap">
                  <div style={{ width: '12px', height: '8px', backgroundColor: color, borderRadius: '2px' }} />
                  <p className="text-xs text-gray-600" style={{ fontSize: '10px' }}>
                    {los}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart - Grafik Kinerja Ruas Jalan */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 sm:p-4 md:p-6 relative w-full">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-8 relative w-full mb-4">
          <div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-black" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              Grafik Kinerja Ruas Jalan MBZ (Harian)
            </h3>
            <p className="text-xs sm:text-sm font-regular text-gray-500 mt-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4' }}>
              Derajat Kejenuhan berdasarkan deteksi YOLO dan standar PKJI 2023
            </p>
          </div>
          
          {/* Legend - responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-gray-600 text-xs">DJ Aktual (YOLO)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-green-500"></div>
              <span className="text-gray-600 text-xs">Batas LOS A</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-lime-500"></div>
              <span className="text-gray-600 text-xs">Batas LOS B</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-yellow-500"></div>
              <span className="text-gray-600 text-xs">Batas LOS C</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-orange-500"></div>
              <span className="text-gray-600 text-xs">Batas LOS D</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-red-500"></div>
              <span className="text-gray-600 text-xs">Batas LOS E</span>
            </div>
          </div>
        </div>

        {/* Chart Area - responsive */}
        <div className="relative w-full h-[250px] sm:h-[300px] md:h-[350px] overflow-x-auto">
          <svg viewBox="0 0 900 350" className="w-full h-full min-w-[600px]" preserveAspectRatio="xMidYMid meet">
            {/* Y-axis labels */}
            <text x="25" y="35" className="text-xs fill-gray-500" textAnchor="end">1</text>
            <text x="25" y="95" className="text-xs fill-gray-500" textAnchor="end">0.8</text>
            <text x="25" y="155" className="text-xs fill-gray-500" textAnchor="end">0.6</text>
            <text x="25" y="215" className="text-xs fill-gray-500" textAnchor="end">0.4</text>
            <text x="25" y="275" className="text-xs fill-gray-500" textAnchor="end">0.2</text>
            <text x="25" y="325" className="text-xs fill-gray-500" textAnchor="end">0</text>

            {/* Grid lines */}
            <line x1="40" y1="30" x2="880" y2="30" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="90" x2="880" y2="90" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="150" x2="880" y2="150" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="210" x2="880" y2="210" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="270" x2="880" y2="270" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="320" x2="880" y2="320" stroke="#e5e7eb" strokeWidth="1" />

            {/* LOS threshold lines */}
            <line x1="40" y1="262" x2="880" y2="262" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="8,4" />
            <line x1="40" y1="192" x2="880" y2="192" stroke="#84cc16" strokeWidth="1.5" strokeDasharray="8,4" />
            <line x1="40" y1="111" x2="880" y2="111" stroke="#eab308" strokeWidth="1.5" strokeDasharray="8,4" />
            <line x1="40" y1="76" x2="880" y2="76" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8,4" />
            <line x1="40" y1="53" x2="880" y2="53" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="8,4" />

            {/* Data line */}
            {hasChartData && (
              <>
                {/* Draw lines connecting consecutive data points */}
                {chartData.map((point, index) => {
                  if (point.dj === null) return null
                  // Find next valid point
                  let nextIndex = index + 1
                  while (nextIndex < chartData.length && chartData[nextIndex].dj === null) {
                    nextIndex++
                  }
                  if (nextIndex >= chartData.length || chartData[nextIndex].dj === null) return null
                  
                  const x1 = 40 + (index * (840 / (timeLabels.length - 1)))
                  const y1 = 320 - (point.dj * 290)
                  const x2 = 40 + (nextIndex * (840 / (timeLabels.length - 1)))
                  const y2 = 320 - (chartData[nextIndex].dj * 290)
                  
                  return (
                    <line
                      key={`line-${index}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                    />
                  )
                })}
                
                {/* Data points */}
                {chartData.map((point, index) => {
                  if (point.dj === null) return null
                  const x = 40 + (index * (840 / (timeLabels.length - 1)))
                  const y = 320 - (point.dj * 290)
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                      />
                      {/* Tooltip on hover - show DJ value and time range */}
                      <title>{`${point.waktuObservasi || point.time}: DJ = ${point.dj?.toFixed(3)} (LOS ${point.los})`}</title>
                    </g>
                  )
                })}

                {/* Peak annotation */}
                {peak.dj > 0 && (
                  <>
                    <rect
                      x={40 + (timeLabels.indexOf(peak.time) * (840 / (timeLabels.length - 1))) - 45}
                      y={320 - (peak.dj * 290) - 35}
                      width="90"
                      height="28"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={40 + (timeLabels.indexOf(peak.time) * (840 / (timeLabels.length - 1)))}
                      y={320 - (peak.dj * 290) - 15}
                      className="text-xs fill-amber-700"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      Puncak Kepadatan
                    </text>
                  </>
                )}
              </>
            )}

            {/* X-axis labels */}
            {timeLabels.map((time, index) => (
              <text
                key={time}
                x={40 + (index * (840 / (timeLabels.length - 1)))}
                y="345"
                className="text-xs fill-gray-500"
                textAnchor="middle"
              >
                {time}
              </text>
            ))}
          </svg>

          {/* No data message */}
          {!hasChartData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="text-center">
                <p className="text-gray-400 text-lg mb-2">Belum ada data grafik</p>
                <p className="text-gray-300 text-sm">Data akan muncul setelah melakukan perhitungan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center w-full py-4">
        <p className="text-gray-400 text-sm">© 2025 Politeknik Keselamatan Transportasi Jalan. All rights reserved.</p>
      </div>
    </div>
  )
}

Dashboard.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
