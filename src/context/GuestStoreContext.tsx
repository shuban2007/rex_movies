import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WatchlistItem, HistoryItem } from '../types/database';
import { watchlistService } from '../services/watchlist';
import { historyService } from '../services/history';

// ── Context types ──────────────────────────────────────────

export interface GuestStoreContextValue {
  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (id: number, type: 'movie' | 'tv') => void;
  removeFromWatchlist: (id: number, type: 'movie' | 'tv') => void;
  isInWatchlist: (id: number, type: 'movie' | 'tv') => boolean;

  // History
  history: HistoryItem[];
  recordProgress: (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ) => void;
  addOrUpdateHistory: (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
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
    (id: number, type: 'movie' | 'tv') => {
      watchlistService.addToWatchlist(id, type);
    },
    []
  );

  const removeFromWatchlist = useCallback((id: number, type: 'movie' | 'tv') => {
    watchlistService.removeFromWatchlist(id, type);
  }, []);

  const isInWatchlist = useCallback(
    (id: number, type: 'movie' | 'tv') => {
      return watchlist.some((item) => item.id === id && item.type === type);
    },
    [watchlist]
  );

  // ── History actions ──

  const recordProgress = useCallback(
    (
      tmdbId: number,
      mediaType: 'movie' | 'tv',
      season?: number,
      episode?: number
    ) => {
      historyService.recordProgress(tmdbId, mediaType, season, episode);
    },
    []
  );

  const addOrUpdateHistory = useCallback(
    (
      tmdbId: number,
      mediaType: 'movie' | 'tv',
      season?: number,
      episode?: number
    ) => {
      historyService.addOrUpdateHistory(tmdbId, mediaType, season, episode);
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
