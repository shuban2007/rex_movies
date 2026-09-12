import type { HistoryItem } from '../types/database';
import type { MediaSearchResult, TvSeriesDetails, MovieSearchResult } from './tmdb';

const STORAGE_KEY = 'rexio_watch_history';
const LEGACY_SESSION_KEY = 'guest_history';

// ── Safe localStorage helpers ──────────────────────────────

function readHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Filter out malformed records, sort newest first
    return parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.tmdb_id === 'number' &&
          typeof item.media_type === 'string' &&
          typeof item.title === 'string' &&
          typeof item.watched_at === 'string'
      )
      .sort(
        (a: HistoryItem, b: HistoryItem) =>
          new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()
      );
  } catch {
    return [];
  }
}

function writeHistory(list: HistoryItem[]): void {
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
      // Deduplicate during migration: one record per tmdb_id + media_type
      const deduped = deduplicateHistory(
        parsed.map((item: any) => ({
          id: item.id || `migrated_${item.tmdb_id}_${item.media_type || 'movie'}`,
          tmdb_id: item.tmdb_id,
          media_type: item.media_type || 'movie',
          title: item.title || '',
          year: item.year || null,
          poster_path: item.poster_path || null,
          backdrop_path: item.backdrop_path || item.poster_path || null,
          season_number: item.season_number ?? null,
          episode_number: item.episode_number ?? null,
          episode_title: item.episode_title ?? null,
          progress_seconds: item.progress ?? item.progress_seconds ?? null,
          watched_at: item.watched_at || new Date().toISOString(),
        }))
      );
      writeHistory(deduped);
    }

    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Migration failed — skip silently
  }
}

// ── Deduplication helper ───────────────────────────────────

/**
 * Keeps only the most recently watched record per tmdb_id + media_type.
 * Returns sorted by watched_at DESC.
 */
function deduplicateHistory(list: HistoryItem[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>();

  // Sort newest first so the first occurrence per key is the latest
  const sorted = [...list].sort(
    (a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()
  );

  for (const item of sorted) {
    const key = `${item.media_type}_${item.tmdb_id}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()
  );
}

// ── Debounce for progress updates ──────────────────────────

const progressTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// ── Service ────────────────────────────────────────────────

export const historyService = {
  /**
   * Get full watch history, sorted by watched_at DESC.
   * One record per tmdb_id + media_type.
   */
  getHistory(): HistoryItem[] {
    migrateFromSessionStorage();
    const list = readHistory();
    // Ensure deduplication on every read (safety net)
    const deduped = deduplicateHistory(list);
    if (deduped.length !== list.length) {
      writeHistory(deduped);
    }
    return deduped;
  },

  /**
   * Record watch progress. Enforces ONE record per tmdb_id + media_type.
   * For TV: updates the existing record with latest season/episode info.
   * Debounced to avoid excessive writes (2s delay).
   */
  recordProgress(
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number,
    episodeTitle?: string,
    progressSeconds?: number
  ): void {
    const timerKey = `${media.id}_${mediaType}`;

    if (progressTimers[timerKey]) {
      clearTimeout(progressTimers[timerKey]);
    }

    progressTimers[timerKey] = setTimeout(() => {
      migrateFromSessionStorage();

      const list = readHistory();
      const key = `${mediaType}_${media.id}`;

      // Remove existing record for this media (will be replaced)
      const filtered = list.filter(
        item => !(item.tmdb_id === media.id && item.media_type === mediaType)
      );

      // Create updated record
      const record: HistoryItem = {
        id: key,
        tmdb_id: media.id,
        media_type: mediaType,
        title: media.title,
        year: media.year,
        poster_path: media.posterPath || (media as any).backdropPath || null,
        backdrop_path: media.backdropPath || null,
        season_number: seasonNumber ?? null,
        episode_number: episodeNumber ?? null,
        episode_title: episodeTitle ?? null,
        progress_seconds: progressSeconds ?? null,
        watched_at: new Date().toISOString(),
      };

      // Insert at the top (most recent)
      filtered.unshift(record);
      writeHistory(filtered);
      window.dispatchEvent(new Event('history-updated'));

      delete progressTimers[timerKey];
    }, 2000);
  },

  /**
   * Immediately record/update history (no debounce).
   * Used for explicit actions like episode advancement.
   */
  addOrUpdateHistory(
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number,
    episodeTitle?: string,
    progressSeconds?: number
  ): void {
    migrateFromSessionStorage();

    // Cancel any pending debounced write for this media
    const timerKey = `${media.id}_${mediaType}`;
    if (progressTimers[timerKey]) {
      clearTimeout(progressTimers[timerKey]);
      delete progressTimers[timerKey];
    }

    const list = readHistory();

    // Remove existing record
    const filtered = list.filter(
      item => !(item.tmdb_id === media.id && item.media_type === mediaType)
    );

    const record: HistoryItem = {
      id: `${mediaType}_${media.id}`,
      tmdb_id: media.id,
      media_type: mediaType,
      title: media.title,
      year: media.year,
      poster_path: media.posterPath || (media as any).backdropPath || null,
      backdrop_path: media.backdropPath || null,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      episode_title: episodeTitle ?? null,
      progress_seconds: progressSeconds ?? null,
      watched_at: new Date().toISOString(),
    };

    filtered.unshift(record);
    writeHistory(filtered);
    window.dispatchEvent(new Event('history-updated'));
  },

  /**
   * Remove a single history item by tmdb_id + media_type.
   */
  removeHistoryItem(tmdbId: number, mediaType: string = 'movie'): void {
    const list = readHistory();
    const filtered = list.filter(
      item => !(item.tmdb_id === tmdbId && item.media_type === mediaType)
    );
    writeHistory(filtered);
    window.dispatchEvent(new Event('history-updated'));
  },

  /**
   * Clear all history.
   */
  clearHistory(): void {
    writeHistory([]);
    // Cancel all pending debounced writes
    for (const key of Object.keys(progressTimers)) {
      clearTimeout(progressTimers[key]);
      delete progressTimers[key];
    }
    window.dispatchEvent(new Event('history-updated'));
  },
};
