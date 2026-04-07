const SESSION_KEYS = ['user_email'];

export const isDevelopmentBypassSession = () => localStorage.getItem('user_email') === 'dev@localhost';

/**
 * SECURITY: JWT is now in httpOnly cookie, not localStorage.
 * Check session by user_email presence (set after successful auth).
 * For definitive auth status, make an API call - cookies will be sent automatically.
 */
export const hasSession = () => Boolean(localStorage.getItem('user_email'));

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
  // Clear legacy JWT if it exists
  localStorage.removeItem('jwt_token');
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
  navigate('/connect', { replace: true });
};
