import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const imgLogoVector = 'https://www.figma.com/api/mcp/asset/115fae26-0be9-4560-91cd-4fd509374e39'

// Hamburger Menu Icon
const IconMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Sidebar Toggle Icon
const IconToggle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const pageNames = {
  '/dashboard': 'Dashboard',
  '/deteksi': 'Deteksi',
  '/perhitungan': 'Perhitungan',
  '/histori': 'Histori',
  '/informasi': 'Informasi Website',
  '/petunjuk': 'Petunjuk Penggunaan',
}

export default function Header({ onMenuClick, onSidebarToggle }) {
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
    <header className="bg-white border-b border-[#e2e8f0] h-12 md:h-14 flex items-center justify-between px-2 sm:px-3 md:px-4 sticky top-0 z-30">
      {/* Left side - Menu button (mobile) + Sidebar toggle (desktop) + Page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - only on mobile */}
        <button 
          onClick={onMenuClick}
          className="sm:hidden p-1.5 hover:bg-gray-100 rounded-lg"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        
        {/* Sidebar toggle - only on desktop */}
        <button 
          onClick={onSidebarToggle}
          className="hidden sm:flex p-1.5 hover:bg-gray-100 rounded-lg"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <IconToggle />
        </button>
        
        <h1 className="text-black font-semibold text-base md:text-lg lg:text-xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2' }}>
          {pageName}
        </h1>
      </div>
      
      {/* Right side - User info */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0 overflow-hidden">
          <img alt="User Avatar" className="w-full h-full object-cover" src={imgLogoVector} />
        </div>
        <div className="flex flex-col">
          <span className="text-black font-medium text-sm truncate max-w-[100px] md:max-w-none" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.2' }}>
            {userName}
          </span>
        </div>
      </div>
    </header>
  )
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  onSidebarToggle: PropTypes.func
}
