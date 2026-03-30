export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.warn('VITE_API_URL is not set — using default localhost URL which will not work in production.');
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
