import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchContent,
  clearSearchCache,
  normalizeSearchQuery
} from '../discoveryEngine';
import * as tmdbModule from '../tmdb';

describe('Search Engine Critical Regression Tests', () => {
  const mockInterstellar: tmdbModule.MediaSearchResult = {
    id: 157336,
    title: 'Interstellar',
    originalTitle: 'Interstellar',
    mediaType: 'movie',
    year: '2014',
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropPath: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole...',
    genreIds: [12, 18, 878],
    originalLanguage: 'en',
    voteAverage: 8.4,
    popularity: 140
  };

  const mockTheDarkKnight: tmdbModule.MediaSearchResult = {
    id: 155,
    title: 'The Dark Knight',
    originalTitle: 'The Dark Knight',
    mediaType: 'movie',
    year: '2008',
    posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdropPath: '/hkBaDkMWbLaf8B1rWsKX7Ehw3Xq.jpg',
    overview: 'Batman raises the stakes in his war on crime...',
    genreIds: [18, 28, 80, 53],
    originalLanguage: 'en',
    voteAverage: 8.5,
    popularity: 120
  };

  const mockBreakingBad: tmdbModule.MediaSearchResult = {
    id: 1396,
    title: 'Breaking Bad',
    originalTitle: 'Breaking Bad',
    mediaType: 'tv',
    year: '2008',
    posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdropPath: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    overview: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine...',
    genreIds: [18, 80],
    originalLanguage: 'en',
    voteAverage: 8.9,
    popularity: 150
  };

  beforeEach(() => {
    clearSearchCache();
    tmdbModule.clearApiCache();
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Query Correctness
  // ─────────────────────────────────────────────────────────────
  describe('Query Correctness', () => {
    it('returns the expected matching title for "interstellar" when API supplies it', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockInterstellar]);

      const res = await searchContent('interstellar');
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].title).toBe('Interstellar');
      expect(res.results[0].id).toBe(157336);
      expect(res.results[0].mediaType).toBe('movie');
    });

    it('treats "interstell" and "interstellar" as distinct queries', async () => {
      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        if (q.toLowerCase() === 'interstellar') {
          return [mockInterstellar];
        }
        return [];
      });

      const resPartial = await searchContent('interstell');
      const resFull = await searchContent('interstellar');

      expect(resPartial).toBeDefined();
      expect(searchMultiSpy).toHaveBeenCalledWith('interstell', 1);
      expect(searchMultiSpy).toHaveBeenCalledWith('interstellar', 1);

      expect(resFull.results[0].title).toBe('Interstellar');
      expect(normalizeSearchQuery('interstell')).not.toBe(normalizeSearchQuery('interstellar'));
    });

    it('leading and trailing whitespace does not cause an otherwise valid search to fail', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockInterstellar]);

      const res = await searchContent('   interstellar   ');
      expect(res.results.length).toBe(1);
      expect(res.results[0].title).toBe('Interstellar');
    });

    it('handles case-insensitivity: "Interstellar" and "interstellar" resolve correctly', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockInterstellar]);

      const resUpper = await searchContent('Interstellar');
      const resLower = await searchContent('interstellar');

      expect(resUpper.results[0].title).toBe('Interstellar');
      expect(resLower.results[0].title).toBe('Interstellar');
    });

    it('empty or whitespace-only input does not trigger an invalid search or network call', async () => {
      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([]);

      const resEmpty = await searchContent('');
      const resWhitespace = await searchContent('    ');

      expect(resEmpty.results).toEqual([]);
      expect(resWhitespace.results).toEqual([]);
      expect(searchMultiSpy).not.toHaveBeenCalled();
    });

    it('returns expected results for multi-word queries "the dark knight" and "breaking bad"', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        if (q.toLowerCase().includes('dark knight')) return [mockTheDarkKnight];
        if (q.toLowerCase().includes('breaking bad')) return [mockBreakingBad];
        return [];
      });

      const resKnight = await searchContent('the dark knight');
      expect(resKnight.results.length).toBe(1);
      expect(resKnight.results[0].title).toBe('The Dark Knight');

      const resBB = await searchContent('breaking bad');
      expect(resBB.results.length).toBe(1);
      expect(resBB.results[0].title).toBe('Breaking Bad');
      expect(resBB.results[0].mediaType).toBe('tv');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Request Ordering and In-Flight Abort Handling (The Critical Bug)
  // ─────────────────────────────────────────────────────────────
  describe('Request Ordering & Abort Handling', () => {
    it('CRITICAL REGRESSION: autocomplete aborting an in-flight search does NOT poison the cache or return empty results to subsequent full search', async () => {
      // Simulate slow TMDB network call (e.g. takes 50ms)
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return [mockInterstellar];
      });

      const autocompleteController = new AbortController();

      // 1. User is typing "interstellar": autocomplete search starts
      const autocompletePromise = searchContent('interstellar', { signal: autocompleteController.signal });

      // 2. User immediately presses Enter before autocomplete finishes!
      // In MovieSearch.tsx, performSearchSubmission calls abortRef.current?.abort()
      autocompleteController.abort();

      // Autocomplete promise must reject with Aborted for that caller
      await expect(autocompletePromise).rejects.toThrow('Aborted');

      // 3. Main search results page mounts and immediately executes full search for "interstellar"
      const fullSearchRes = await searchContent('interstellar');

      // The full search MUST succeed and return Interstellar, NOT "No results found"!
      expect(fullSearchRes.results.length).toBe(1);
      expect(fullSearchRes.results[0].title).toBe('Interstellar');
      expect(fullSearchRes.results[0].id).toBe(157336);
    });

    it('deduplicates concurrent requests while respecting individual AbortSignals', async () => {
      let resolveSearch: (val: any) => void;
      const delayedFetch = new Promise((resolve) => {
        resolveSearch = resolve;
      });

      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(() => delayedFetch as any);

      const controller1 = new AbortController();
      const controller2 = new AbortController();

      // Consumer 1 (Autocomplete) starts search
      const p1 = searchContent('interstellar', { signal: controller1.signal });

      // Consumer 2 (Results Page) starts same search concurrently
      const p2 = searchContent('interstellar', { signal: controller2.signal });

      // Abort Consumer 1 only
      controller1.abort();

      await expect(p1).rejects.toThrow('Aborted');

      // Resolve the background shared network fetch
      resolveSearch!([mockInterstellar]);

      // Consumer 2 must receive the results cleanly
      const res2 = await p2;
      expect(res2.results.length).toBe(1);
      expect(res2.results[0].title).toBe('Interstellar');

      // Underlying searchMulti was only called once (deduplicated)
      expect(searchMultiSpy).toHaveBeenCalledTimes(1);
    });

    it('a slower response for an older query cannot overwrite a newer query results', async () => {
      let resolveQuery1: (val: any) => void;
      const slowQuery1 = new Promise((resolve) => {
        resolveQuery1 = resolve;
      });

      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        if (q === 'slow movie') return slowQuery1 as any;
        if (q === 'interstellar') return [mockInterstellar];
        return [];
      });

      const controller1 = new AbortController();
      const p1 = searchContent('slow movie', { signal: controller1.signal });

      // User quickly navigates to "interstellar"
      controller1.abort();
      const p2 = searchContent('interstellar');

      const res2 = await p2;
      expect(res2.results[0].title).toBe('Interstellar');

      // Older slow query resolves later
      resolveQuery1!([mockTheDarkKnight]);
      await expect(p1).rejects.toThrow('Aborted');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Caching Correctness
  // ─────────────────────────────────────────────────────────────
  describe('Caching Correctness', () => {
    it('different queries do not share cached results', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        if (q === 'interstellar') return [mockInterstellar];
        if (q === 'the dark knight' || q.includes('dark knight')) return [mockTheDarkKnight];
        return [];
      });

      const res1 = await searchContent('interstellar');
      const res2 = await searchContent('the dark knight');

      expect(res1.results[0].title).toBe('Interstellar');
      expect(res2.results[0].title).toBe('The Dark Knight');
    });

    it('different media types (all vs movie vs tv) use distinct cache keys and do not reuse incompatible results', async () => {
      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockBreakingBad]);

      const resTv = await searchContent('breaking bad', { type: 'tv' });
      const resMovie = await searchContent('breaking bad', { type: 'movie' });

      // TV search returns Breaking Bad
      expect(resTv.results.length).toBe(1);
      expect(resTv.results[0].mediaType).toBe('tv');

      // Movie filter removes TV series
      expect(resMovie.results.length).toBe(0);

      // Verify that movie search didn't blindly reuse TV cache
      expect(searchMultiSpy).toHaveBeenCalledTimes(2);
    });

    it('a failed request is NOT incorrectly cached as a successful empty result', async () => {
      let callCount = 0;
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('503 Service Unavailable');
        }
        return [mockInterstellar];
      });

      // 1. First attempt fails
      await expect(searchContent('interstellar')).rejects.toThrow('503 Service Unavailable');

      // 2. Second attempt (retry) should call API again and succeed, NOT return cached empty results
      const res = await searchContent('interstellar');
      expect(res.results.length).toBe(1);
      expect(res.results[0].title).toBe('Interstellar');
      expect(callCount).toBe(2);
    });

    it('explicit genre filter (disabled vs active) uses distinct cache keys', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockInterstellar]);

      // Filter by Action (genre 28) which Interstellar does NOT have
      const resAction = await searchContent('interstellar', { genreId: 28 });
      expect(resAction).toBeDefined();

      // Genre filter explicitly disabled (genreId: 0)
      const resNoGenre = await searchContent('interstellar', { genreId: 0 });

      expect(resNoGenre.results.length).toBe(1);
      expect(resNoGenre.results[0].title).toBe('Interstellar');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Results and Consistency
  // ─────────────────────────────────────────────────────────────
  describe('Results and Consistency', () => {
    it('genuinely empty response returns empty array', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([]);

      const res = await searchContent('totallynonexistenttitle12345');
      expect(res.results).toEqual([]);
      expect(res.didYouMean).toBeUndefined();
    });

    it('autocomplete and full search agree on discoverability of a title', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([mockInterstellar]);

      // Autocomplete call: page 1, default options
      const autocompleteRes = await searchContent('interstellar');

      // Full results page call: page 1, relevance sort, all media type
      const fullSearchRes = await searchContent('interstellar', {
        page: 1,
        type: 'all',
        sort: 'relevance'
      });

      expect(autocompleteRes.results[0].id).toBe(fullSearchRes.results[0].id);
      expect(autocompleteRes.results[0].title).toBe('Interstellar');
      expect(fullSearchRes.results[0].title).toBe('Interstellar');
    });
  });
});
