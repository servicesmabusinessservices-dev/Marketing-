import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gmailService } from '../services/gmailService';
import Icon from './ui/Icon';

const AccountSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const message = searchParams.get('message');
    
    if (token && email) {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('user_email', email);
      navigate('/dashboard');
      return;
    }

    if (message) {
      setLoginError(message);
    }
  }, [searchParams, navigate]);

  const handleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);

    try {
      await gmailService.login();
    } catch (error) {
      const message = error?.message || 'Login failed. Please try again.';
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
    <div className="login-screen">
      <div className="login-left">
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">MA</div>
            <div>
              <div className="login-logo-text">MA Business Services</div>
              <div className="login-logo-sub">CRM and Outreach Platform</div>
            </div>
          </div>
          <div className="login-heading">
            Your outreach.<br />
            <span>Automated.</span>
          </div>
          <div className="login-sub">
            Connect your Gmail account to unlock cold email campaigns, CRM tracking, and intelligent automation - all in one place.
          </div>
          <button className="google-btn" onClick={handleLogin} disabled={isLoggingIn}>
            <span>G</span>
            {isLoggingIn ? 'Connecting...' : 'Continue with Google'}
          </button>
          {loginError && <div className="auth-error">{loginError}</div>}
          <div className="login-footer">
            <span>Secure OAuth 2.0</span>
            <span>|</span>
            <span>No password stored</span>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-right-glow" />
        <div className="feature-list">
          <div className="login-right-title">Everything you need to<br /><span>close more deals.</span></div>
          {[
            { icon: 'bulk', title: 'Bulk Email Campaigns', desc: 'Send personalized cold emails at scale with smart throttling and tracking.' },
            { icon: 'pipeline', title: 'CRM Pipeline', desc: 'Kanban board to track every lead from first contact to signed contract.' },
            { icon: 'journey', title: 'Journey Automation', desc: 'Auto follow-ups, stage promotions, and trigger-based sequences.' },
            { icon: 'bar', title: 'Full Analytics', desc: 'Open rates, click rates, ROI attribution, and conversion funnels.' }
          ].map((feature) => (
            <div key={feature.title} className="feature-item">
              <div className="feature-icon-wrap feature-icon-wrap-cta">
                <Icon name={feature.icon} size={18} color="#fff" />
              </div>
              <div className="feature-text">
                <div className="feat-title">{feature.title}</div>
                <div className="feat-desc">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </motion.div>
  );
};

export default AccountSelection;
