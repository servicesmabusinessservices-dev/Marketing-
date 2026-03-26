export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:5001/api/v1';

if (!process.env.REACT_APP_API_URL && process.env.NODE_ENV === 'production') {
  console.warn('REACT_APP_API_URL is not set — using default localhost URL which will not work in production.');
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
