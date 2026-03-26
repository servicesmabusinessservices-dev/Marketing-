export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:5001/api/v1';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
