export const RECENT_SEARCHES_KEY = 'rexio_recent_searches';
export const MAX_RECENT_SEARCHES = 3;

/**
 * Normalizes a search query by trimming outer whitespace and
 * collapsing multiple contiguous whitespace characters into a single space.
 */
export function normalizeQuery(query: string): string {
  if (typeof query !== 'string') return '';
  return query.trim().replace(/\s+/g, ' ');
}

/**
 * Safely reads the list of recent searches from localStorage.
 * Handles missing, malformed, or non-array data gracefully.
 */
export function getRecentSearches(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const cleaned: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string') {
        const norm = normalizeQuery(item);
        if (norm && !cleaned.some((existing) => existing.toLowerCase() === norm.toLowerCase())) {
          cleaned.push(norm);
          if (cleaned.length >= MAX_RECENT_SEARCHES) break;
        }
      }
    }

    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Safely writes the list of recent searches to localStorage.
 */
function writeRecentSearches(searches: string[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Silently ignore storage quota or access errors
  }
}

function dispatchUpdateEvent(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('rexio-recent-searches-updated'));
    }
  } catch {
    // Ignore in non-browser or mock environments
  }
}

/**
 * Adds a new query to recent searches:
 * - Normalizes whitespace.
 * - Deduplicates case-insensitively.
 * - Moves existing matching query to the top.
 * - Keeps newest query first, capped at 3 entries.
 * - Dispatches 'rexio-recent-searches-updated' event.
 */
export function addRecentSearch(query: string): string[] {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return getRecentSearches();
  }

  const existing = getRecentSearches();
  const filtered = existing.filter(
    (item) => item.toLowerCase() !== normalized.toLowerCase()
  );

  const updated = [normalized, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  writeRecentSearches(updated);
  dispatchUpdateEvent();

  return updated;
}

export const saveRecentSearch = addRecentSearch;

/**
 * Clears all saved recent searches without touching other stored data.
 * Dispatches 'rexio-recent-searches-updated' event.
 */
export function clearRecentSearches(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  } catch {
    // Silently ignore storage errors
  }

  dispatchUpdateEvent();
}

export const recentSearchesService = {
  getRecentSearches,
  addRecentSearch,
  saveRecentSearch,
  clearRecentSearches,
  normalizeQuery,
};
