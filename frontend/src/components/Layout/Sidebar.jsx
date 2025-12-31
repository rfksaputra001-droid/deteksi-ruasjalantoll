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
// roles: 'all' = semua role, 'surveyor' = surveyor & admin, 'admin' = admin only
const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: imgDashboard, roles: 'all' },
  { name: 'Deteksi', path: '/deteksi', icon: imgDeteksi, roles: 'surveyor' },
  { name: 'Perhitungan', path: '/perhitungan', icon: imgPerhitungan, roles: 'surveyor' },
  { name: 'Histori', path: '/histori', icon: imgHistori, roles: 'surveyor' },
  { name: 'Informasi Website', path: '/informasi', icon: imgInformasi, roles: 'all' },
  { name: 'Petunjuk', path: '/petunjuk', icon: imgPetunjuk, roles: 'all' },
]

export default function Sidebar() {
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

  return (
    <div className="bg-white flex flex-col items-center w-[320px] h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Brand */}
      <div className="flex gap-2 items-center justify-center px-8 py-4 w-full shrink-0">
        <div className="relative w-[35px] h-[35px]">
          <img alt="Logo PKTJ" className="w-full h-full object-cover" src={imgLogoPktjSmall} />
        </div>
        <h1 className="text-black font-semibold whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2', fontSize: '20px' }}>
          Kinerja Ruas Jalan
        </h1>
      </div>

      {/* Menu Items - filtered by role */}
      <nav className="flex flex-col items-center p-6 w-full gap-0">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => {
              const baseClass = 'flex gap-2 items-center p-4 rounded-lg w-[240px] transition-all'
              const activeClass = isActive
                ? 'bg-[#2563eb]'
                : 'hover:bg-gray-100'
              return `${baseClass} ${activeClass}`
            }}
            style={({ isActive }) => ({
              fontFamily: 'Poppins, sans-serif', 
              fontWeight: 500, 
              lineHeight: '1.4', 
              fontSize: '16px',
              color: isActive ? '#ffffff' : '#000000',
            })}
          >
            {({ isActive: linkActive }) => (
              <>
                <img 
                  alt={item.name} 
                  className="w-6 h-6 object-contain" 
                  src={item.icon}
                  style={{ 
                    filter: linkActive ? 'brightness(0) invert(1)' : 'brightness(0.6)',
                  }}
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Admin Menu - Only show for admin users */}
        {isAdmin && (
          <NavLink
            to="/admin/users"
            className={({ isActive }) => {
              const baseClass = 'flex gap-2 items-center p-4 rounded-lg w-[240px] transition-all'
              const activeClass = isActive
                ? 'bg-[#2563eb]'
                : 'hover:bg-gray-100'
              return `${baseClass} ${activeClass}`
            }}
            style={({ isActive }) => ({
              fontFamily: 'Poppins, sans-serif', 
              fontWeight: 500, 
              lineHeight: '1.4', 
              fontSize: '16px',
              color: isActive ? '#ffffff' : '#000000',
            })}
          >
            {({ isActive: linkActive }) => (
              <>
                <div 
                  className="w-6 h-6" 
                  style={{ color: linkActive ? '#ffffff' : '#666666' }}
                >
                  <IconUsers />
                </div>
                <span>Manajemen User</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Logout Button */}
      <div className="flex flex-col items-center p-6 w-full mt-auto border-t border-gray-200 shrink-0">
        <button 
          onClick={() => navigate('/login')}
          className="flex gap-2 items-center p-4 rounded-lg w-[240px] transition-all text-white"
          style={{ 
            fontFamily: 'Poppins, sans-serif', 
            fontWeight: 500, 
            lineHeight: '1.4', 
            fontSize: '16px',
            backgroundColor: '#dc2626',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#991b1b')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
        >
          <img 
            alt="Logout" 
            className="w-6 h-6 object-contain" 
            src={imgLogout}
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
