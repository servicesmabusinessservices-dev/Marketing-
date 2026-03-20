import axios from 'axios';
import { API_BASE_URL } from '../config/authConfig';
import { isDevelopmentBypassSession } from '../utils/session';

/**
 * Centralized axios instance.
 *
 * Request interceptor  — attaches the JWT from localStorage on every call.
 * Response interceptor — on 401, clears the session and redirects to login
 *                        so every component gets automatic auth handling for free.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT ──────────────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Global 401 handler ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/' && !isDevelopmentBypassSession()) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_email');
      window.location.replace('/');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
