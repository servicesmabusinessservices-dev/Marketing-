import React from 'react';

/**
 * @param {string}   [message]
 * @param {() => void} [onRetry]
 */
const ErrorState = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="empty-state empty-state-md">
    <p className="error-state-message">! {message}</p>
    {onRetry && (
      <button
        type="button"
        className="topbar-btn empty-state-action"
        onClick={onRetry}
      >
        Try again
      </button>
    )}
  </div>
);

export default ErrorState;
