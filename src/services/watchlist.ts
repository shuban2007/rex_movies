import type { WatchlistItem } from '../types/database';
import type { MediaSearchResult, TvSeriesDetails, MovieSearchResult } from './tmdb';

const STORAGE_KEY = 'rexio_watchlist';
const LEGACY_SESSION_KEY = 'guest_watchlist';

// ── Safe localStorage helpers ──────────────────────────────

function readWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Filter out malformed records
    return parsed.filter(
      (item: any) =>
        item &&
        typeof item.tmdb_id === 'number' &&
        typeof item.media_type === 'string' &&
        typeof item.title === 'string'
    );
  } catch {
    return [];
  }
}

function writeWatchlist(list: WatchlistItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

// ── One-time migration from sessionStorage ─────────────────

let migrationDone = false;

function migrateFromSessionStorage(): void {
  if (migrationDone) return;
  migrationDone = true;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return; // Already has localStorage data, skip migration

    const sessionData = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!sessionData) return;

    const parsed = JSON.parse(sessionData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normalize: ensure media_type exists
      const migrated = parsed.map((item: any) => ({
        id: item.id || `migrated_${item.tmdb_id}_${item.media_type || 'movie'}`,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type || 'movie',
        title: item.title || '',
        year: item.year || null,
        poster_path: item.poster_path || null,
        backdrop_path: item.backdrop_path || null,
        created_at: item.created_at || new Date().toISOString(),
      }));
      writeWatchlist(migrated);
    }

    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Migration failed — skip silently, don't crash
  }
}

// ── Service ────────────────────────────────────────────────

export const watchlistService = {
  /**
   * Get the full watchlist from localStorage.
   */
  getWatchlist(): WatchlistItem[] {
    migrateFromSessionStorage();
    return readWatchlist();
  },

  /**
   * Check if a specific item is in the watchlist.
   * Unique key: tmdb_id + media_type
   */
  isInWatchlist(tmdbId: number, mediaType: string = 'movie'): boolean {
    const list = readWatchlist();
    return list.some(item => item.tmdb_id === tmdbId && item.media_type === mediaType);
  },

  /**
   * Synchronous check from an in-memory snapshot (backwards compat).
   * Now just delegates to isInWatchlist.
   */
  isInWatchlistSync(tmdbId: number): boolean {
    const list = readWatchlist();
    return list.some(item => item.tmdb_id === tmdbId);
  },

  /**
   * Add media to watchlist. No-op if already present (no duplicates).
   */
  addMedia(
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv'
  ): boolean {
    migrateFromSessionStorage();
    const list = readWatchlist();

    // Check for duplicate by tmdb_id + media_type
    if (list.some(item => item.tmdb_id === media.id && item.media_type === mediaType)) {
      return true; // Already exists
    }

    list.unshift({
      id: `${mediaType}_${media.id}`,
      tmdb_id: media.id,
      media_type: mediaType,
      title: media.title,
      year: media.year,
      poster_path: media.posterPath || (media as any).backdropPath || null,
      backdrop_path: media.backdropPath || null,
      created_at: new Date().toISOString(),
    });

    writeWatchlist(list);
    window.dispatchEvent(new Event('watchlist-updated'));
    return true;
  },

  /**
   * Remove media from watchlist by tmdb_id + media_type.
   */
  removeMedia(tmdbId: number, mediaType: string = 'movie'): boolean {
    const list = readWatchlist();
    const filtered = list.filter(
      item => !(item.tmdb_id === tmdbId && item.media_type === mediaType)
    );

    if (filtered.length === list.length) return false; // Nothing removed

    writeWatchlist(filtered);
    window.dispatchEvent(new Event('watchlist-updated'));
    return true;
  },
};
