const SESSION_KEYS = ['user_email'];

export const isDevelopmentBypassSession = () => localStorage.getItem('user_email') === 'dev@localhost';

/**
 * Session management - uses httpOnly cookie for authentication.
 * Check session by user_email presence (set after successful auth).
 * For definitive auth status, make an API call - cookie will be sent automatically.
 */
export const hasSession = () => Boolean(localStorage.getItem('user_email'));

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
  navigate('/connect', { replace: true });
};
