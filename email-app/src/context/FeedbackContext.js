import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const FeedbackContext = createContext({
  showFeedback: () => {}
});

export const FeedbackProvider = ({ children }) => {
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);

  const showFeedback = (message, tone = 'info') => {
    setFeedback({ message, tone, id: Date.now() });
  };

  useEffect(() => {
    if (!feedback) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3600);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [feedback]);

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      {feedback && (
        <div className={`app-feedback app-feedback-${feedback.tone}`} role="status" aria-live="polite">
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => useContext(FeedbackContext);
