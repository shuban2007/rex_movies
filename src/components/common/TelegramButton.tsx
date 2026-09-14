import { useState, useEffect, useRef } from 'react';
import './TelegramButton.css';
import TelegramLogo from '../../assets/TelegramLogo.png';

export function TelegramButton() {
  const [showThought, setShowThought] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout>();
  const showTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleAdBlockerDismissed = () => {
      // Clear any existing timers
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);

      // Small delay after the popup goes away before showing the thought cloud
      showTimerRef.current = setTimeout(() => {
        setShowThought(true);
        // Hide it after 8 seconds of being visible
        hideTimerRef.current = setTimeout(() => {
          setShowThought(false);
        }, 8000);
      }, 500);
    };

    window.addEventListener('adBlockerDismissed', handleAdBlockerDismissed);

    return () => {
      window.removeEventListener('adBlockerDismissed', handleAdBlockerDismissed);
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <a 
      href="https://t.me/+S7o2RiET3ac2NTQ1?utm_source=chatgpt.com"
      target="_blank"
      rel="noopener noreferrer"
      className="telegram-floating-btn"
      aria-label="Join our Telegram Channel"
    >
      {showThought && (
        <div className="telegram-thought-cloud">
          Request Fixes, Movies, etc. here!
        </div>
      )}
      <img src={TelegramLogo} alt="Telegram Logo" className="telegram-icon-img" />
    </a>
  );
}
