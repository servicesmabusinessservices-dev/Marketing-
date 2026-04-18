import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gmailService } from '../../../services/gmailService';
import Icon from '../../../components/ui/Icon.jsx';
import SplitText from '../../../components/ui/SplitText.jsx';
import '../../../styles/maBusiness.css';
import './AccountSelection.css';

const featureItems = [
  {
    icon: 'bulk',
    title: 'Bulk Email Campaigns',
    desc: 'Send personalized cold emails at scale with smart throttling and tracking.',
  },
  {
    icon: 'pipeline',
    title: 'CRM Pipeline',
    desc: 'Kanban board to track every lead from first contact to signed contract.',
  },
  {
    icon: 'journey',
    title: 'Journey Automation',
    desc: 'Auto follow-ups, stage promotions, and trigger-based sequences.',
  },
  {
    icon: 'bar',
    title: 'Full Analytics',
    desc: 'Open rates, click rates, ROI attribution, and conversion funnels.',
  },
];

const getMotionPreference = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const AccountSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDevLogin, setIsDevLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getMotionPreference);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [serverWakeTime, setServerWakeTime] = useState(0);

  const isOnLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');
    const message = searchParams.get('message');
    
    // Handle successful authentication
    if (email) {
      // Store email for display purposes
      localStorage.setItem('user_email', email);
      
      // Store JWT token if provided (GmailManager.Api sends it in URL)
      // Note: GmailManager.Auth uses httpOnly cookies instead
      if (token) {
        localStorage.setItem('jwt_token', token);
      }
      
      // Clean URL of any query parameters
      window.history.replaceState({}, document.title, '/auth-success');
      
      navigate('/dashboard');
      return;
    }

    if (message) {
      setLoginError(message);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleMotionPreferenceChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMotionPreferenceChange);
      return () => mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    }

    mediaQuery.addListener(handleMotionPreferenceChange);
    return () => mediaQuery.removeListener(handleMotionPreferenceChange);
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    setIsWakingServer(false);
    setServerWakeTime(0);

    // Cold-start detection: Show "waking up" message after 3 seconds
    const coldStartTimer = setTimeout(() => {
      setIsWakingServer(true);
      setServerWakeTime(3);
      
      // Update timer every second
      const interval = setInterval(() => {
        setServerWakeTime(prev => prev + 1);
      }, 1000);
      
      // Clean up interval after 60 seconds max
      setTimeout(() => clearInterval(interval), 60000);
    }, 3000);

    try {
      const result = await gmailService.login();
      clearTimeout(coldStartTimer);

      // Development bypass mode: handle token if provided in response body
      if (result?.mode === 'development-bypass' && result?.email) {
        localStorage.setItem('user_email', result.email);
        if (result?.token) {
          localStorage.setItem('jwt_token', result.token);
        }
        navigate('/dashboard');
        return;
      }

      if (result?.authUrl) {
        window.location.assign(result.authUrl);
        return;
      }

      // If development-bypass mode, show error with dev login option
      if (result?.mode === 'development-bypass') {
        throw new Error('Google OAuth not configured. Click "Dev Login" below to proceed with demo data.');
      }

      throw new Error('Login did not return a valid authentication flow.');
    } catch (error) {
      clearTimeout(coldStartTimer);
      const raw = error?.message || 'Login failed. Please try again.';
      setLoginError(raw);
    } finally {
      setIsLoggingIn(false);
      setIsWakingServer(false);
      setServerWakeTime(0);
    }
  };

  const handleDevLogin = () => {
    setIsDevLogin(true);
    gmailService.devLogin();
  };

  const showDevLoginBtn = import.meta.env.DEV && isOnLocalhost;

  const animClass = prefersReducedMotion ? '' : 'login-animate';

  return (
    <div className={`login-screen ${animClass}`} id="main-content">
      <div className="login-left">
        <div className="login-bg-grid" aria-hidden="true" />
        <div className="login-bg-noise" aria-hidden="true" />
        <div className="login-bg-glow login-bg-glow--primary" aria-hidden="true" />
        <div className="login-bg-glow login-bg-glow--secondary" aria-hidden="true" />
        <div className="login-bg-glow login-bg-glow--orbital" aria-hidden="true" />
        <div className="login-bg-beam" aria-hidden="true" />
        <div className="login-bg-ring login-bg-ring--one" aria-hidden="true" />
        <div className="login-bg-ring login-bg-ring--two" aria-hidden="true" />
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">MA</div>
            <div>
              <div className="login-logo-text">MA Business Services</div>
              <div className="login-logo-sub">CRM and Outreach Platform</div>
            </div>
          </div>

          <div className="login-kicker">Built for focused outreach teams</div>

          <h1 className="login-heading">
            <span className="login-heading-line">
              <SplitText
                text="Your outreach."
                className="login-heading-text"
                delay={30}
                duration={0.25}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 16, rotateX: -12 }}
                to={{ opacity: 1, y: 0, rotateX: 0 }}
                textAlign="left"
                tag="span"
                initialDelay={0.1}
                disabled={prefersReducedMotion}
              />
            </span>
            <span className="login-heading-line">
              <SplitText
                text="Automated."
                className="login-heading-text login-heading-text--accent"
                delay={0}
                duration={0.25}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 16, rotateX: -12 }}
                to={{ opacity: 1, y: 0, rotateX: 0 }}
                textAlign="left"
                tag="span"
                initialDelay={0.18}
                disabled={prefersReducedMotion}
              />
            </span>
          </h1>

          <p className="login-sub">
            Connect your Gmail account to unlock cold email campaigns, CRM tracking, and intelligent automation - all in one place.
          </p>

          <div className="login-actions">
            <button
              className="google-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
            >
              {isLoggingIn
                ? <><span className="btn-spinner" aria-hidden="true" />{isWakingServer ? `Waking up server (${serverWakeTime}s)...` : 'Connecting...'}</>
                : <>
                    <span className="google-btn-mark" aria-hidden="true">G</span>
                    <span className="google-btn-text">Continue with Google</span>
                  </>}
            </button>
            
            {isWakingServer && (
              <div className="auth-info" role="status" aria-live="polite">
                ⏱️ Starting server (free tier cold-start, ~30-60s)...
              </div>
            )}

            {loginError && (
              <div className="auth-error" role="alert" aria-live="polite">
                {loginError}
                {showDevLoginBtn && (
                  <button
                    type="button"
                    className="auth-dev-btn"
                    onClick={handleDevLogin}
                    disabled={isDevLogin}
                  >
                    {isDevLogin ? 'Logging in...' : '🔧 Dev Login (skip Google)'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="login-footer">
            <span>Secure OAuth 2.0</span>
            <span>|</span>
            <span>No passwords stored</span>
            <span>|</span>
            <a href="/privacy">Privacy</a>
            <span>|</span>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
      <div className="login-right" aria-hidden="true">
        <div className="login-right-glow" aria-hidden="true" />
        <div className="feature-list">
          {featureItems.map((feature) => (
              <div key={feature.title} className="feature-item">
                <div className="feature-icon-wrap feature-icon-wrap-cta">
                <Icon name={feature.icon} size={18} color="var(--login-text-primary)" />
                </div>
                <div className="feature-text">
                <div className="feat-title">{feature.title}</div>
                <div className="feat-desc">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="login-trust" aria-label="Company and security information">
        <div className="trust-block">
          <h3>Security & Compliance</h3>
          <ul>
            <li>Scopes: gmail.readonly, gmail.modify, gmail.send</li>
            <li>Tokens encrypted at rest; no email bodies stored</li>
            <li>Data deletion within 24 hours on request</li>
          </ul>
        </div>
        <div className="trust-block">
          <h3>Company</h3>
          <ul>
            <li>Founder: Priya Ramanathan</li>
            <li>Contact: <a href="mailto:services@mabusinessservices.com">services@mabusinessservices.com</a></li>
            <li><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
          </ul>
        </div>
        <div className="trust-block">
          <h3>Policies</h3>
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/security">Security Overview</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AccountSelection;
