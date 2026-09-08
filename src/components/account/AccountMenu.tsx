import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePWA } from '../../context/PWAContext';
import './AccountMenu.css';

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { user, authLoading, loading, signInWithGoogle, signOut } = useAuth();
  const isLoading = authLoading ?? loading;
  const { isInstallSupported, isInstalled, isIOS, installApp } = usePWA();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine avatar, name, and email from authenticated user
  const metadata = user?.user_metadata || {};
  const identityData = user?.identities?.[0]?.identity_data || {};
  const avatarUrl = metadata.avatar_url || metadata.picture || identityData.avatar_url || identityData.picture || null;
  const displayName = metadata.full_name || metadata.name || identityData.full_name || identityData.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || identityData.email || '';

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Failed to sign in', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to sign out', err);
    }
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button 
        className="account-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account Menu"
        aria-expanded={isOpen}
      >
        {user && avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName} 
            className="avatar-image" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="avatar-placeholder"></div>
        )}
        <span className="account-label">
          {isLoading ? 'Account' : user ? displayName : 'Account'}
        </span>
      </button>

      {isOpen && (
        <div className="account-dropdown">
          <div className="account-dropdown-header">
            {isLoading ? (
              <>
                <span className="account-dropdown-title">Account</span>
                <span className="account-dropdown-status">Loading session...</span>
              </>
            ) : user ? (
              <>
                <span className="account-dropdown-title">{displayName}</span>
                <span className="account-dropdown-status">{userEmail}</span>
              </>
            ) : (
              <>
                <span className="account-dropdown-title">Account</span>
                <span className="account-dropdown-status">Not signed in</span>
              </>
            )}
          </div>
          
          <div className="account-dropdown-actions">
            {isLoading ? (
              <p className="auth-notice">Checking authentication...</p>
            ) : user ? (
              <>
                <Link to="/watchlist" className="dropdown-link" onClick={() => setIsOpen(false)}>Watchlist</Link>
                <Link to="/history" className="dropdown-link" onClick={() => setIsOpen(false)}>History</Link>
                <button className="btn-signout" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <button className="btn-google-signin" onClick={handleSignIn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          {/* ── PWA Install Section ── */}
          <div className="account-dropdown-install">
            {isInstalled ? (
              <div className="install-status installed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>REX.io is installed</span>
              </div>
            ) : isInstallSupported ? (
              <button className="btn-install-app" onClick={() => { installApp(); setIsOpen(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Install REX.io
              </button>
            ) : isIOS ? (
              <div className="install-status ios-hint">
                <p>Tap <strong>Share</strong> <span style={{ color: '#8b7cf6' }}>⬆</span> then <strong>Add to Home Screen</strong> to install.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
