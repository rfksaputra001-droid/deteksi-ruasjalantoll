import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { PageLoading } from './components/UI/Loading'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Deteksi from './pages/Deteksi'
import Perhitungan from './pages/Perhitungan'
import Histori from './pages/Histori'
import HistoriDetail from './pages/HistoriDetail'
import InformasiWebsite from './pages/InformasiWebsite'
import PetunjukPenggunaan from './pages/PetunjukPenggunaan'
import ManajemenUser from './pages/ManajemenUser'
import { DeteksiProvider } from './context/DeteksiContext'
import { isTokenValid, getUserFromToken } from './utils/api'

// Helper function to get user role
function getUserRole() {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return user.role || 'user'
    } catch (e) {
      return 'user'
    }
  }
  return 'user'
}

function ProtectedRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return <Layout>{children}</Layout>
}

// Admin only route - untuk manajemen user
function AdminRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  const role = getUserRole()
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Layout>{children}</Layout>
}

// Surveyor route - untuk deteksi, perhitungan, histori (admin dan surveyor bisa akses)
function SurveyorRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  const role = getUserRole()
  // Only admin and surveyor can access
  if (role !== 'admin' && role !== 'surveyor') {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Layout>{children}</Layout>
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    console.log('🚀 App initializing...')
    
    // Check authentication status
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token')
      const userData = getUserFromToken()
      
      if (token && isTokenValid() && userData) {
        console.log('✅ Valid token found, user logged in:', userData.email)
        setIsLoggedIn(true)
        setUser(userData)
      } else {
        console.log('❌ No valid token found, user not logged in')
        setIsLoggedIn(false)
        setUser(null)
        
        // Clear invalid tokens
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    
    checkAuthStatus()
    setLoading(false)

    // Listen for storage changes (logout from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          // Token was removed, logout
          console.log('🗑️ Token removed in another tab, logging out...')
          setIsLoggedIn(false)
          setUser(null)
        } else {
          // Token was added, login
          checkAuthStatus()
        }
      }
    }

    // Listen for token expiration events
    const handleTokenExpired = (event) => {
      console.log('⏰ Token expired event received:', event.detail)
      handleLogout()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('tokenExpired', handleTokenExpired)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('tokenExpired', handleTokenExpired)
    }
  }, [])

  const handleLogin = () => {
    console.log('✅ User logged in successfully')
    const userData = getUserFromToken()
    setIsLoggedIn(true)
    setUser(userData)
  }

  const handleLogout = () => {
    console.log('💪 Logging out user...')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    setUser(null)
  }

  if (loading) {
    return <PageLoading message="Memuat aplikasi..." />
  }

  return (
    <ErrorBoundary>
      <DeteksiProvider>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard - semua role bisa akses */}
        <Route path="/dashboard" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Dashboard onLogout={handleLogout} /></ProtectedRoute>} />
        
        {/* Surveyor & Admin routes - untuk deteksi, perhitungan, histori */}
        <Route path="/deteksi" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Deteksi onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/perhitungan" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Perhitungan onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/histori" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Histori onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/histori/:id" element={<SurveyorRoute isLoggedIn={isLoggedIn}><HistoriDetail onLogout={handleLogout} /></SurveyorRoute>} />
        
        {/* Info routes - semua role bisa akses */}
        <Route path="/informasi" element={<ProtectedRoute isLoggedIn={isLoggedIn}><InformasiWebsite onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/petunjuk" element={<ProtectedRoute isLoggedIn={isLoggedIn}><PetunjukPenggunaan onLogout={handleLogout} /></ProtectedRoute>} />
        
        {/* Admin Routes - hanya admin */}
        <Route path="/admin/users" element={<AdminRoute isLoggedIn={isLoggedIn}><ManajemenUser onLogout={handleLogout} /></AdminRoute>} />
      </Routes>
    </DeteksiProvider>
    </ErrorBoundary>
  )
}
