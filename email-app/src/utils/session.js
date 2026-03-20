const SESSION_KEYS = ['jwt_token', 'user_email'];

export const isDevelopmentBypassSession = () => localStorage.getItem('user_email') === 'dev@localhost';

export const hasSession = () => Boolean(localStorage.getItem('jwt_token'));

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const handleUnauthorized = (navigate, showFeedback) => {
  if (isDevelopmentBypassSession()) {
    if (showFeedback) {
      showFeedback('Google-backed inbox actions are unavailable in development bypass mode.', 'warning');
    }
    return;
  }

  clearSession();
  if (showFeedback) {
    showFeedback('Session expired. Please sign in again.', 'warning');
  }
  navigate('/', { replace: true });
};
