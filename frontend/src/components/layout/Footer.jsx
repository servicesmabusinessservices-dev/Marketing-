import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer role="contentinfo" className="app-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Company Info */}
          <div className="footer-column">
            <div className="footer-brand">
              <div className="footer-logo">MA</div>
              <div>
                <div className="footer-brand-name">MA Business Services</div>
                <div className="footer-brand-tagline">Professional Business Solutions</div>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="footer-column">
            <h3 className="footer-heading">Legal & Security</h3>
            <nav className="footer-nav" aria-label="Legal navigation">
              <Link to="/privacy" className="footer-link">Privacy Policy</Link>
              <Link to="/terms" className="footer-link">Terms of Service</Link>
              <Link to="/security" className="footer-link">Security</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="footer-column">
            <h3 className="footer-heading">Contact</h3>
            <div className="footer-contact">
              <a href="mailto:services@mabusinessservices.com" className="footer-link">
                Support
              </a>
              <a href="mailto:services@mabusinessservices.com" className="footer-link">
                Security Disclosure
              </a>
              <a href="https://mabusinessservices.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                Visit Website
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          <p>© {currentYear} MA Business Services. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
