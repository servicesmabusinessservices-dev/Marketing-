import React, { createContext, useContext, useCallback, useRef, useState } from 'react';

const FeedbackContext = createContext({
  showFeedback: () => {}
});

const MAX_TOASTS = 3;
const TOAST_DURATION = 3600;

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showFeedback = useCallback((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => {
      const next = [...prev, { id, message, tone }];
      // Evict oldest if over max
      if (next.length > MAX_TOASTS) {
        const evicted = next[0];
        if (timersRef.current[evicted.id]) {
          clearTimeout(timersRef.current[evicted.id]);
          delete timersRef.current[evicted.id];
        }
        return next.slice(1);
      }
      return next;
    });
    timersRef.current[id] = setTimeout(() => removeToast(id), TOAST_DURATION);
  }, [removeToast]);

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <div className="app-feedback-stack" aria-live="polite" role="status">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-feedback app-feedback-${toast.tone}`}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => useContext(FeedbackContext);
