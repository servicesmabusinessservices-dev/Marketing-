// API base URL for all frontend calls (include /api/v1).
// Prefer build-time env var; fall back to the live Render API for safety.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://marketing-api-38a1.onrender.com/api/v1';

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.warn('VITE_API_URL is not set — using https://marketing-api-38a1.onrender.com/api/v1');
}

/**
 * DEPRECATED: JWT is now in httpOnly cookie, sent automatically with requests.
 * This function is kept for backwards compatibility but should not be used.
 * Use apiClient from services/apiClient.js instead.
 */
export const getAuthHeaders = () => {
  console.warn('getAuthHeaders is deprecated - authentication now uses httpOnly cookies');
  return {
    'Content-Type': 'application/json',
  };
};
