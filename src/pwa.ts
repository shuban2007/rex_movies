import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the Service Worker and manages the update lifecycle for REX.io.
 *
 * Designed to ensure Android Add-to-Home-Screen installations and third-party
 * mobile browsers (Samsung Internet, Firefox Android, DuckDuckGo, etc.) detect
 * new deployments and reload cleanly without getting stuck on stale cached versions.
 */
export function registerPWA(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  let isReloading = false;

  const triggerReload = () => {
    if (isReloading) return;
    isReloading = true;
    window.location.reload();
  };

  registerSW({
    immediate: true,
    onNeedReload() {
      // If the user is currently on /watch playing video, defer the reload
      // until they navigate away or background the app, avoiding playback disruption.
      if (window.location.pathname.startsWith('/watch')) {
        const handleNavigation = () => {
          if (!window.location.pathname.startsWith('/watch')) {
            triggerReload();
          }
        };
        window.addEventListener('popstate', handleNavigation, { once: true });

        const handleVisibility = () => {
          if (document.visibilityState === 'hidden') {
            triggerReload();
          }
        };
        document.addEventListener('visibilitychange', handleVisibility, { once: true });
        return;
      }

      triggerReload();
    },
    onRegisteredSW(swScriptUrl, registration) {
      if (!registration) return;

      // 1. Immediately check for updates upon startup/mount
      registration.update().catch(() => {});

      // 2. Check for updates whenever the app is brought to foreground (e.g. user resumes from Android home screen)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

      // 3. Check for updates when network connectivity is restored
      window.addEventListener('online', () => {
        registration.update().catch(() => {});
      });

      // 4. Periodic background check every 30 minutes while the app is kept open
      const intervalMS = 30 * 60 * 1000;
      setInterval(async () => {
        if (!navigator.onLine || registration.installing) return;
        try {
          const resp = await fetch(swScriptUrl, {
            cache: 'no-store',
            headers: {
              'cache': 'no-store',
              'cache-control': 'no-cache',
            },
          });
          if (resp?.status === 200) {
            await registration.update();
          }
        } catch {
          // Ignore network errors when offline
        }
      }, intervalMS);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed:', error);
    },
  });
}
