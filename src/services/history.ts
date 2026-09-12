import type { HistoryItem } from '../types/database';

const STORAGE_KEY = 'rexio_watch_history';

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

    // Detect old schema (contains title or id as string)
    if (parsed[0] && ('title' in parsed[0] || typeof parsed[0].watchedAt === 'string' || typeof parsed[0].watched_at === 'string')) {
      const migrated: HistoryItem[] = parsed
        .map((item: any) => ({
          tmdbId: Number(item.tmdb_id || item.tmdbId),
          mediaType: item.media_type || item.mediaType || 'movie',
          watchedAt: item.watched_at ? new Date(item.watched_at).getTime() : (item.watchedAt || Date.now()),
          season: item.season_number ?? item.season ?? undefined,
          episode: item.episode_number ?? item.episode ?? undefined,
        }))
        .filter((item) => !isNaN(item.tmdbId) && (item.mediaType === 'movie' || item.mediaType === 'tv'));

      // Deduplicate keeping latest watchedAt
      const deduped = deduplicateHistory(migrated);
      writeHistory(deduped);
    }
  } catch {
    // Silently ignore migration errors
  }
}

function readHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.tmdbId === 'number' &&
          (item.mediaType === 'movie' || item.mediaType === 'tv') &&
          typeof item.watchedAt === 'number'
      )
      .sort((a, b) => b.watchedAt - a.watchedAt);
  } catch {
    return [];
  }
}

function writeHistory(list: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota exceeded
  }
}

function deduplicateHistory(list: HistoryItem[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>();
  const sorted = [...list].sort((a, b) => b.watchedAt - a.watchedAt);

  for (const item of sorted) {
    const key = `${item.mediaType}_${item.tmdbId}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.watchedAt - a.watchedAt);
}

// ── Debounce for progress updates ──────────────────────────

const progressTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// ── Service ────────────────────────────────────────────────

export const historyService = {
  getHistory(): HistoryItem[] {
    migrateFromLegacy();
    const list = readHistory();
    const deduped = deduplicateHistory(list);
    if (deduped.length !== list.length) {
      writeHistory(deduped);
    }
    return deduped;
  },

  recordProgress(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): void {
    const timerKey = `${mediaType}_${tmdbId}`;

    if (progressTimers[timerKey]) {
      clearTimeout(progressTimers[timerKey]);
    }

    progressTimers[timerKey] = setTimeout(() => {
      historyService.addOrUpdateHistory(tmdbId, mediaType, season, episode);
      delete progressTimers[timerKey];
    }, 2000);
  },

  addOrUpdateHistory(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ): void {
    migrateFromLegacy();

    const timerKey = `${mediaType}_${tmdbId}`;
    if (progressTimers[timerKey]) {
      clearTimeout(progressTimers[timerKey]);
      delete progressTimers[timerKey];
    }

    const list = readHistory();
    const filtered = list.filter((item) => !(item.tmdbId === tmdbId && item.mediaType === mediaType));

    filtered.unshift({
      tmdbId,
      mediaType,
      watchedAt: Date.now(),
      season,
      episode,
    });

    writeHistory(filtered);
    window.dispatchEvent(new Event('history-updated'));
  },

  removeHistoryItem(tmdbId: number, mediaType: 'movie' | 'tv'): void {
    migrateFromLegacy();
    const list = readHistory();
    const filtered = list.filter((item) => !(item.tmdbId === tmdbId && item.mediaType === mediaType));
    
    if (filtered.length !== list.length) {
      writeHistory(filtered);
      window.dispatchEvent(new Event('history-updated'));
    }
  },

  clearHistory(): void {
    writeHistory([]);
    for (const key of Object.keys(progressTimers)) {
      clearTimeout(progressTimers[key]);
      delete progressTimers[key];
    }
    window.dispatchEvent(new Event('history-updated'));
  },
};
