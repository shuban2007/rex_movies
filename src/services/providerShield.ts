import { useEffect } from 'react';

export interface ProviderShieldConfig {
  providerId: string;
  supportsSandbox: boolean;
  sandboxFlags?: string;
}

// Strictest possible sandbox that maintains video playback.
// Intentionally omits allow-popups, allow-top-navigation, etc.
const STRICT_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-forms";

const providerConfigs: Record<string, ProviderShieldConfig> = {
  'cinesrc-movie': { providerId: 'cinesrc-movie', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'cinesrc-tv': { providerId: 'cinesrc-tv', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'vidsrc-sbs-movie': { providerId: 'vidsrc-sbs-movie', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'vidsrc-sbs-tv': { providerId: 'vidsrc-sbs-tv', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'vidcore-movie': { providerId: 'vidcore-movie', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'vidcore-tv': { providerId: 'vidcore-tv', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'nexstream-movie': { providerId: 'nexstream-movie', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'nexstream-tv': { providerId: 'nexstream-tv', supportsSandbox: true, sandboxFlags: STRICT_SANDBOX },
  'vidrift-movie': { providerId: 'vidrift-movie', supportsSandbox: false },
  'vidrift-tv': { providerId: 'vidrift-tv', supportsSandbox: false },
  'vidy-movie': { providerId: 'vidy-movie', supportsSandbox: false },
  'vidy-tv': { providerId: 'vidy-tv', supportsSandbox: false },
  
  // FilmU requires full isolation fallback (unsandboxed) to prevent "Playback Disabled" errors
  'filmu-movie': { providerId: 'filmu-movie', supportsSandbox: false },
  'filmu-tv': { providerId: 'filmu-tv', supportsSandbox: false },
};

/**
 * Get the security configuration for a specific provider.
 * Defaults to STRICT_SANDBOX if unknown.
 */
export function getProviderShieldConfig(providerId: string): ProviderShieldConfig {
  return providerConfigs[providerId] || { providerId, supportsSandbox: true, sandboxFlags: STRICT_SANDBOX };
}

/**
 * Provider Shield hook for centralized parent-page monitoring and security enforcement.
 */
export function useProviderShield(providerId: string, iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const config = getProviderShieldConfig(providerId);

  useEffect(() => {
    if (!providerId) return;

    const handleBlur = () => {
      // If window loses focus and the active element is the provider iframe,
      // this indicates an iframe interaction (often a potential popup attempt).
      // We detect and log this for diagnostics, without breaking the player.
      if (document.activeElement === iframeRef.current) {
        if (import.meta.env.DEV) {
          console.log(`[ProviderShield] Provider: ${providerId}\nEvent: suspicious-navigation/blur\nAction: detected`);
        }
      }
    };

    const handleFocus = () => {
      if (import.meta.env.DEV) {
        console.log(`[ProviderShield] Provider: ${providerId}\nEvent: window-focus\nAction: recovered`);
      }
    };

    const handleVisibilityChange = () => {
      if (import.meta.env.DEV && document.visibilityState === 'hidden') {
        console.log(`[ProviderShield] Provider: ${providerId}\nEvent: visibilitychange (hidden)\nAction: detected`);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [providerId, iframeRef]);

  return { config };
}
