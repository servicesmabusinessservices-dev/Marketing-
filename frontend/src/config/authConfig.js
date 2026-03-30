// API base URL for all frontend calls (include /api).
// Prefer build-time env var; fall back to the live Render API for safety.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://marketing-api-38a1.onrender.com/api';

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.warn('VITE_API_URL is not set — using https://marketing-api-38a1.onrender.com/api');
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
