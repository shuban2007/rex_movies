import { Link, useLocation } from 'react-router-dom';
import { AccountMenu } from '../account/AccountMenu';
import { MovieSearch } from '../search/MovieSearch';
import './Header.css';

export function Header() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="header-logo-link" aria-label="Rex.io Home">
          <img src="/REX_Logo.png" alt="Rex.io" className="header-logo" draggable={false} />
        </Link>

        <MovieSearch />
        
        <nav className="header-nav">
          <Link to="/watchlist" className={`nav-link ${isActive('/watchlist') ? 'active' : ''}`}>
            <span className="nav-icon">♡</span>
            <span className="nav-text">Watchlist</span>
          </Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
            <span className="nav-icon">◷</span>
            <span className="nav-text">History</span>
          </Link>
          <div className="nav-account-wrapper">
            <AccountMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}
