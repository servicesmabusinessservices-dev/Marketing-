import axios from 'axios';
import { API_BASE_URL } from '../config/authConfig';
import { isDevelopmentBypassSession } from '../utils/session';

/**
 * Centralized axios instance.
 *
 * SECURITY: Uses httpOnly cookies for JWT (not localStorage)
 * - withCredentials: true sends cookies automatically
 * - No manual Authorization header needed
 * 
 * Response interceptor — on 401, redirects to login
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // SECURITY: Send httpOnly cookies with every request
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
    // SECURITY FIX: Redirect to /connect (not /) on 401 for better UX
    if (error.response?.status === 401 && window.location.pathname !== '/connect' && !isDevelopmentBypassSession()) {
      // Clear any legacy localStorage tokens
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_email');
      window.location.replace('/connect');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
