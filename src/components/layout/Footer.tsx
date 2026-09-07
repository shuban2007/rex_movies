import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <p className="footer-logo">REX.io</p>
        <p className="footer-tagline">Discover • Watch • Enjoy</p>
        <nav className="footer-legal-links" aria-label="Legal links">
          <Link to="/privacy">Privacy Policy</Link>
          <span className="footer-dot">•</span>
          <Link to="/cookies">Cookie Policy</Link>
          <span className="footer-dot">•</span>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <span className="footer-dot">•</span>
          <Link to="/terms-of-use">Terms of Use</Link>
        </nav>
        <p className="footer-copyright">&copy; REX.io</p>
      </div>
    </footer>
  );
}

