import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Card from '../components/UI/Card'
import Table from '../components/UI/Table'
import { API_ENDPOINTS, apiRequest } from '../config/api'

// Icons
const IconUserAdd = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconKey = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function ManajemenUser({ onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    namaUser: '',
    emailUser: '',
    passwordUser: '',
    role: 'user',
    phoneNumber: ''
  })
  
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [currentPage])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiRequest(`${API_ENDPOINTS.ADMIN_USERS}?page=${currentPage}&limit=10`)
      if (response.success || response.status === 'success') {
        setUsers(response.data.users || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalUsers(response.data.pagination?.totalUsers || 0)
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data user')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.namaUser || !formData.emailUser || !formData.passwordUser) {
      setError('Nama, email, dan password wajib diisi')
      return
    }

    if (formData.passwordUser.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setSubmitting(true)
    try {
      console.log('Adding user with data:', formData)
      const response = await apiRequest(API_ENDPOINTS.ADMIN_CREATE_USER, {
        method: 'POST',
        body: JSON.stringify({
          namaUser: formData.namaUser,
          emailUser: formData.emailUser,
          passwordUser: formData.passwordUser,
          role: formData.role || 'user',
          phoneNumber: formData.phoneNumber || ''
        })
      })
      console.log('Add user response:', response)

      if (response.success || response.status === 'success') {
        setSuccess('User berhasil ditambahkan!')
        setShowAddModal(false)
        setFormData({ namaUser: '', emailUser: '', passwordUser: '', role: 'user', phoneNumber: '' })
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Add user error:', err)
      setError(err.message || 'Gagal menambahkan user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_UPDATE_USER(selectedUser._id), {
        method: 'PUT',
        body: JSON.stringify({
          namaUser: formData.namaUser,
          emailUser: formData.emailUser,
          role: formData.role,
          phoneNumber: formData.phoneNumber
        })
      })

      if (response.success || response.status === 'success') {
        setSuccess('User berhasil diupdate!')
        setShowEditModal(false)
        setSelectedUser(null)
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal mengupdate user')
    }
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus user "${user.namaUser}"?`)) return

    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_DELETE_USER(user._id), {
        method: 'DELETE'
      })

      if (response.success || response.status === 'success') {
        setSuccess('User berhasil dihapus!')
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus user')
    }
  }

  const handleToggleStatus = async (user) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_TOGGLE_USER(user._id), {
        method: 'PATCH'
      })

      if (response.success || response.status === 'success') {
        setSuccess(`Status user berhasil diubah!`)
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal mengubah status user')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_RESET_PASSWORD(selectedUser._id), {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      })

      if (response.success || response.status === 'success') {
        setSuccess('Password berhasil direset!')
        setShowResetModal(false)
        setSelectedUser(null)
        setNewPassword('')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal mereset password')
    }
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      namaUser: user.namaUser,
      emailUser: user.emailUser,
      passwordUser: '',
      role: user.role,
      phoneNumber: user.phoneNumber || ''
    })
    setShowEditModal(true)
  }

  const openResetModal = (user) => {
    setSelectedUser(user)
    setNewPassword('')
    setShowResetModal(true)
  }

  const columns = [
    { key: 'no', label: 'No' },
    { key: 'namaUser', label: 'Nama' },
    { key: 'emailUser', label: 'Email' },
    { 
      key: 'role', 
      label: 'Role',
      render: (role) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {role === 'admin' ? '👑 Admin' : '👤 User'}
        </span>
      )
    },
    { 
      key: 'isActive', 
      label: 'Status',
      render: (isActive) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isActive ? '✓ Aktif' : '✗ Nonaktif'}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Terdaftar',
      render: (date) => new Date(date).toLocaleDateString('id-ID')
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, user) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(user)}
            className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
            title="Edit User"
          >
            <IconEdit />
          </button>
          <button
            onClick={() => openResetModal(user)}
            className="p-1.5 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition-colors"
            title="Reset Password"
          >
            <IconKey />
          </button>
          <button
            onClick={() => handleToggleStatus(user)}
            className={`p-1.5 rounded transition-colors ${
              user.isActive 
                ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
          >
            {user.isActive ? '🚫' : '✓'}
          </button>
          {user.role !== 'admin' && (
            <button
              onClick={() => handleDeleteUser(user)}
              className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
              title="Hapus User"
            >
              <IconTrash />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 font-medium">{success}</p>
        </div>
      )}

      {/* Header */}
      <Card className="!p-0">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">👥 Manajemen User</h2>
            <p className="text-gray-500 text-sm mt-1">Total: {totalUsers} user terdaftar</p>
          </div>
          <button
            onClick={() => {
              setFormData({ namaUser: '', emailUser: '', passwordUser: '', role: 'user', phoneNumber: '' })
              setShowAddModal(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <IconUserAdd />
            Tambah User
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Belum ada user terdaftar</p>
          ) : (
            <>
              <Table 
                columns={columns} 
                data={users.map((user, idx) => ({ ...user, no: (currentPage - 1) * 10 + idx + 1 }))} 
              />

              {/* Pagination */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Tambah User Baru</h3>
            
            {/* Error in modal */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.namaUser}
                  onChange={(e) => setFormData({ ...formData, namaUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Masukkan nama lengkap"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.emailUser}
                  onChange={(e) => setFormData({ ...formData, emailUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="email@example.com"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.passwordUser}
                  onChange={(e) => setFormData({ ...formData, passwordUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">No. Telepon</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="08xxxxxxxxxx"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={submitting}
                >
                  <option value="user">👤 User (Dashboard only)</option>
                  <option value="surveyor">📋 Surveyor (Deteksi, Perhitungan, Histori)</option>
                  <option value="admin">👑 Admin (Full Access)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setError(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    'Tambah User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.namaUser}
                  onChange={(e) => setFormData({ ...formData, namaUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.emailUser}
                  onChange={(e) => setFormData({ ...formData, emailUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">No. Telepon</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="user">👤 User (Dashboard only)</option>
                  <option value="surveyor">📋 Surveyor (Deteksi, Perhitungan, Histori)</option>
                  <option value="admin">👑 Admin (Full Access)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🔑 Reset Password</h3>
            <p className="text-gray-500 text-sm mb-4">Reset password untuk: <strong>{selectedUser.namaUser}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password Baru *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setSelectedUser(null); setNewPassword(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          ℹ️ Panduan Manajemen User
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Tambah User:</strong> Buat akun baru untuk pengguna sistem</li>
          <li><strong>Edit:</strong> Ubah informasi user (nama, email, role)</li>
          <li><strong>Reset Password:</strong> Atur ulang password jika user lupa</li>
          <li><strong>Nonaktifkan:</strong> User tidak bisa login tapi data tetap ada</li>
          <li><strong>Hapus:</strong> Menghapus user secara permanen (tidak bisa untuk admin)</li>
        </ul>
      </Card>
    </div>
  )
}

ManajemenUser.propTypes = {
  onLogout: PropTypes.func.isRequired,
}
