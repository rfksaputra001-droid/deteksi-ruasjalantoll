// API Configuration - REST Only (No WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

console.log('🔧 API Config:', { 
  API_BASE_URL, 
  env: import.meta.env.VITE_API_BASE_URL,
  mode: import.meta.env.MODE,
  origin: window.location.origin
});

// Enhanced fetch configuration for CORS and credentials
export const fetchConfig = {
  credentials: 'include', // Always include cookies for CORS
  mode: 'cors', // Explicitly set CORS mode
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
  }
};

// Enhanced API request helper with better CORS handling
export const apiRequest = async (url, options = {}) => {
  const config = {
    ...fetchConfig,
    ...options,
    headers: {
      ...fetchConfig.headers,
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    console.log('🔄 API Request:', { url, method: config.method || 'GET', origin: window.location.origin });
    
    const response = await fetch(url, config);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.warn('⚠️ Non-JSON response:', text);
      throw new Error(text || 'Server error - invalid response format');
    }

    if (!response.ok) {
      console.error('❌ API Error:', { status: response.status, data });
      
      // Handle token-related errors
      if (response.status === 401) {
        console.warn('🚫 401 Unauthorized - clearing auth and redirecting to login');
        console.warn('Response data:', data);
        
        // Clear local storage and dispatch event
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Dispatch custom event for token expiration
        window.dispatchEvent(new CustomEvent('tokenExpired'));
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
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
  PERHITUNGAN_REFERENSI: `${API_BASE_URL}/api/perhitungan/reference`,
  PERHITUNGAN_DETEKSI_AVAILABLE: `${API_BASE_URL}/api/perhitungan/available-detections`,
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
  
  // Debug token presence
  if (token) {
    console.log('🔑 Auth token found:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No authentication token found in localStorage');
  }
  
  return headers;
};

export default API_BASE_URL;
