import type { WatchlistItem } from '../types/database';

const STORAGE_KEY = 'rexio_watchlist';

// ── Safe localStorage helpers ──────────────────────────────

let migrationDone = false;

function migrateFromLegacy(): void {
  if (migrationDone) return;
  migrationDone = true;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    // Detect old schema (contains tmdb_id instead of just id, or has title)
    if (parsed[0] && ('tmdb_id' in parsed[0] || 'title' in parsed[0])) {
      const migrated: WatchlistItem[] = parsed
        .map((item: any) => ({
          id: Number(item.tmdb_id || item.id),
          type: item.media_type || item.type || 'movie',
        }))
        .filter((item) => !isNaN(item.id) && (item.type === 'movie' || item.type === 'tv'));

      // Deduplicate during migration
      const unique: WatchlistItem[] = [];
      const seen = new Set<string>();
      for (const item of migrated) {
        const key = `${item.type}_${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      writeWatchlist(unique);
    }
  } catch {
    // Ignore migration errors silently
  }
}

function readWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    // Validate schema
    return parsed.filter(
      (item: any) =>
        item &&
        typeof item.id === 'number' &&
        (item.type === 'movie' || item.type === 'tv')
    );
  } catch {
    return [];
  }
}

function writeWatchlist(list: WatchlistItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Silently ignore quota exceeded or storage unavailable
  }
}

// ── Service ────────────────────────────────────────────────

export const watchlistService = {
  getWatchlist(): WatchlistItem[] {
    migrateFromLegacy();
    return readWatchlist();
  },

  isInWatchlist(id: number, type: 'movie' | 'tv'): boolean {
    migrateFromLegacy();
    const list = readWatchlist();
    return list.some((item) => item.id === id && item.type === type);
  },

  addToWatchlist(id: number, type: 'movie' | 'tv'): void {
    migrateFromLegacy();
    const list = readWatchlist();

    if (list.some((item) => item.id === id && item.type === type)) {
      return; // Prevent duplicates
    }

    list.unshift({ id, type });
    writeWatchlist(list);
    window.dispatchEvent(new Event('watchlist-updated'));
  },

  removeFromWatchlist(id: number, type: 'movie' | 'tv'): void {
    migrateFromLegacy();
    const list = readWatchlist();
    const filtered = list.filter((item) => !(item.id === id && item.type === type));

    if (filtered.length === list.length) return; // Nothing removed

    writeWatchlist(filtered);
    window.dispatchEvent(new Event('watchlist-updated'));
  },

  clearWatchlist(): void {
    writeWatchlist([]);
    window.dispatchEvent(new Event('watchlist-updated'));
  },
};
