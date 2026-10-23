import { Link, useLocation } from 'react-router-dom';
import { MovieSearch } from '../search/MovieSearch';
import { InstallButton } from '../pwa/InstallButton';
import { HeartIcon, HistoryIcon } from '../common/Icons';
import './Header.css';

export function Header() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link
          to="/"
          className="header-logo-link"
          aria-label="Rex.io Home"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('rexio-clear-search'));
          }}
        >
          <img src="/REX_Logo.png" alt="Rex.io" className="header-logo" draggable={false} />
        </Link>

        <MovieSearch />

        <nav className="header-nav">
          <InstallButton />
          <Link to="/watchlist" className={`nav-link ${isActive('/watchlist') ? 'active' : ''}`}>
            <span className="nav-icon">
              <HeartIcon size={18} strokeWidth={1.8} />
            </span>
            <span className="nav-text">Watchlist</span>
          </Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
            <span className="nav-icon">
              <HistoryIcon size={18} strokeWidth={2} />
            </span>
            <span className="nav-text">History</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
