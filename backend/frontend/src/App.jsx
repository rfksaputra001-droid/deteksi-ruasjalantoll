import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
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

function ProtectedRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return <Layout>{children}</Layout>
}

// Route untuk Surveyor dan Admin (semua kecuali manage user)
function SurveyorRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  // Check if user is surveyor or admin
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'admin' && user.role !== 'surveyor') {
        // User biasa tidak bisa akses, redirect ke dashboard
        return <Navigate to="/dashboard" replace />
      }
    } catch (e) {
      return <Navigate to="/dashboard" replace />
    }
  } else {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Layout>{children}</Layout>
}

// Admin only route
function AdminRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  // Check if user is admin
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
      }
    } catch (e) {
      return <Navigate to="/dashboard" replace />
    }
  } else {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Layout>{children}</Layout>
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
    }
    setLoading(false)

    // Listen for storage changes (logout from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed, logout
        setIsLoggedIn(false)
      }
    }

    // Listen for token expiration events
    const handleTokenExpired = () => {
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
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <DeteksiProvider>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Route untuk semua role */}
        <Route path="/dashboard" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Dashboard onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/informasi" element={<ProtectedRoute isLoggedIn={isLoggedIn}><InformasiWebsite onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/petunjuk" element={<ProtectedRoute isLoggedIn={isLoggedIn}><PetunjukPenggunaan onLogout={handleLogout} /></ProtectedRoute>} />
        
        {/* Route untuk Surveyor & Admin */}
        <Route path="/deteksi" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Deteksi onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/perhitungan" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Perhitungan onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/histori" element={<SurveyorRoute isLoggedIn={isLoggedIn}><Histori onLogout={handleLogout} /></SurveyorRoute>} />
        <Route path="/histori/:id" element={<SurveyorRoute isLoggedIn={isLoggedIn}><HistoriDetail onLogout={handleLogout} /></SurveyorRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/users" element={<AdminRoute isLoggedIn={isLoggedIn}><ManajemenUser onLogout={handleLogout} /></AdminRoute>} />
      </Routes>
    </DeteksiProvider>
  )
}
