import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const imgLogoVector = 'https://www.figma.com/api/mcp/asset/115fae26-0be9-4560-91cd-4fd509374e39'

const pageNames = {
  '/dashboard': 'Dashboard',
  '/deteksi': 'Deteksi',
  '/perhitungan': 'Perhitungan',
  '/histori': 'Histori',
  '/informasi': 'Informasi Website',
  '/petunjuk': 'Petunjuk Penggunaan',
  '/manajemen-user': 'Manajemen User',
}

export default function Header() {
  const location = useLocation()
  const pageName = pageNames[location.pathname] || 'Dashboard'
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        // Backend returns 'nama' not 'namaUser'
        setUserName(user.nama || user.namaUser || user.name || 'User')
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }, [])

  return (
    <header className="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-black font-semibold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2', fontSize: '20px' }}>
        {pageName}
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gray-200 flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-black font-medium" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.2', fontSize: '14px' }}>
            {userName}
          </span>
        </div>
      </div>
    </header>
  )
}
