import PropTypes from 'prop-types'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const imgLogoPktjSmall = 'https://www.figma.com/api/mcp/asset/b36f768d-68ae-4d7c-aacf-d5e2aec1a4d0'
const imgDashboard = 'https://www.figma.com/api/mcp/asset/f1bba751-4231-4844-aa70-3b97f428b0ad'
const imgDeteksi = 'https://www.figma.com/api/mcp/asset/f672421c-911f-4451-aa37-d1d05d0e2587'
const imgPerhitungan = 'https://www.figma.com/api/mcp/asset/023a91da-5e6b-4173-a698-b946cdf2f9f9'
const imgHistori = 'https://www.figma.com/api/mcp/asset/012e51f2-5480-47ef-abce-1409a75d147b'
const imgInformasi = 'https://www.figma.com/api/mcp/asset/db7f0dbf-57de-456e-a8a0-ed2b17dc6d4e'
const imgPetunjuk = 'https://www.figma.com/api/mcp/asset/062a930d-7e75-4e7f-962f-59d0af63a428'
const imgLogout = 'https://www.figma.com/api/mcp/asset/227a1033-dbd3-4bdd-8eee-c0c1e01e4bd4'

// Close Icon for mobile
const IconClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Collapse Toggle Icon
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Icon untuk Admin Menu
const IconUsers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Menu items dengan role-based access
const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: imgDashboard, roles: 'all' },
  { name: 'Deteksi', path: '/deteksi', icon: imgDeteksi, roles: 'surveyor' },
  { name: 'Perhitungan', path: '/perhitungan', icon: imgPerhitungan, roles: 'surveyor' },
  { name: 'Histori', path: '/histori', icon: imgHistori, roles: 'surveyor' },
  { name: 'Informasi Website', path: '/informasi', icon: imgInformasi, roles: 'all' },
  { name: 'Petunjuk', path: '/petunjuk', icon: imgPetunjuk, roles: 'all' },
]

export default function Sidebar({ onClose, collapsed, onToggleCollapse }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState('user')

  useEffect(() => {
    // Check user role
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || 'user')
      } catch (e) {
        setUserRole('user')
      }
    }
  }, [])

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles === 'all') return true
    if (item.roles === 'surveyor') return userRole === 'surveyor' || userRole === 'admin'
    if (item.roles === 'admin') return userRole === 'admin'
    return false
  })

  const isAdmin = userRole === 'admin'

  const isActive = (path) => location.pathname === path

  // Handle menu click - close sidebar on mobile
  const handleMenuClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <div className="bg-white flex flex-col h-screen overflow-y-auto shadow-lg relative">
      {/* Close button - only on mobile */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-lg z-10"
      >
        <IconClose />
      </button>

      {/* Collapse Toggle - only on desktop */}
      <button
        onClick={onToggleCollapse}
        className={`
          hidden lg:flex absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-lg z-10
          transition-transform duration-300
          ${collapsed ? 'rotate-180' : ''}
        `}
      >
        <IconChevronLeft />
      </button>

      {/* Brand */}
      <div className={`
        flex items-center justify-center py-4 w-full shrink-0 transition-all duration-300
        ${collapsed ? 'px-2' : 'px-4'}
      `}>
        <div className="relative w-8 h-8 flex-shrink-0">
          <img alt="Logo PKTJ" className="w-full h-full object-cover" src={imgLogoPktjSmall} />
        </div>
        {!collapsed && (
          <h1 className="text-black font-semibold whitespace-nowrap text-sm ml-2 transition-opacity duration-300" 
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2' }}>
            Kinerja Ruas Jalan
          </h1>
        )}
      </div>

      {/* Menu Items - filtered by role */}
      <nav className={`flex flex-col w-full gap-1 flex-1 transition-all duration-300 ${collapsed ? 'px-2' : 'px-4'}`}>
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleMenuClick}
            className={({ isActive }) => {
              const baseClass = `
                flex items-center rounded-lg transition-all relative group
                ${collapsed ? 'justify-center p-3' : 'gap-3 p-3'}
              `
              const activeClass = isActive
                ? 'bg-[#2563eb] text-white'
                : 'hover:bg-gray-100 text-gray-700'
              return `${baseClass} ${activeClass}`
            }}
            title={collapsed ? item.name : undefined}
          >
            {({ isActive: linkActive }) => (
              <>
                <img 
                  alt={item.name} 
                  className="w-6 h-6 object-contain flex-shrink-0" 
                  src={item.icon}
                  style={{ 
                    filter: linkActive ? 'brightness(0) invert(1)' : 'brightness(0.6)',
                  }}
                />
                {!collapsed && (
                  <span className="text-sm font-medium transition-opacity duration-300 truncate">
                    {item.name}
                  </span>
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin Menu - Only show for admin users */}
        {isAdmin && (
          <NavLink
            to="/admin/users"
            onClick={handleMenuClick}
            className={({ isActive }) => {
              const baseClass = `
                flex items-center rounded-lg transition-all relative group
                ${collapsed ? 'justify-center p-3' : 'gap-3 p-3'}
              `
              const activeClass = isActive
                ? 'bg-[#2563eb] text-white'
                : 'hover:bg-gray-100 text-gray-700'
              return `${baseClass} ${activeClass}`
            }}
            title={collapsed ? 'Manajemen User' : undefined}
          >
            {({ isActive: linkActive }) => (
              <>
                <div 
                  className="w-6 h-6 flex-shrink-0" 
                  style={{ color: linkActive ? '#ffffff' : '#666666' }}
                >
                  <IconUsers />
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium transition-opacity duration-300 truncate">
                    Manajemen User
                  </span>
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Manajemen User
                  </div>
                )}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Logout Button */}
      <div className={`border-t border-gray-200 transition-all duration-300 ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        <button 
          onClick={() => {
            handleMenuClick()
            navigate('/login')
          }}
          className={`
            flex items-center rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white w-full relative group
            ${collapsed ? 'justify-center p-3' : 'gap-3 p-3'}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <img 
            alt="Logout" 
            className="w-6 h-6 object-contain flex-shrink-0" 
            src={imgLogout}
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          {!collapsed && (
            <span className="text-sm font-medium">Logout</span>
          )}
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func
}
