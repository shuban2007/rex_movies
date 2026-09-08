import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage, CookiePolicyPage, TermsConditionsPage, TermsOfUsePage } from './pages/LegalPages';
import { AdBlockerPopup, AdBlockerBanner } from './components/AdBlockerNotice';
import { PWAProvider } from './context/PWAContext';
import './App.css';

function MobileBottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link to="/" className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </Link>
      <Link to="/" className={`mobile-nav-item`} onClick={(e) => {
        e.preventDefault();
        const searchInput = document.querySelector('.navbar-search-input') as HTMLInputElement;
        if (searchInput) { searchInput.focus(); searchInput.scrollIntoView({ behavior: 'smooth' }); }
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search</span>
      </Link>
      <Link to="/watchlist" className={`mobile-nav-item ${isActive('/watchlist') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span>Watchlist</span>
      </Link>
      <Link to="/history" className={`mobile-nav-item ${isActive('/history') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>History</span>
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <PWAProvider>
      <div className="app">
        <ScrollToTop />
        <Header />
        <AdBlockerBanner />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<><AdBlockerPopup /><HomePage /></>} />
            <Route path="/browse" element={<Navigate to="/" replace />} />
            <Route path="/watch/:tmdbId" element={<WatchPage />} />
            <Route path="/watch/:mediaType/:tmdbId" element={<WatchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/terms" element={<TermsConditionsPage />} />
            <Route path="/terms-of-use" element={<TermsOfUsePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
        <MobileBottomNav />
      </div>
    </PWAProvider>
  );
}

