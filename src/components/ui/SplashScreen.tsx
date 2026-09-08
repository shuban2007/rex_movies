import { useState, useEffect } from 'react';
import './SplashScreen.css';

const SPLASH_KEY = 'rex_startup_seen';

export function SplashScreen() {
  const [show, setShow] = useState(() => {
    // Only show if we haven't seen it in this session
    return sessionStorage.getItem(SPLASH_KEY) !== 'true';
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!show) return;

    // Wait 3 seconds, then start fading out
    const fadeTimer = setTimeout(() => {
      setFading(true);
      
      // After fade animation completes, remove from DOM and set flag
      setTimeout(() => {
        setShow(false);
        sessionStorage.setItem(SPLASH_KEY, 'true');
      }, 500); // 500ms fade duration
    }, 2500); // Total 3s = 2.5s display + 0.5s fade

    return () => clearTimeout(fadeTimer);
  }, [show]);

  if (!show) return null;

  return (
    <div className={`splash-screen ${fading ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <img src="/REX_Logo.png" alt="REX.io" className="splash-logo" draggable={false} />
        <div className="splash-loader">
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
        </div>
      </div>
    </div>
  );
}
