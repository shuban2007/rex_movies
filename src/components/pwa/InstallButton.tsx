import { useState, useRef, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import './InstallButton.css';

export function InstallButton() {
  const { isInstallSupported, isInstalled, isIOS, installApp } = usePWA();
  const [showIOSTip, setShowIOSTip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  // Close iOS tooltip on outside click
  useEffect(() => {
    if (!showIOSTip) return;
    const handleClick = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowIOSTip(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showIOSTip]);

  // Don't render if already installed
  if (isInstalled) return null;

  // iOS fallback — show tip on click
  if (isIOS) {
    return (
      <div className="install-btn-wrapper" ref={tipRef}>
        <button
          className="install-btn install-btn--mobile-icon"
          onClick={() => setShowIOSTip(!showIOSTip)}
          aria-label="Install REX.io"
          title="Install REX.io"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        {showIOSTip && (
          <div className="install-ios-tooltip">
            <p>To install REX.io, tap <strong>Share</strong> <span className="ios-share-icon">⬆</span> then <strong>Add to Home Screen</strong>.</p>
          </div>
        )}
      </div>
    );
  }

  // Chromium — only show when install prompt is available
  if (!isInstallSupported) return null;

  return (
    <button
      className="install-btn"
      onClick={installApp}
      aria-label="Install REX.io"
      title="Install REX.io"
    >
      <svg className="install-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span className="install-btn-text">Install</span>
    </button>
  );
}
