// API Configuration
// Always use the full backend URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Socket.IO URL (same as API base URL)  
export const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

console.log('🔧 API Config:', { 
  API_BASE_URL, 
  SOCKET_URL,
  env: import.meta.env.VITE_API_BASE_URL 
});

// Default fetch configuration for CORS and credentials
export const fetchConfig = {
  credentials: 'include', // Include cookies for CORS
  headers: {
    'Content-Type': 'application/json',
  }
};

// API request helper with proper CORS handling
export const apiRequest = async (url, options = {}) => {
  const config = {
    ...fetchConfig,
    ...options,
    headers: {
      ...fetchConfig.headers,
      ...options.headers,
    },
  };

  // Add Authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,

  // Detection endpoints
  UPLOAD_VIDEO: `${API_BASE_URL}/api/deteksi/upload`,
  DETECTION_LIST: `${API_BASE_URL}/api/deteksi/list`,
  DETECTION_RESULT: (id) => `${API_BASE_URL}/api/deteksi/result/${id}`,
  DETECTION_STATUS: (id) => `${API_BASE_URL}/api/deteksi/status/${id}`,
  DETECTION_VIDEO: (id) => `${API_BASE_URL}/api/deteksi/video/${id}`,
  DELETE_DETECTION: (id) => `${API_BASE_URL}/api/deteksi/${id}`,

  // History endpoints
  HISTORY_LIST: `${API_BASE_URL}/api/histori/list`,
  HISTORY_DETAIL: (id) => `${API_BASE_URL}/api/histori/detail/${id}`,

  // Dashboard endpoints
  DASHBOARD_STATS: `${API_BASE_URL}/api/dashboard`,

  // Perhitungan endpoints
  PERHITUNGAN_MANUAL: `${API_BASE_URL}/api/perhitungan/manual`,
  PERHITUNGAN_DARI_DETEKSI: (deteksiId) => `${API_BASE_URL}/api/perhitungan/deteksi/${deteksiId}`,
  PERHITUNGAN_SEDERHANA: (deteksiId) => `${API_BASE_URL}/api/perhitungan/sederhana/${deteksiId}`,
  PERHITUNGAN_SIMPLE_CONSTANTS: `${API_BASE_URL}/api/perhitungan/simple-constants`,
  PERHITUNGAN_LIST: `${API_BASE_URL}/api/perhitungan/list`,
  PERHITUNGAN_DETAIL: (id) => `${API_BASE_URL}/api/perhitungan/${id}`,
  PERHITUNGAN_REFERENSI: `${API_BASE_URL}/api/perhitungan/referensi`,
  PERHITUNGAN_DETEKSI_AVAILABLE: `${API_BASE_URL}/api/perhitungan/deteksi-available`,
  DELETE_PERHITUNGAN: (id) => `${API_BASE_URL}/api/perhitungan/${id}`,

  // Admin endpoints
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_USER_DETAIL: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
  ADMIN_CREATE_USER: `${API_BASE_URL}/api/admin/users`,
  ADMIN_UPDATE_USER: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
  ADMIN_DELETE_USER: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
  ADMIN_TOGGLE_USER: (id) => `${API_BASE_URL}/api/admin/users/${id}/toggle-status`,
  ADMIN_RESET_PASSWORD: (id) => `${API_BASE_URL}/api/admin/users/${id}/reset-password`,
};

// Default headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  // Only log when there's no token (debug missing token issues)
  if (!token) {
    console.warn('No authentication token found in localStorage');
  }
  
  return headers;
};

// API request helper
export const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      throw new Error(text || 'Server error - invalid response format');
    }

    if (!response.ok) {
      // Handle token-related errors
      if (response.status === 401) {
        if (data.code === 'TOKEN_INVALID' || data.code === 'TOKEN_MISSING' || data.code === 'TOKEN_MALFORMED') {
          // Clear local storage and dispatch event
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Dispatch custom event for token expiration
          window.dispatchEvent(new CustomEvent('tokenExpired'));
          
          // Redirect to login
          window.location.href = '/login';
          return;
        }
      }
      
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle both response formats: { success: true } and { status: 'success' }
    if (data.success === false || data.status === 'error') {
      throw new Error(data.message || 'API request failed');
    }

    // Normalize response to always have success: true
    return {
      ...data,
      success: data.success || data.status === 'success'
    };
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Koneksi ke server gagal. Periksa koneksi internet Anda.');
    }
    
    throw error;
  }
};

export default API_BASE_URL;
