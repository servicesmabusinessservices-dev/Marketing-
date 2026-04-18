import axios from 'axios';
import { API_BASE_URL } from '../config/authConfig';
import { isDevelopmentBypassSession } from '../utils/session';

/**
 * Centralized axios instance.
 *
 * SECURITY: Supports both JWT authentication methods:
 * - httpOnly cookies (preferred, GmailManager.Auth): withCredentials sends automatically
 * - Authorization header (fallback, GmailManager.Api): reads from localStorage
 * 
 * Response interceptor — on 401, redirects to login
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies with every request
});

// ── Request interceptor: Add JWT from localStorage if available ──────────────
apiClient.interceptors.request.use(
  (config) => {
    // Check if JWT token exists in localStorage (used by GmailManager.Api)
    const token = localStorage.getItem('jwt_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
    if (error.response?.status === 401 && !isDevelopmentBypassSession()) {
      const currentPath = window.location.pathname;
      const isPublicRoute = ['/', '/connect', '/auth-success', '/auth-error', '/privacy', '/terms', '/security'].includes(currentPath);
      
      // Only redirect if we're in a protected area
      if (!isPublicRoute) {
        // Clear authentication data
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_email');
        
        // Redirect to connect page with a message
        const errorMsg = error.response?.data?.error || 'Session expired';
        window.location.replace(`/connect?message=${encodeURIComponent(errorMsg)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
