import PropTypes from 'prop-types'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, apiRequest } from '../config/api'

// Original logo from public folder
const LogoIcon = () => (
  <img 
    src="/logopktj-removebg-preview.png" 
    alt="Logo PKTJ" 
    className="w-full h-full object-contain"
  />
)

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const PasswordIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="16" r="1" fill="currentColor"/>
    <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [buttonHover, setButtonHover] = useState(false)
  const [adminHover, setAdminHover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Debug function to test token
  const testToken = async () => {
    const token = localStorage.getItem('token')
    console.log('🧪 Testing token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
    
    if (!token) {
      console.warn('❌ No token to test')
      return
    }
    
    try {
      const response = await apiRequest(API_ENDPOINTS.DETECTION_LIST)
      console.log('✅ Token test result:', response)
    } catch (error) {
      console.error('❌ Token test error:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      console.log('Attempting login with:', { email })
      console.log('API endpoint:', API_ENDPOINTS.LOGIN)
      
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailUser: email,
          passwordUser: password
        }),
      })

      console.log('Login response status:', response.status)
      console.log('Login response headers:', response.headers)

      const data = await response.json()
      console.log('Login response data:', data)

      if (response.ok && (data.status === 'success' || data.success)) {
        // Store token and user data
        if (data.data && data.data.token) {
          localStorage.setItem('token', data.data.token)
          localStorage.setItem('user', JSON.stringify(data.data.user))
          
          console.log('✅ Login successful! Token stored:', data.data.token.substring(0, 20) + '...')
          console.log('✅ User stored:', data.data.user)
          
          // Test token immediately
          await testToken()
          
          // Call onLogin to update App state
          onLogin()
          
          // Force navigate to dashboard
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 100)
        } else {
          console.error('❌ Login response missing token:', data)
          throw new Error('Login berhasil tapi token tidak ditemukan dalam response')
        }
      } else {
        console.error('❌ Login failed:', { status: response.status, data })
        setError(data.message || data.detail?.message || `API Error: ${response.status} - ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      setError(error.message || 'Login gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#f7f7f7] relative w-full min-h-screen overflow-auto">
      {/* Mobile: Stacked layout, Tablet+: Side by side */}
      <div className="flex flex-col sm:flex-row min-h-screen w-full">
        {/* Left Section - Blue Gradient */}
        <div className="bg-gradient-to-r from-[#2563eb] to-[#1e3a8a] flex w-full sm:w-[45%] md:w-1/2 flex-col justify-between items-center text-white p-6 sm:p-6 md:p-8 lg:p-14 min-h-[35vh] sm:min-h-screen">
          {/* Main Content */}
          <div className="flex flex-col w-full items-start">
            {/* Brand */}
            <div className="flex gap-2 md:gap-4 items-center w-full pb-2">
              <div className="shrink-0 w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-[61px] lg:h-[61px]">
                <LogoIcon />
              </div>
              <h1 className="text-white font-bold text-lg sm:text-base md:text-xl lg:text-[32px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                KINERJA RUAS JALAN
              </h1>
            </div>

            {/* Title Section */}
            <div className="flex flex-col w-full gap-2 md:gap-6 pt-4 sm:pt-8 md:pt-12 lg:pt-[72px] pb-2 md:pb-8">
              <h2 className="text-white font-bold text-base sm:text-base md:text-xl lg:text-[32px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                Cerdas Hitung Kendaraan<br/>pada Jalan Tol
              </h2>
              <p className="text-white font-medium text-sm sm:text-xs md:text-sm lg:text-base hidden sm:block" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                Sistem Perhitungan untuk memantau jumlah kendaraan secara otomatis dan akurat.
              </p>
            </div>

            {/* Stats - Hidden on mobile */}
            <div className="hidden sm:flex flex-row flex-wrap gap-4 md:gap-8 lg:gap-[96px] pt-4 md:pt-8 pb-4 md:pb-8 w-full">
              <div className="flex flex-col">
                <p className="text-white font-bold text-base md:text-xl lg:text-[32px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                  YOLO V8
                </p>
                <p className="text-white font-medium text-xs md:text-sm lg:text-base" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                  Teknologi Mutakhir
                </p>
              </div>
              <div className="flex flex-col">
                <p className="text-white font-bold text-base md:text-xl lg:text-[32px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                  99%
                </p>
                <p className="text-white font-medium text-xs md:text-sm lg:text-base" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                  Uptime
                </p>
              </div>
              <div className="flex flex-col">
                <p className="text-white font-bold text-base md:text-xl lg:text-[32px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
                  90%
                </p>
                <p className="text-white font-medium text-xs md:text-sm lg:text-base" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                  Accurate
                </p>
              </div>
            </div>
          </div>

          {/* Footer - Hidden on mobile */}
          <div className="hidden sm:flex w-full pt-6 md:pt-8 lg:pt-14 pb-2">
            <p className="text-white text-[10px] md:text-xs lg:text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4', maxWidth: '560px' }}>
              © 2025 Politeknik Keselamatan Transportasi Jalan. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="bg-[#f7f7f7] flex w-full sm:w-[55%] md:w-1/2 flex-col items-center justify-center p-6 sm:p-6 md:p-8 lg:p-14 min-h-[65vh] sm:min-h-screen">
          {/* Login Card */}
          <div className="bg-white rounded-[16px] md:rounded-[24px] flex flex-col items-center w-full max-w-[456px] p-6 md:p-8 lg:p-10" style={{ boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div className="flex flex-col gap-2 items-center text-center w-full pb-2">
              <h2 className="text-black font-semibold text-lg md:text-xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, lineHeight: '1.2' }}>
                Selamat Datang!
              </h2>
              <p className="text-black text-sm md:text-base" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4' }}>
                Masuk ke akun Anda untuk melanjutkan
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col w-full gap-2 pt-2">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-2">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="flex flex-col w-full gap-2 pb-2">
                <label className="text-black font-medium text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                  Email
                </label>
                <div 
                  className="bg-white border-2 rounded-[8px] flex items-center relative w-full gap-3 md:gap-4 p-3 md:p-4" 
                  style={{ 
                    boxShadow: '0px 2px 2px 0px rgba(0,0,0,0.15)',
                    borderColor: emailFocused ? '#2563eb' : '#f7f7f7',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <EmailIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="flex-1 bg-transparent text-black outline-none text-sm md:text-base"
                    style={{ 
                      fontFamily: 'Poppins, sans-serif', 
                      fontWeight: 400, 
                      lineHeight: '1.4', 
                      color: email ? '#000' : '#8a8a8a' 
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col w-full gap-2 pb-2">
                <label className="text-black font-medium text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, lineHeight: '1.4' }}>
                  Password
                </label>
                <div 
                  className="bg-white border-2 rounded-[8px] flex items-center relative w-full gap-3 md:gap-4 p-3 md:p-4"
                  style={{ 
                    boxShadow: '0px 2px 2px 0px rgba(0,0,0,0.15)',
                    borderColor: passwordFocused ? '#2563eb' : '#f7f7f7',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <PasswordIcon />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent text-black outline-none text-sm md:text-base"
                    style={{ 
                      fontFamily: 'Poppins, sans-serif', 
                      fontWeight: 400, 
                      lineHeight: '1.4', 
                      color: password ? '#000' : '#8a8a8a' 
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="text-white text-center rounded-[8px] w-full border-0 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed p-3 md:p-4 mt-2 text-sm md:text-base"
                style={{ 
                  fontFamily: 'Poppins, sans-serif', 
                  fontWeight: 500, 
                  lineHeight: '1.4', 
                  boxShadow: '0px 3px 3px 0px rgba(0,0,0,0.2)',
                  backgroundColor: buttonHover && !loading ? '#1d4ed8' : '#2563eb',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>

            {/* Footer Section */}
            <div className="flex flex-wrap gap-2 items-center justify-center w-full pt-4 mt-2 min-h-[32px] text-sm">
              <span className="text-black whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4' }}>
                Belum punya akun?
              </span>
              <span className="text-black whitespace-nowrap hidden sm:inline" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4' }}>
                Lupa password?
              </span>
              <a 
                href="https://wa.me/6285711227150" 
                className="flex gap-1 items-center" 
                style={{ textDecoration: adminHover ? 'underline' : 'none', transition: 'text-decoration 0.3s ease', cursor: 'pointer' }}
                onMouseEnter={() => setAdminHover(true)}
                onMouseLeave={() => setAdminHover(false)}
              >
                <span className="font-regular whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, lineHeight: '1.4', color: '#10b981' }}>
                  Hubungi Admin
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Mobile footer */}
          <p className="sm:hidden text-center text-gray-500 text-xs mt-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            © 2025 PKTJ. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
}

