import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextValue {
  /** Whether the browser supports native PWA installation */
  isInstallSupported: boolean;
  /** Whether the app is currently running in standalone (installed) mode */
  isInstalled: boolean;
  /** Whether the platform is iOS (requires manual Add to Home Screen) */
  isIOS: boolean;
  /** Trigger the native browser install prompt */
  installApp: () => Promise<void>;
}

const PWAContext = createContext<PWAContextValue>({
  isInstallSupported: false,
  isInstalled: false,
  isIOS: false,
  installApp: async () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

function getIsStandalone(): boolean {
  // Check standard display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Check iOS standalone mode
  if ((navigator as any).standalone === true) return true;
  return false;
}

function getIsIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS] = useState(() => getIsIOS());

  useEffect(() => {
    // Check if already running as installed PWA
    setIsInstalled(getIsStandalone());

    // Listen for the browser's install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also listen for display-mode changes (e.g., user opens installed app)
    const mq = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };
    mq.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mq.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      // Whether accepted or dismissed, the prompt can only be used once
      setDeferredPrompt(null);
    } catch {
      // Silently handle — prompt may have been consumed already
    }
  }, [deferredPrompt]);

  const value: PWAContextValue = {
    isInstallSupported: deferredPrompt !== null,
    isInstalled,
    isIOS,
    installApp,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}
