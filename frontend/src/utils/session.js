const SESSION_KEYS = ['user_email', 'jwt_token'];

export const isDevelopmentBypassSession = () => localStorage.getItem('user_email') === 'dev@localhost';

/**
 * Session management - supports both authentication methods:
 * 1. GmailManager.Api (production): JWT in localStorage + Authorization header
 * 2. GmailManager.Auth (new): JWT in httpOnly cookie
 * 
 * Check session by user_email presence (set after successful auth).
 * For definitive auth status, make an API call - tokens will be sent automatically.
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
