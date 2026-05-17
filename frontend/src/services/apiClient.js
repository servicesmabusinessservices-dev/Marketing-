import axios from 'axios';
import { API_BASE_URL } from '../config/authConfig';

/**
 * Centralized axios instance.
 *
 * AUTH STRATEGY: JWT stored in localStorage, sent via Authorization: Bearer header.
 * 
 * We cannot use httpOnly cookies here because the frontend (mabusinessservices.com)
 * and backend (onrender.com) are on different domains. Modern browsers block
 * third-party cookies by default, so cross-domain cookie auth fails silently.
 * 
 * The JWT is stored in localStorage (set in AccountSelection on auth-success)
 * and attached as a Bearer token on every request via the request interceptor below.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false, // Not needed — using Authorization header instead
});

// ── Attach JWT from localStorage on every request ────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Global 401 handler + ApiResponse unwrap ─────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Auto-unwrap ApiResponse<T> envelope: { success, data, error, traceId } → data
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - only redirect if we're in an authenticated area
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isPublicRoute = ['/', '/connect', '/auth-success', '/auth-error', '/privacy', '/terms', '/security'].includes(currentPath);
      
      if (!isPublicRoute) {
        // Clear all auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');
        
        const errorMsg = error.response?.data?.error || 'Session expired. Please sign in again.';
        window.location.replace(`/connect?message=${encodeURIComponent(errorMsg)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
