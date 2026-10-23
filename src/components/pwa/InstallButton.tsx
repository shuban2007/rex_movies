import { useState, useRef, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { DownloadIcon } from '../common/Icons';
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
          <DownloadIcon size={18} />
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
      <DownloadIcon size={16} className="install-btn-icon" />
      <span className="install-btn-text">Install</span>
    </button>
  );
}
