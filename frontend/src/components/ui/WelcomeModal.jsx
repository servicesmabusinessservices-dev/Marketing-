import React from 'react';
import Icon from './Icon.jsx';
import './WelcomeModal.css';

const STORAGE_KEY = 'welcome_modal_dismissed';

export const shouldShowWelcomeModal = () => {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
};

export const resetWelcomeModal = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const WelcomeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose();
  };

  return (
    <div className="welcome-modal-overlay" onClick={handleDismiss}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="welcome-modal-close"
          onClick={handleDismiss}
          aria-label="Close welcome message"
        >
          <Icon name="x" size={20} />
        </button>

        <div className="welcome-modal-content">
          <div className="welcome-modal-header">
            <Icon name="sparkles" size={32} color="#38bdf8" />
            <h2>Welcome to Gmail Manager</h2>
          </div>

          <p className="welcome-modal-text">
            Manage multiple Gmail accounts, automate email workflows, and run compliant outreach 
            campaigns all in one place. Your dashboard provides real-time insights into your email 
            operations.
          </p>

          <div className="welcome-modal-features">
            <div className="welcome-feature">
              <Icon name="inbox" size={20} color="#10b981" />
              <span>Multi-account inbox control</span>
            </div>
            <div className="welcome-feature">
              <Icon name="zap" size={20} color="#f59e0b" />
              <span>Automated workflows</span>
            </div>
            <div className="welcome-feature">
              <Icon name="shield" size={20} color="#6366f1" />
              <span>Privacy-first approach</span>
            </div>
          </div>

          <button className="welcome-modal-button" onClick={handleDismiss}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;

