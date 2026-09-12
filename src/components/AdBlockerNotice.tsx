import { useState, useEffect, useCallback } from 'react';
import './AdBlockerNotice.css';

const BRAVE_URL = 'https://brave.com/download/?utm_source=chatgpt.com';
const OPERA_URL = 'https://www.opera.com/download?utm_source=chatgpt.com';

/** Popup modal shown once per session on the Home Page */
export function AdBlockerPopup() {
  const [visible, setVisible] = useState(true);

  // Check if browser natively blocks ads/trackers
  useEffect(() => {
    let active = true;
    const checkBrowser = async () => {
      const ua = navigator.userAgent;
      const isOpera = ua.includes('OPR/') || ua.includes('Opera');
      const isVivaldi = ua.includes('Vivaldi');
      const isFirefox = ua.includes('Firefox') || ua.includes('FxiOS');
      const isDuckDuckGo = ua.includes('DuckDuckGo');
      const isSamsung = ua.includes('SamsungBrowser');
      const isArc = ua.includes('Arc');
      
      let isBrave = false;
      if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
        try {
          isBrave = await (navigator as any).brave.isBrave();
        } catch {
          // ignore
        }
      }

      if (active && (isBrave || isOpera || isVivaldi || isFirefox || isDuckDuckGo || isSamsung || isArc)) {
        setVisible(false);
      }
    };
    checkBrowser();
    
    return () => { active = false; };
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div className="adblocker-backdrop" onClick={dismiss}>
      <div className="adblocker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="adblocker-close" onClick={dismiss} aria-label="Close">×</button>

        <div className="adblocker-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <h3 className="adblocker-title">Ad Blocker Recommended</h3>
        <p className="adblocker-desc">For the best viewing experience, we recommend using a browser with built-in ad blocking.</p>

        <div className="adblocker-browsers">
          <a href={BRAVE_URL} target="_blank" rel="noopener noreferrer" className="adblocker-browser-btn brave">
            <span className="browser-icon">🦁</span>
            Brave Browser
          </a>
          <a href={OPERA_URL} target="_blank" rel="noopener noreferrer" className="adblocker-browser-btn opera">
            <span className="browser-icon">🔴</span>
            Opera Browser
          </a>
        </div>
      </div>
    </div>
  );
}

/** Slim persistent banner rendered below the header */
export function AdBlockerBanner() {
  return (
    <div className="adblocker-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>Ad blocker recommended for the best viewing experience.</span>
    </div>
  );
}
