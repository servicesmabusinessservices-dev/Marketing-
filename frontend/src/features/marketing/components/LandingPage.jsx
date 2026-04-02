import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

const heroPoints = [
  "Verified Gmail OAuth scopes (readonly, modify, send) with zero body storage.",
  "Multi-account inbox control with shared labels and guardrails.",
  "Bulk unsubscribe and outreach actions with audit trails.",
];

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleClearSession = () => {
    localStorage.clear();
    navigate('/connect');
  };

  return (
    <main
      id="main-content"
      className="landing-page"
    >
      <div className="landing-container">
        
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-kicker">MA Business Services</p>
            
            <h1 className="landing-heading">
              Gmail Manager: Multi-account control with compliant OAuth and real product proof.
            </h1>
            
            <p className="landing-subheading">
              Connect inboxes securely, automate triage, and launch outreach from one workspace.
              Built for teams that need privacy-first email automation.
            </p>
            
            <div className="landing-cta-group">
              <Link
                to="/connect"
                className="landing-cta landing-cta--primary"
              >
                Connect Gmail
              </Link>
              <Link
                to="/security"
                className="landing-cta landing-cta--secondary"
              >
                View security
              </Link>
            </div>
            
            {localStorage.getItem('jwt_token') && (
              <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Already logged in? 
                <button 
                  onClick={handleClearSession}
                  style={{ 
                    marginLeft: '0.5rem', 
                    color: 'var(--accent-primary)', 
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'inherit'
                  }}
                >
                  Clear session & re-login
                </button>
              </p>
            )}
            
            <div className="landing-features-list">
              {heroPoints.map((point) => (
                <div key={point} className="landing-feature-item">
                  <span className="landing-feature-dot" aria-hidden="true" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Product Preview */}
          <div className="landing-preview-card">
            <div className="landing-preview-label">Preview</div>
            <div className="landing-preview-content">
              <div className="landing-preview-header">
                <span>Inbox Control</span>
                <span className="landing-preview-badge">Protected</span>
              </div>
              
              <div className="landing-preview-items">
                <div className="landing-preview-row">
                  <span>Account status</span>
                  <span className="landing-preview-value landing-preview-value--success">Connected</span>
                </div>
                <div className="landing-preview-row">
                  <span>Scopes</span>
                  <span className="landing-preview-value">readonly · modify · send</span>
                </div>
                <div className="landing-preview-row">
                  <span>Storage</span>
                  <span className="landing-preview-value">No email bodies persisted</span>
                </div>
              </div>
              
              <div className="landing-preview-footer">
                OAuth verification ready · 24h deletion SLA
              </div>
            </div>
          </div>
        </section>

        {/* About / Company Identity Section */}
        <section className="landing-about">
          <div className="landing-about-avatar">
            <div className="landing-about-logo">MA</div>
            <div>
              <h2 className="landing-about-title">Who We Are</h2>
              <p className="landing-about-subtitle">MA Business Services - Professional Business Solutions</p>
            </div>
          </div>
          
          <div className="landing-about-content">
            <div className="landing-about-story">
              <p className="landing-about-intro">
                <strong>MA Business Services</strong> is a professional business solutions provider specializing in email management, 
                CRM systems, and marketing automation. We help businesses streamline their operations with secure, 
                privacy-first tools that enhance productivity without compromising data security.
              </p>
              <p className="landing-about-description">
                Our Gmail Manager platform was created with full transparency: we use verified Gmail OAuth scopes, 
                never persist email body content, and provide 24-hour deletion SLAs for all metadata. Every action 
                is audited, every scope is documented, and every user maintains full control. Learn more at{" "}
                <a href="https://mabusinessservices.com" target="_blank" rel="noopener noreferrer" className="landing-link">
                  mabusinessservices.com
                </a>
              </p>
            </div>

            <div className="landing-about-commitments">
              <div className="landing-commitment">
                <span className="landing-commitment-icon" aria-hidden="true">🔒</span>
                <div>
                  <div className="landing-commitment-title">Privacy Commitment</div>
                  <div className="landing-commitment-text">
                    We never store your email content. Only metadata (sender, subject, labels) 
                    is temporarily cached and deleted within 24 hours.
                  </div>
                </div>
              </div>
              
              <div className="landing-commitment">
                <span className="landing-commitment-icon" aria-hidden="true">📧</span>
                <div>
                  <div className="landing-commitment-title">Get in Touch</div>
                  <div className="landing-commitment-text">
                    Questions, feedback, or security concerns?{" "}
                    <a 
                      href="mailto:services@mabusinessservices.com" 
                      className="landing-link"
                    >
                      services@mabusinessservices.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="landing-commitment">
                <span className="landing-commitment-icon" aria-hidden="true">🛡️</span>
                <div>
                  <div className="landing-commitment-title">Security Disclosure</div>
                  <div className="landing-commitment-text">
                    Found a vulnerability? We take security seriously. Report issues to{" "}
                    <a 
                      href="mailto:services@mabusinessservices.com" 
                      className="landing-link"
                    >
                      services@mabusinessservices.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features-section">
          <h2 className="landing-section-title">What's inside</h2>
          <div className="landing-features-grid">
            {[
              {
                title: "Legal-ready",
                desc: "Privacy Policy, Terms of Service, and Security pages with full transparency.",
                href: "/privacy",
              },
              {
                title: "Privacy-first",
                desc: "Zero email body storage with 24-hour metadata deletion SLA.",
                href: "/security",
              },
              {
                title: "One real feature",
                desc: "Bulk unsubscribe action wired to Gmail API with audit trail.",
                href: "/connect",
              },
            ].map((card) => (
              <Link
                key={card.title}
                to={card.href}
                className="landing-feature-card"
              >
                <div className="landing-card-title">{card.title}</div>
                <div className="landing-card-desc">{card.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default LandingPage;
