import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { gmailService } from '../services/gmailService';
import Icon from './ui/Icon';
import SplitText from './ui/SplitText';

gsap.registerPlugin(useGSAP);

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
  const heroScopeRef = useRef(null);
  const gridRef = useRef(null);
  const primaryGlowRef = useRef(null);
  const secondaryGlowRef = useRef(null);
  const orbitalGlowRef = useRef(null);
  const beamRef = useRef(null);
  const ringOneRef = useRef(null);
  const ringTwoRef = useRef(null);
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const subRef = useRef(null);
  const actionsRef = useRef(null);
  const footerRef = useRef(null);
  const rightGlowRef = useRef(null);
  const rightTitleRef = useRef(null);
  const featureRefs = useRef([]);

  const isOnLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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

  useGSAP(() => {
    const heroCard = cardRef.current;
    const featureElements = featureRefs.current.filter(Boolean);
    const revealElements = [
      logoRef.current,
      subRef.current,
      actionsRef.current,
      footerRef.current,
      ...featureElements,
    ].filter(Boolean);
    const backgroundElements = [
      primaryGlowRef.current,
      secondaryGlowRef.current,
      orbitalGlowRef.current,
      beamRef.current,
      ringOneRef.current,
      ringTwoRef.current,
      rightGlowRef.current,
    ].filter(Boolean);

    if (!heroCard) {
      return undefined;
    }

    if (prefersReducedMotion) {
      gsap.set([heroCard, ...revealElements], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      });
      gsap.set(backgroundElements, {
        clearProps: 'all',
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
      });
      return undefined;
    }

    const introTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const ambientTweens = [];

    introTimeline
      .fromTo(primaryGlowRef.current, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 0.95, scale: 1, duration: 1.25 }, 0)
      .fromTo(secondaryGlowRef.current, { autoAlpha: 0, scale: 0.82 }, { autoAlpha: 0.85, scale: 1, duration: 1.35 }, 0.08)
      .fromTo(orbitalGlowRef.current, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 0.9, scale: 1, duration: 1.1 }, 0.18)
      .fromTo(beamRef.current, { autoAlpha: 0, rotation: -28 }, { autoAlpha: 0.72, rotation: -14, duration: 1.4 }, 0.06)
      .fromTo([ringOneRef.current, ringTwoRef.current], { autoAlpha: 0, scale: 0.84 }, { autoAlpha: 0.45, scale: 1, duration: 1.15, stagger: 0.08 }, 0.16)
      .fromTo(rightGlowRef.current, { autoAlpha: 0, scale: 0.84 }, { autoAlpha: 1, scale: 1, duration: 1.4 }, 0.2)
      .fromTo(heroCard, { autoAlpha: 0, y: 32, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.85 }, 0.16)
      .fromTo(logoRef.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.34)
      .fromTo(subRef.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.68 }, 0.72)
      .fromTo(actionsRef.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.68 }, 0.82)
      .fromTo(footerRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.58 }, 0.98)
      .fromTo(featureElements, { autoAlpha: 0, x: 26 }, { autoAlpha: 1, x: 0, duration: 0.58, stagger: 0.09 }, 0.62);

    if (gridRef.current) {
      ambientTweens.push(gsap.to(gridRef.current, {
        backgroundPosition: '48px 32px, 48px 32px',
        duration: 18,
        ease: 'none',
        repeat: -1,
        yoyo: true,
      }));
    }

    if (primaryGlowRef.current) {
      ambientTweens.push(gsap.to(primaryGlowRef.current, {
        xPercent: 8,
        yPercent: 10,
        scale: 1.08,
        duration: 12,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }

    if (secondaryGlowRef.current) {
      ambientTweens.push(gsap.to(secondaryGlowRef.current, {
        xPercent: -10,
        yPercent: -8,
        scale: 1.06,
        duration: 14,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }

    if (orbitalGlowRef.current) {
      ambientTweens.push(gsap.to(orbitalGlowRef.current, {
        xPercent: 12,
        yPercent: -12,
        duration: 10,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }

    if (beamRef.current) {
      ambientTweens.push(gsap.to(beamRef.current, {
        rotation: -6,
        xPercent: 6,
        duration: 16,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }

    if (rightGlowRef.current) {
      ambientTweens.push(gsap.to(rightGlowRef.current, {
        xPercent: -8,
        yPercent: -8,
        duration: 15,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }));
    }

    return () => {
      introTimeline.kill();
      ambientTweens.forEach((tween) => tween.kill());
    };
  }, { dependencies: [prefersReducedMotion], scope: heroScopeRef });

  const handleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await gmailService.login();

      if (result?.mode === 'development-bypass' && result?.token && result?.email) {
        localStorage.setItem('jwt_token', result.token);
        localStorage.setItem('user_email', result.email);
        navigate('/dashboard');
        return;
      }

      if (result?.authUrl) {
        window.location.assign(result.authUrl);
        return;
      }

      throw new Error('Login did not return a valid authentication flow.');
    } catch (error) {
      const raw = error?.message || 'Login failed. Please try again.';
      const isConfigError = raw.toLowerCase().includes('google oauth configuration is missing');
      setLoginError(isConfigError
        ? 'Google OAuth credentials are not configured. Run SETUP_LOCAL.ps1 to set them up.'
        : raw);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDevLogin = () => {
    setIsDevLogin(true);
    gmailService.devLogin();
  };

  const showDevLoginBtn = isOnLocalhost && loginError.toLowerCase().includes('google oauth credentials are not configured');

  return (
    <div ref={heroScopeRef} className="login-screen">
      <div className="login-left">
        <div ref={gridRef} className="login-bg-grid" aria-hidden="true" />
        <div className="login-bg-noise" aria-hidden="true" />
        <div ref={primaryGlowRef} className="login-bg-glow login-bg-glow--primary" aria-hidden="true" />
        <div ref={secondaryGlowRef} className="login-bg-glow login-bg-glow--secondary" aria-hidden="true" />
        <div ref={orbitalGlowRef} className="login-bg-glow login-bg-glow--orbital" aria-hidden="true" />
        <div ref={beamRef} className="login-bg-beam" aria-hidden="true" />
        <div ref={ringOneRef} className="login-bg-ring login-bg-ring--one" aria-hidden="true" />
        <div ref={ringTwoRef} className="login-bg-ring login-bg-ring--two" aria-hidden="true" />
        <div ref={cardRef} className="login-card">
          <div ref={logoRef} className="login-logo">
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
                delay={70}
                duration={0.9}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 34, rotateX: -24 }}
                to={{ opacity: 1, y: 0, rotateX: 0 }}
                textAlign="left"
                tag="span"
                initialDelay={0.42}
                disabled={prefersReducedMotion}
              />
            </span>
            <span className="login-heading-line">
              <SplitText
                text="Automated."
                className="login-heading-text login-heading-text--accent"
                delay={0}
                duration={0.9}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 34, rotateX: -24 }}
                to={{ opacity: 1, y: 0, rotateX: 0 }}
                textAlign="left"
                tag="span"
                initialDelay={0.58}
                disabled={prefersReducedMotion}
              />
            </span>
          </h1>

          <p ref={subRef} className="login-sub">
            Connect your Gmail account to unlock cold email campaigns, CRM tracking, and intelligent automation - all in one place.
          </p>

          <div ref={actionsRef} className="login-actions">
            <button
              className="google-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
            >
              {isLoggingIn
                ? <><span className="btn-spinner" aria-hidden="true" />Connecting...</>
                : <>
                    <span className="google-btn-mark" aria-hidden="true">G</span>
                    <span className="google-btn-text">Continue with Google</span>
                  </>}
            </button>

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

          <div ref={footerRef} className="login-footer">
            <span>Secure OAuth 2.0</span>
            <span>|</span>
            <span>No password stored</span>
          </div>
        </div>
      </div>
      <div className="login-right" aria-hidden="true">
        <div ref={rightGlowRef} className="login-right-glow" aria-hidden="true" />
        <div className="feature-list">
          {featureItems.map((feature, index) => (
            <div
              key={feature.title}
              ref={(node) => {
                featureRefs.current[index] = node;
              }}
              className="feature-item"
            >
              <div className="feature-icon-wrap feature-icon-wrap-cta">
                <Icon name={feature.icon} size={18} color="var(--text-primary)" />
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
  );
};

export default AccountSelection;
