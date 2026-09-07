import { useState, useCallback, useEffect, useRef } from 'react';
import { buildMovieEmbedUrl } from '../../utils/embedUrl';
import './VideoPlayer.css';

export type PlayerState = 'empty' | 'loading' | 'loaded' | 'error';

interface VideoPlayerProps {
  /** The TMDB ID to load, or null for the empty state. */
  tmdbId: number | null;
  /** Optional movie title for display/accessibility. */
  title?: string;
  /** Called when the user clicks Retry after an error. */
  onRetry?: () => void;
}

export function VideoPlayer({ tmdbId, title, onRetry }: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('empty');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // When the ID changes, transition states
  useEffect(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }

    if (!tmdbId) {
      setState('empty');
      return;
    }

    setState('loading');

    // Safety timeout: if the iframe hasn't signaled "load" in 30s,
    // transition to error so the user isn't stuck on a spinner.
    loadTimerRef.current = setTimeout(() => {
      setState((prev) => (prev === 'loading' ? 'error' : prev));
    }, 30_000);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [tmdbId]);

  const handleIframeLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setState('loaded');
  }, []);

  const handleIframeError = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setState('error');
  }, []);

  const embedUrl = tmdbId ? buildMovieEmbedUrl(tmdbId) : null;

  return (
    <section className="video-player" aria-label="Video player">
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
