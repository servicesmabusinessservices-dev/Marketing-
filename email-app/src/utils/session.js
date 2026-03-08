const SESSION_KEYS = ['jwt_token', 'user_email'];

export const hasSession = () => Boolean(localStorage.getItem('jwt_token'));

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const handleUnauthorized = (navigate, showFeedback) => {
  clearSession();
  if (showFeedback) {
    showFeedback('Session expired. Please sign in again.', 'warning');
  }
  navigate('/', { replace: true });
};
