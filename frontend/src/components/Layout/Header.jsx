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
}

export default function Header() {
  const location = useLocation()
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserName(userData.name || userData.nama || 'User')
      } catch (e) {
        setUserName('User')
      }
    }
  }, [])

  const pageName = pageNames[location.pathname] || 'Dashboard'

  return (
    <header className="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-black font-semibold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2', fontSize: '20px' }}>
        {pageName}
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
          <img alt="User Avatar" className="w-full h-full object-cover" src={imgLogoVector} />
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
