import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/ui/Icon';
import './LandingPage.css';

const FloatingNav = () => {
  return (
    <nav className="floating-nav">
      <div className="nav-pill">
        <div className="nav-logo">
          <Icon name="code" size={18} color="white" />
          <span>Gmail Manager</span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#security" className="nav-link">Security</a>
          <a href="#about" className="nav-link">About</a>
          <a href="/connect" className="nav-link nav-link--primary">Get Started</a>
        </div>
      </div>
    </nav>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Unified Inbox',
      description: 'See every message from all your connected Gmail accounts in one high-speed, matte-styled workspace.',
      icon: 'inbox'
    },
    {
      title: 'Smart Automation',
      description: 'Automate triage and classification using advanced rules. Focus on what matters while we handle the noise.',
      icon: 'zap'
    },
    {
      title: 'Bulk Outreach',
      description: 'Launch compliant email campaigns across multiple accounts with real product proof and safety-first logic.',
      icon: 'send'
    }
  ];

  const benefits = [
    {
      title: 'Privacy First',
      category: 'Security',
      image: '/ui/security.png',
      link: '#security'
    },
    {
      title: 'Zero Latency',
      category: 'Performance',
      image: '/ui/performance.png',
      link: '#performance'
    },
    {
      title: 'Multi-Account',
      category: 'Control',
      image: '/ui/multi.png',
      link: '#features'
    },
    {
      title: 'Real Proof',
      category: 'Trust',
      image: '/ui/proof.png',
      link: '#about'
    }
  ];

  return (
    <main id="main-content" className="landing-page">
      <FloatingNav />
      
      <div className="landing-container">
        
        {/* Hero Section */}
        <section id="hero" className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-kicker">Professional Email Management</p>
            <h1 className="landing-heading">
              Gmail Manager: Multi-account control with <span className="landing-heading-highlight">Real Product Proof</span>
            </h1>
            <p className="landing-subheading">
              The only workspace designed for power users who need to manage, automate, and scale their Gmail operations with verified OAuth security.
            </p>
            <div className="landing-cta-group">
              <button onClick={() => navigate('/connect')} className="landing-cta landing-cta--primary">Start Managing Now</button>
              <a href="#features" className="landing-cta landing-cta--secondary">Explore Features</a>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="visual-card">
              <Icon name="mail" size={64} color="var(--amber)" />
              <div className="visual-card-content">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="landing-trust">
          <p className="landing-trust-label">Verified Security & Compliance</p>
          <div className="landing-trust-logos">
            <span className="trust-logo">Google OAuth Verified</span>
            <span className="trust-logo">GDPR Compliant</span>
            <span className="trust-logo">Enterprise Grade</span>
            <span className="trust-logo">256-bit Encrypted</span>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="landing-services">
          <div className="section-header">
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-subtitle">Powerful tools to tame your inbox chaos and scale your outreach.</p>
          </div>
          <div className="services-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="service-card">
                <div className="service-icon">
                  <Icon name={feature.icon} size={32} />
                </div>
                <h3 className="service-title">{feature.title}</h3>
                <p className="service-desc">{feature.description}</p>
                <a href="#features" className="service-link">Deep dive →</a>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits/Showcase Section */}
        <section id="showcase" className="landing-portfolio">
          <div className="section-header">
            <h2 className="section-title">Why Gmail Manager?</h2>
            <p className="section-subtitle">Experience the next generation of multi-account control.</p>
          </div>
          <div className="portfolio-grid">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="portfolio-card">
                <div className="portfolio-image-placeholder">
                  <Icon name={benefit.category.toLowerCase() === 'security' ? 'shield' : 'code'} size={48} opacity={0.1} />
                </div>
                <div className="portfolio-info">
                  <span className="portfolio-cat">{benefit.category}</span>
                  <h3 className="portfolio-name">{benefit.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="landing-about">
          <div className="landing-about-avatar">
            <div className="landing-about-logo">
              <Icon name="code" size={48} color="white" />
            </div>
            <div>
              <h2 className="landing-about-title">Our Mission</h2>
              <p className="landing-about-subtitle">Privacy-First Email Automation</p>
            </div>
          </div>
          <div className="landing-about-content">
            <p>
              Gmail Manager was born out of the need for a truly professional, multi-account email environment. We believe that privacy and efficiency should go hand-in-hand. Our platform uses verified Google OAuth flows and localized data protection to ensure your data never leaves your control.
            </p>
            <p>
              Whether you are a solo entrepreneur or managing a large scale outreach team, our mission is to provide you with the most stable, secure, and beautiful workspace for your email operations.
            </p>
          </div>
        </section>

        {/* Call to Action Section */}
        <section id="contact" className="landing-contact">
          <div className="contact-card">
            <h2 className="section-title">Ready to take control of your inboxes?</h2>
            <p className="section-subtitle">Join thousands of users scaling their email operations today.</p>
            <button className="landing-cta landing-cta--primary" onClick={() => navigate('/connect')}>Connect Your First Account</button>
          </div>
        </section>

      </div>
    </main>
  );
};

export default LandingPage;
