import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeModal.css';

const CHECKLIST = [
  { key: 'account', label: 'Connect a Gmail account', route: '/' },
  { key: 'contact', label: 'Add your first contact', route: '/marketing' },
  { key: 'template', label: 'Create an email template', route: '/marketing' },
  { key: 'campaign', label: 'Send your first campaign', route: '/bulk-email' },
];

const WelcomeModal = ({ completedKeys = [], onDismiss }) => {
  const navigate = useNavigate();

  const handleGo = (route) => {
    onDismiss();
    navigate(route);
  };

  return (
    <div className="welcome-overlay" onClick={onDismiss}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="welcome-title">Welcome to Email Manager</h2>
        <p className="welcome-subtitle">Complete these steps to get started.</p>

        <ul className="welcome-checklist">
          {CHECKLIST.map((item) => {
            const done = completedKeys.includes(item.key);
            return (
              <li
                key={item.key}
                className={`welcome-checklist-item${done ? ' done' : ''}`}
                style={{ cursor: done ? 'default' : 'pointer' }}
                onClick={() => !done && handleGo(item.route)}
              >
                <span className="welcome-check-icon">{done ? '✓' : ''}</span>
                {item.label}
              </li>
            );
          })}
        </ul>

        <div className="welcome-actions">
          <button type="button" className="topbar-btn" onClick={onDismiss}>
            Skip for now
          </button>
          <button type="button" className="topbar-btn primary" onClick={() => handleGo(CHECKLIST.find(c => !completedKeys.includes(c.key))?.route || '/')}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
