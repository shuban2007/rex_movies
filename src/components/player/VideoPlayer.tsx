import { useState, useCallback, useEffect, useRef } from 'react';
import { getEnabledProviders, getDefaultProvider, getMovieProviderUrl, getTVProviderUrl } from '../../services/playback/provider';
import { CustomSelect } from '../ui/CustomSelect';
import './VideoPlayer.css';

export type PlayerState = 'empty' | 'loading' | 'loaded' | 'error';

interface VideoPlayerProps {
  /** The TMDB ID to load, or null for the empty state. */
  tmdbId: number | null;
  /** The IMDb ID if available */
  imdbId?: string | null;
  /** Optional movie title for display/accessibility. */
  title?: string;
  /** Called when the user clicks Retry after an error. */
  onRetry?: () => void;
  /** Media type for selecting the correct providers. */
  mediaType?: 'movie' | 'tv';
  /** TV Season Number */
  season?: number;
  /** TV Episode Number */
  episode?: number;
  /**
   * Called when a provider signals that playback has ended.
   * Future-proof: currently no providers expose this event,
   * but the listener is ready if they ever do.
   */
  onEpisodeEnd?: () => void;
}

export function VideoPlayer({ tmdbId, imdbId, title, onRetry, mediaType = 'movie', season, episode, onEpisodeEnd }: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('empty');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallbackCountRef = useRef(0);

  const availableProviders = getEnabledProviders(mediaType);

  // Auto-select provider from localStorage, or default if not available
  useEffect(() => {
    if (availableProviders.length > 0) {
      if (!selectedProviderId || !availableProviders.find(p => p.id === selectedProviderId)) {
        const savedProviderId = localStorage.getItem('rex_preferred_provider');
        const savedProvider = availableProviders.find(p => p.id === savedProviderId);
        
        if (savedProvider) {
          // eslint-disable-next-line react/set-state-in-effect
          setSelectedProviderId(savedProvider.id);
        } else {
          const defaultProvider = getDefaultProvider(mediaType);
          // eslint-disable-next-line react/set-state-in-effect
          setSelectedProviderId(defaultProvider ? defaultProvider.id : availableProviders[0].id);
        }
      }
    } else {
      // eslint-disable-next-line react/set-state-in-effect
      setSelectedProviderId('');
    }
  }, [mediaType, availableProviders, selectedProviderId]);

  // When the ID or provider changes, transition states
  useEffect(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }

    if (!tmdbId || !selectedProviderId) {
      // eslint-disable-next-line react/set-state-in-effect
      setState('empty');
      return;
    }

    // Only reset fallback count if this wasn't an automatic fallback (which retains the same tmdbId but changes selectedProviderId)
    // Actually, to safely manage fallback, we just let fallback logic increment it and manual changes/title changes reset it.
    // We'll reset it in the manual onChange handler and when tmdbId changes.
    // eslint-disable-next-line react/set-state-in-effect
    setState('loading');

    // Safety timeout: if the iframe hasn't signaled "load" in 30s,
    // transition to error so the user isn't stuck on a spinner.
    loadTimerRef.current = setTimeout(() => {
      setState((prev) => (prev === 'loading' ? 'error' : prev));
    }, 30_000);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [tmdbId, selectedProviderId, season, episode]);

  // Reset fallback count when the title/episode actually changes
  useEffect(() => {
    fallbackCountRef.current = 0;
  }, [tmdbId, season, episode]);

  const handleIframeLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setState('loaded');
  }, []);

  // ── Future-proof: listen for postMessage-based episode-end signals ──
  useEffect(() => {
    if (!onEpisodeEnd || mediaType !== 'tv') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // Accept end signals from any provider origin
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && (data.event === 'ended' || data.type === 'ended' || data.action === 'ended')) {
          onEpisodeEnd();
        }
      } catch {
        // Not a JSON message or not relevant — ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEpisodeEnd, mediaType]);

  const handleIframeError = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setState('error');
    
    // Fallback logic
    if (fallbackCountRef.current < 3) {
      const currentIndex = availableProviders.findIndex(p => p.id === selectedProviderId);
      if (currentIndex >= 0 && currentIndex < availableProviders.length - 1) {
        fallbackCountRef.current += 1;
        // Auto-fallback to next provider if available
        setTimeout(() => setSelectedProviderId(availableProviders[currentIndex + 1].id), 2000);
      }
    }
  }, [selectedProviderId, availableProviders]);

  const selectedProvider = availableProviders.find(p => p.id === selectedProviderId);
  const embedUrl = (tmdbId && selectedProvider) 
    ? (mediaType === 'movie' 
        ? getMovieProviderUrl(selectedProvider, { tmdbId, imdbId })
        : getTVProviderUrl(selectedProvider, { tmdbId, imdbId }, season || 1, episode || 1))
    : null;

  const handleProviderChange = (val: string) => {
    fallbackCountRef.current = 0; // Reset on manual change
    localStorage.setItem('rex_preferred_provider', val);
    setSelectedProviderId(val);
  };

  return (
    <section className="video-player" aria-label="Video player">
      {/* Dynamic Provider Selector */}
      {tmdbId && availableProviders.length > 0 && (
        <div className="player-controls">
          <div className="provider-selector-container">
            <span className="provider-selector-label">SERVER:</span>
            {availableProviders.length === 1 ? (
              <div className="single-provider-pill">
                <span className="status-dot"></span>
                <span className="single-provider-text">{availableProviders[0].name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="provider-chevron">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            ) : (
              <CustomSelect
                id="provider-select"
                value={selectedProviderId}
                onChange={(val) => handleProviderChange(val as string)}
                options={availableProviders.map(p => ({ value: p.id, label: p.name }))}
                ariaLabel="Select streaming server"
              />
            )}
          </div>
          {selectedProvider?.hasAds && (
            <div className="provider-ads-warning">
              Third-party server • Ads may be present. An ad blocker is recommended.
            </div>
          )}
        </div>
      )}

      <div className="player-shell">
        <div className="player-aspect-ratio">
          {/* ── Empty State ──────────────────────────────── */}
          {state === 'empty' && (
            <div className="player-state player-empty" role="status">
              <div className="empty-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                  <path d="M20 16l12 8-12 8V16z" fill="currentColor" opacity="0.4" />
                </svg>
              </div>
              <p className="empty-title">Select a movie to start watching</p>
              <p className="empty-subtitle">
                Search for a movie above and pick one to begin
              </p>
            </div>
          )}

          {/* ── Loading State ────────────────────────────── */}
          {state === 'loading' && (
            <div className="player-state player-loading" role="status" aria-label="Loading player">
              <div className="loading-indicator">
                <div className="loading-bar" />
              </div>
              <p className="loading-text">Loading player…</p>
            </div>
          )}

          {/* ── Error State ──────────────────────────────── */}
          {state === 'error' && (
            <div className="player-state player-error" role="alert">
              <div className="error-icon" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                  <path d="M20 12v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="20" cy="27" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <p className="error-title">Player unavailable</p>
              <p className="error-subtitle">
                The external provider may be unavailable.
                {availableProviders.findIndex(p => p.id === selectedProviderId) < availableProviders.length - 1 
                  ? " Trying another server..." 
                  : " Try selecting a different server manually."}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="player-retry-btn"
                  onClick={onRetry}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {/* ── Iframe ───────────────────────────────────── */}
          {embedUrl && (
            <iframe
              ref={iframeRef}
              className={`player-iframe ${state === 'loaded' ? 'player-iframe--visible' : ''}`}
              src={embedUrl}
              title={title ? `${title} — Rex.io Video Player` : 'Rex.io Video Player'}
              {...(!selectedProvider?.disableSandbox && {
                sandbox: "allow-scripts allow-same-origin allow-presentation allow-forms"
              })}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
        </div>
      </div>
    </section>
  );
}
