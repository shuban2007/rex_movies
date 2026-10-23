import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { HistoryPage } from './pages/HistoryPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage, CookiePolicyPage, TermsConditionsPage, TermsOfUsePage } from './pages/LegalPages';
import { AdBlockerPopup, AdBlockerBanner } from './components/AdBlockerNotice';
import { PWAProvider } from './context/PWAContext';
import { SplashScreen } from './components/ui/SplashScreen';
import { TelegramButton } from './components/common/TelegramButton';
import { HomeIcon, SearchIcon, HeartIcon, HistoryIcon } from './components/common/Icons';
import './App.css';

function MobileBottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link
        to="/"
        className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('rexio-clear-search'));
        }}
      >
        <HomeIcon size={22} />
        <span>Home</span>
      </Link>
      <Link to="/search" className={`mobile-nav-item ${isActive('/search') ? 'active' : ''}`}>
        <SearchIcon size={22} />
        <span>Search</span>
      </Link>
      <Link to="/watchlist" className={`mobile-nav-item ${isActive('/watchlist') ? 'active' : ''}`}>
        <HeartIcon size={22} />
        <span>Watchlist</span>
      </Link>
      <Link to="/history" className={`mobile-nav-item ${isActive('/history') ? 'active' : ''}`}>
        <HistoryIcon size={22} />
        <span>History</span>
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <PWAProvider>
      <SplashScreen />
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
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/terms" element={<TermsConditionsPage />} />
            <Route path="/terms-of-use" element={<TermsOfUsePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
        <MobileBottomNav />
        <TelegramButton />
      </div>
    </PWAProvider>
  );
}

