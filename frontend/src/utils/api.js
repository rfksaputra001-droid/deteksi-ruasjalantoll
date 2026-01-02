/**
 * Enhanced API Utility with Retry Logic and Better Error Handling
 * Production-ready API client for React application
 */

// API Configuration with enhanced CORS handling
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Socket.IO URL - use same protocol as API base URL
export const SOCKET_URL = (() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  return baseUrl; // Socket.IO client will handle the protocol conversion
})();

console.log('🔧 API Config:', { 
  API_BASE_URL, 
  SOCKET_URL,
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

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

// Sleep utility for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
const isRetryableError = (error, response) => {
  // Network errors (no response)
  if (!response) return true;
  
  // HTTP status codes that should be retried
  if (RETRY_CONFIG.retryableStatuses.includes(response.status)) return true;
  
  // Connection/timeout errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
  
  return false;
};

// Enhanced API request with retry logic and comprehensive error handling
export const apiRequest = async (url, options = {}, retryCount = 0) => {
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
    console.log(`🔄 API Request (attempt ${retryCount + 1}):`, { 
      url, 
      method: config.method || 'GET', 
      hasAuth: !!config.headers.Authorization,
      origin: window.location.origin 
    });
    
    const response = await fetch(url, config);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.warn('⚠️ Non-JSON response:', { 
        status: response.status, 
        contentType,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : '')
      });
      
      // For error responses with HTML content (like 404/500 pages)
      if (!response.ok) {
        if (isRetryableError(null, response) && retryCount < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
          console.log(`🔄 Retrying in ${delay}ms due to server error...`);
          await sleep(delay);
          return apiRequest(url, options, retryCount + 1);
        }
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
      
      throw new Error('Server returned non-JSON response');
    }

    if (!response.ok) {
      console.error('❌ API Error:', { 
        status: response.status, 
        url, 
        data,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Handle authentication errors with detailed logging
      if (response.status === 401) {
        console.error('🚫 Authentication failed:', {
          url,
          hasToken: !!localStorage.getItem('token'),
          authHeader: config.headers.Authorization ? 'Present' : 'Missing',
          errorCode: data.code,
          message: data.message
        });
        
        // Handle token-related errors
        if (data.code === 'TOKEN_INVALID' || data.code === 'TOKEN_MISSING' || data.code === 'TOKEN_MALFORMED') {
          handleTokenExpiration(data.code, data.message);
          return; // Don't retry auth errors
        }
      }
      
      // Retry logic for server errors
      if (isRetryableError(null, response) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
        console.log(`🔄 Retrying API request in ${delay}ms (${retryCount + 1}/${RETRY_CONFIG.maxRetries})...`);
        await sleep(delay);
        return apiRequest(url, options, retryCount + 1);
      }
      
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Success response
    console.log('✅ API Success:', { 
      url, 
      method: config.method || 'GET',
      status: response.status 
    });

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
    console.error('🚨 API Request Error:', {
      url,
      error: error.message,
      retryCount,
      isRetryable: isRetryableError(error, null)
    });
    
    // Retry logic for network errors
    if (isRetryableError(error, null) && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
      console.log(`🔄 Network error, retrying in ${delay}ms (${retryCount + 1}/${RETRY_CONFIG.maxRetries})...`);
      await sleep(delay);
      return apiRequest(url, options, retryCount + 1);
    }
    
    // Handle network errors with user-friendly messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.');
    }
    
    throw error;
  }
};

// Handle token expiration with enhanced logging
const handleTokenExpiration = (code, message) => {
  console.log('🗑️ Clearing expired/invalid token:', { code, message });
  
  // Clear local storage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Dispatch custom event for token expiration
  window.dispatchEvent(new CustomEvent('tokenExpired', {
    detail: { reason: code, message }
  }));
  
  // Redirect to login with delay to allow event handlers to run
  setTimeout(() => {
    console.log('➡️ Redirecting to login page...');
    window.location.href = '/login';
  }, 100);
};

// API Endpoints configuration
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  CREATE_TEST_USER: `${API_BASE_URL}/api/auth/create-test-user`,

  // Detection endpoints
  UPLOAD_VIDEO: `${API_BASE_URL}/api/deteksi/upload`,
  DETECTION_LIST: `${API_BASE_URL}/api/deteksi/list`,
  DETECTION_RESULT: (id) => `${API_BASE_URL}/api/deteksi/result/${id}`,
  DETECTION_STATUS: (id) => `${API_BASE_URL}/api/deteksi/status/${id}`,
  DETECTION_VIDEO: (id) => `${API_BASE_URL}/api/deteksi/video/${id}`,
  DETECTION_DELETE: (id) => `${API_BASE_URL}/api/deteksi/${id}`,

  // Dashboard endpoints
  DASHBOARD_STATS: `${API_BASE_URL}/api/dashboard/stats`,
  DASHBOARD_RECENT: `${API_BASE_URL}/api/dashboard/recent`,

  // Perhitungan endpoints
  PERHITUNGAN_LIST: `${API_BASE_URL}/api/perhitungan/list`,
  PERHITUNGAN_CREATE: `${API_BASE_URL}/api/perhitungan/create`,
  PERHITUNGAN_REFERENSI: `${API_BASE_URL}/api/perhitungan/referensi`,

  // History endpoints
  HISTORI_LIST: `${API_BASE_URL}/api/histori/list`,
  HISTORI_DETAIL: (id) => `${API_BASE_URL}/api/histori/${id}`,

  // Admin endpoints
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_USER_DELETE: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
  ADMIN_USER_TOGGLE: (id) => `${API_BASE_URL}/api/admin/users/${id}/toggle`,
  ADMIN_RESET_PASSWORD: (id) => `${API_BASE_URL}/api/admin/users/${id}/reset-password`,

  // System endpoints
  HEALTH: `${API_BASE_URL}/health`,
  BACKEND_STATUS: `${API_BASE_URL}/backend-status`,
  CORS_TEST: `${API_BASE_URL}/cors-test`,
};

// Enhanced auth headers with token validation
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('⚠️ No authentication token found - user may need to login');
  }
  
  return headers;
};

// Token validation utility
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Simple JWT payload extraction (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    
    if (isExpired) {
      console.warn('⏰ Token has expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return false;
  }
};

// Utility to get user info from token
export const getUserFromToken = () => {
  const user = localStorage.getItem('user');
  if (!user) return null;
  
  try {
    return JSON.parse(user);
  } catch (error) {
    console.error('❌ Error parsing user data:', error);
    return null;
  }
};

export default API_BASE_URL;