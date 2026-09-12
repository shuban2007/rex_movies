import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WatchlistItem, HistoryItem } from '../types/database';
import { watchlistService } from '../services/watchlist';
import { historyService } from '../services/history';
import type { MediaSearchResult, TvSeriesDetails, MovieSearchResult } from '../services/tmdb';

// ── Context types ──────────────────────────────────────────

export interface GuestStoreContextValue {
  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (media: MediaSearchResult | MovieSearchResult | TvSeriesDetails, mediaType: 'movie' | 'tv') => void;
  removeFromWatchlist: (tmdbId: number, mediaType?: string) => void;
  isInWatchlist: (tmdbId: number, mediaType?: string) => boolean;

  // History
  history: HistoryItem[];
  recordProgress: (
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number,
    episodeTitle?: string,
    progressSeconds?: number
  ) => void;
  addOrUpdateHistory: (
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number,
    episodeTitle?: string,
    progressSeconds?: number
  ) => void;
  clearHistory: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const GuestStoreContext = createContext<GuestStoreContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────

export function GuestStoreProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => watchlistService.getWatchlist());
  const [history, setHistory] = useState<HistoryItem[]>(() => historyService.getHistory());

  // ── Sync from custom events (same-tab updates from services) ──

  const refreshWatchlist = useCallback(() => {
    setWatchlist(watchlistService.getWatchlist());
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(historyService.getHistory());
  }, []);

  useEffect(() => {
    window.addEventListener('watchlist-updated', refreshWatchlist);
    window.addEventListener('history-updated', refreshHistory);

    return () => {
      window.removeEventListener('watchlist-updated', refreshWatchlist);
      window.removeEventListener('history-updated', refreshHistory);
    };
  }, [refreshWatchlist, refreshHistory]);

  // ── Multi-tab sync via storage event ──

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rexio_watchlist') {
        refreshWatchlist();
      } else if (e.key === 'rexio_watch_history') {
        refreshHistory();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshWatchlist, refreshHistory]);

  // ── Watchlist actions ──

  const addToWatchlist = useCallback(
    (media: MediaSearchResult | MovieSearchResult | TvSeriesDetails, mediaType: 'movie' | 'tv') => {
      watchlistService.addMedia(media, mediaType);
      // State is updated via the 'watchlist-updated' event listener above
    },
    []
  );

  const removeFromWatchlist = useCallback((tmdbId: number, mediaType: string = 'movie') => {
    watchlistService.removeMedia(tmdbId, mediaType);
  }, []);

  const isInWatchlist = useCallback(
    (tmdbId: number, mediaType: string = 'movie') => {
      return watchlist.some(item => item.tmdb_id === tmdbId && item.media_type === mediaType);
    },
    [watchlist]
  );

  // ── History actions ──

  const recordProgress = useCallback(
    (
      media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
      mediaType: 'movie' | 'tv',
      seasonNumber?: number,
      episodeNumber?: number,
      episodeTitle?: string,
      progressSeconds?: number
    ) => {
      historyService.recordProgress(media, mediaType, seasonNumber, episodeNumber, episodeTitle, progressSeconds);
    },
    []
  );

  const addOrUpdateHistory = useCallback(
    (
      media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
      mediaType: 'movie' | 'tv',
      seasonNumber?: number,
      episodeNumber?: number,
      episodeTitle?: string,
      progressSeconds?: number
    ) => {
      historyService.addOrUpdateHistory(media, mediaType, seasonNumber, episodeNumber, episodeTitle, progressSeconds);
    },
    []
  );

  const clearHistoryAction = useCallback(() => {
    historyService.clearHistory();
  }, []);

  // ── Context value ──

  const value: GuestStoreContextValue = {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    history,
    recordProgress,
    addOrUpdateHistory,
    clearHistory: clearHistoryAction,
  };

  return (
    <GuestStoreContext.Provider value={value}>
      {children}
    </GuestStoreContext.Provider>
  );
}
