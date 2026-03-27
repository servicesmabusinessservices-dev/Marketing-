import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import './WelcomeModal.css';

const STORAGE_KEY = 'welcome_screen_completed';

const FEATURES = [
  {
    id: 'email',
    icon: 'inbox',
    title: 'Multi-Account Email',
    description: 'Connect and manage multiple Gmail accounts seamlessly.'
  },
  {
    id: 'pipeline',
    icon: 'pipeline',
    title: 'Visual Pipeline',
    description: 'Drag-and-drop deals through customizable stages.'
  },
  {
    id: 'bulk',
    icon: 'bulk',
    title: 'Bulk Email Campaigns',
    description: 'Send personalized bulk emails with smart segmentation.'
  },
  {
    id: 'marketing',
    icon: 'campaign',
    title: 'Marketing Automation',
    description: 'Create automated customer journeys with triggers.'
  },
  {
    id: 'contacts',
    icon: 'users',
    title: 'Contact Management',
    description: 'Organize contacts with tags and activity tracking.'
  },
  {
    id: 'analytics',
    icon: 'bar',
    title: 'Advanced Analytics',
    description: 'Monitor campaign performance with comprehensive reports.'
  }
];

const WelcomeModal = ({ completedKeys = [], onDismiss }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleGetStarted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    const nextRoute = '/dashboard';
    navigate(nextRoute);
    onDismiss?.();
  }, [navigate, onDismiss]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  }, [handleDismiss]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isVisible, handleKeyDown]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleDismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <motion.div
            className="welcome-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Skip Button */}
            <button
              type="button"
              className="welcome-skip-btn"
              onClick={handleDismiss}
              aria-label="Skip welcome screen"
            >
              <span>Skip</span>
              <Icon name="close" size={16} />
            </button>

            <div className="welcome-content">
              {/* Branding */}
              <motion.div
                className="welcome-branding"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="welcome-logo">
                  <div className="welcome-logo-icon">MA</div>
                  <div className="welcome-logo-text">
                    <span className="welcome-app-name">MA Business</span>
                    <span className="welcome-tagline">CRM & Outreach Platform</span>
                  </div>
                </div>
              </motion.div>

              {/* Welcome Message */}
              <motion.div
                className="welcome-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <h1 id="welcome-title" className="welcome-headline">
                  Welcome to MA Business
                </h1>
                <p className="welcome-subheadline">
                  Your complete platform for email management, CRM, and marketing automation
                </p>
              </motion.div>

              {/* Feature Showcase */}
              <motion.div
                className="welcome-features"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h2 className="welcome-features-title">Key Features</h2>
                <div className="welcome-features-grid">
                  {FEATURES.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      className="welcome-feature-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + (index * 0.05), duration: 0.4 }}
                    >
                      <div className="welcome-feature-icon">
                        <Icon name={feature.icon} size={24} />
                      </div>
                      <h3 className="welcome-feature-title">{feature.title}</h3>
                      <p className="welcome-feature-description">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                className="welcome-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <button
                  type="button"
                  className="welcome-btn welcome-btn-primary"
                  onClick={handleGetStarted}
                >
                  Get Started
                  <Icon name="arrow-right" size={18} />
                </button>
                <button
                  type="button"
                  className="welcome-btn welcome-btn-secondary"
                  onClick={handleDismiss}
                >
                  Skip for now
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper to check if welcome modal should show
export const shouldShowWelcomeModal = () => {
  return !localStorage.getItem(STORAGE_KEY);
};

// Helper to reset welcome modal (for testing)
export const resetWelcomeModal = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export default WelcomeModal;
