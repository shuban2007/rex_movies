import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recentSearchesService,
  normalizeQuery,
  RECENT_SEARCHES_KEY,
  MAX_RECENT_SEARCHES,
} from '../recentSearches';

describe('recentSearchesService', () => {
  let mockStorage: Record<string, string> = {};
  const listeners: Record<string, Array<() => void>> = {};

  beforeEach(() => {
    mockStorage = {};
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }

    // Mock localStorage
    const storageMock: Storage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
      key: vi.fn((i: number) => Object.keys(mockStorage)[i] ?? null),
      get length() {
        return Object.keys(mockStorage).length;
      },
    };

    const mockWindow: any = {
      localStorage: storageMock,
      dispatchEvent: vi.fn((event: any) => {
        const type = event?.type || event;
        if (listeners[type]) {
          listeners[type].forEach((cb) => cb());
        }
        return true;
      }),
      addEventListener: vi.fn((type: string, cb: () => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(cb);
      }),
      removeEventListener: vi.fn((type: string, cb: () => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((fn) => fn !== cb);
        }
      }),
    };

    (globalThis as any).window = mockWindow;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeQuery', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeQuery('   Interstellar   ')).toBe('Interstellar');
    });

    it('collapses multiple consecutive whitespace characters into a single space', () => {
      expect(normalizeQuery('Demon    Slayer   Kimetsu')).toBe('Demon Slayer Kimetsu');
      expect(normalizeQuery('Breaking \t\n  Bad')).toBe('Breaking Bad');
    });

    it('returns empty string for empty or whitespace-only inputs', () => {
      expect(normalizeQuery('')).toBe('');
      expect(normalizeQuery('   \t  \n  ')).toBe('');
      expect(normalizeQuery(null as any)).toBe('');
      expect(normalizeQuery(undefined as any)).toBe('');
    });
  });

  describe('First-time user & empty state', () => {
    it('returns an empty array when no searches have been saved', () => {
      expect(recentSearchesService.getRecentSearches()).toEqual([]);
    });
  });

  describe('Adding and ordering queries', () => {
    it('stores 1, 2, and 3 different queries in reverse chronological order', () => {
      recentSearchesService.addRecentSearch('Interstellar');
      expect(recentSearchesService.getRecentSearches()).toEqual(['Interstellar']);

      recentSearchesService.addRecentSearch('Demon Slayer');
      expect(recentSearchesService.getRecentSearches()).toEqual(['Demon Slayer', 'Interstellar']);

      recentSearchesService.addRecentSearch('Breaking Bad');
      expect(recentSearchesService.getRecentSearches()).toEqual([
        'Breaking Bad',
        'Demon Slayer',
        'Interstellar',
      ]);
    });

    it('removes the oldest entry when a 4th query is added (keeps max 3)', () => {
      recentSearchesService.addRecentSearch('Interstellar');
      recentSearchesService.addRecentSearch('Demon Slayer');
      recentSearchesService.addRecentSearch('Breaking Bad');
      recentSearchesService.addRecentSearch('Attack on Titan');

      const result = recentSearchesService.getRecentSearches();
      expect(result).toEqual(['Attack on Titan', 'Breaking Bad', 'Demon Slayer']);
      expect(result).toHaveLength(MAX_RECENT_SEARCHES);
      expect(result).not.toContain('Interstellar');
    });

    it('moves an existing query to the top without duplication when searched again', () => {
      recentSearchesService.addRecentSearch('Interstellar');
      recentSearchesService.addRecentSearch('Demon Slayer');
      recentSearchesService.addRecentSearch('Breaking Bad');

      // Re-search Demon Slayer
      recentSearchesService.addRecentSearch('Demon Slayer');
      expect(recentSearchesService.getRecentSearches()).toEqual([
        'Demon Slayer',
        'Breaking Bad',
        'Interstellar',
      ]);
    });

    it('matches duplicates case-insensitively and updates casing to newest input', () => {
      recentSearchesService.addRecentSearch('Interstellar');
      recentSearchesService.addRecentSearch('Demon Slayer');
      recentSearchesService.addRecentSearch('Breaking Bad');

      // Re-search with lowercase
      recentSearchesService.addRecentSearch('interstellar');
      expect(recentSearchesService.getRecentSearches()).toEqual([
        'interstellar',
        'Breaking Bad',
        'Demon Slayer',
      ]);
    });

    it('normalizes spaces when adding a query', () => {
      recentSearchesService.addRecentSearch('   Spider-Man:    No Way   Home   ');
      expect(recentSearchesService.getRecentSearches()).toEqual([
        'Spider-Man: No Way Home',
      ]);
    });

    it('ignores empty or whitespace-only queries without altering state', () => {
      recentSearchesService.addRecentSearch('Inception');
      recentSearchesService.addRecentSearch('   ');
      recentSearchesService.addRecentSearch('');

      expect(recentSearchesService.getRecentSearches()).toEqual(['Inception']);
    });
  });

  describe('Clear recent searches', () => {
    it('clears recent searches while preserving other localStorage data like watchlist and history', () => {
      // Setup other data
      (globalThis as any).window.localStorage.setItem('rexio_watchlist', JSON.stringify([{ id: 1, type: 'movie' }]));
      (globalThis as any).window.localStorage.setItem('rexio_watch_history', JSON.stringify([{ tmdbId: 2, mediaType: 'movie', watchedAt: 12345 }]));

      recentSearchesService.addRecentSearch('Interstellar');
      recentSearchesService.addRecentSearch('Dune');

      expect(recentSearchesService.getRecentSearches()).toHaveLength(2);

      // Clear recent searches
      recentSearchesService.clearRecentSearches();

      // Recent searches should be empty
      expect(recentSearchesService.getRecentSearches()).toEqual([]);
      expect((globalThis as any).window.localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();

      // Other services should remain intact
      expect((globalThis as any).window.localStorage.getItem('rexio_watchlist')).not.toBeNull();
      expect((globalThis as any).window.localStorage.getItem('rexio_watch_history')).not.toBeNull();
    });
  });

  describe('Event dispatching', () => {
    it('dispatches rexio-recent-searches-updated event on add and clear', () => {
      const listener = vi.fn();
      (globalThis as any).window.addEventListener('rexio-recent-searches-updated', listener);

      recentSearchesService.addRecentSearch('Oppenheimer');
      expect(listener).toHaveBeenCalledTimes(1);

      recentSearchesService.clearRecentSearches();
      expect(listener).toHaveBeenCalledTimes(2);

      (globalThis as any).window.removeEventListener('rexio-recent-searches-updated', listener);
    });
  });

  describe('Error handling & corrupted data', () => {
    it('handles malformed JSON gracefully', () => {
      mockStorage[RECENT_SEARCHES_KEY] = 'not-valid-json{';
      expect(recentSearchesService.getRecentSearches()).toEqual([]);
    });

    it('handles non-array stored data gracefully', () => {
      mockStorage[RECENT_SEARCHES_KEY] = JSON.stringify({ query: 'Matrix' });
      expect(recentSearchesService.getRecentSearches()).toEqual([]);
    });

    it('filters out non-string items and caps at max 3', () => {
      mockStorage[RECENT_SEARCHES_KEY] = JSON.stringify([
        'Avatar',
        123,
        null,
        '  ',
        'Gladiator',
        'Titanic',
        'Alien',
      ]);
      expect(recentSearchesService.getRecentSearches()).toEqual([
        'Avatar',
        'Gladiator',
        'Titanic',
      ]);
    });

    it('handles localStorage throwing errors gracefully', () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('Access denied');
        }),
        setItem: vi.fn(() => {
          throw new Error('Quota exceeded');
        }),
        removeItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
      };

      (globalThis as any).window.localStorage = throwingStorage;

      expect(() => recentSearchesService.getRecentSearches()).not.toThrow();
      expect(recentSearchesService.getRecentSearches()).toEqual([]);
      expect(() => recentSearchesService.addRecentSearch('Test')).not.toThrow();
      expect(() => recentSearchesService.clearRecentSearches()).not.toThrow();
    });
  });
});
