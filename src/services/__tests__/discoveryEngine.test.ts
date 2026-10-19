import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifyContent,
  scoreSearchCandidate,
  parseSearchIntent,
  damerauLevenshtein,
  generateVariants,
  searchContent,
  clearSearchCache,
  BoundedTTLCache,
  getRecommendations,
  getDiscoveryContent,
  type DiscoveryItem
} from '../discoveryEngine';
import * as tmdbModule from '../tmdb';

describe('Discovery Engine — Stage A Tests', () => {
  beforeEach(() => {
    clearSearchCache();
    tmdbModule.clearApiCache();
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Anime Classification
  // ─────────────────────────────────────────────────────────────
  describe('classifyContent — Anime Classification', () => {
    it('classifies Japanese animation with animation genre and Japan as anime: true', () => {
      const item = {
        id: 1,
        title: 'Attack on Titan',
        genre_ids: [16, 10759],
        original_language: 'ja',
        productionCountries: ['JP'],
        media_type: 'tv'
      };
      const result = classifyContent(item);
      expect(result.isAnime).toBe('true');
      expect(result.mediaType).toBe('tv');
    });

    it('classifies anime keyword with high confidence even with missing country', () => {
      const item = {
        id: 2,
        name: 'Demon Slayer',
        genreIds: [16],
        keywords: [{ id: 1, name: 'anime' }],
        originalLanguage: 'ja',
        mediaType: 'tv'
      };
      const result = classifyContent(item);
      expect(result.isAnime).toBe('true');
    });

    it('classifies Western animation (e.g. Toy Story / Disney) as non-anime (score < 2)', () => {
      const item = {
        id: 3,
        title: 'Toy Story',
        genre_ids: [16, 10751, 35],
        original_language: 'en',
        productionCountries: ['US'],
        media_type: 'movie'
      };
      const result = classifyContent(item);
      expect(result.isAnime).toBe('unknown'); // score 1: animation only
    });

    it('classifies live-action non-Japanese content as anime: false', () => {
      const item = {
        id: 4,
        title: 'Inception',
        genre_ids: [28, 878],
        original_language: 'en',
        productionCountries: ['US'],
        media_type: 'movie'
      };
      const result = classifyContent(item);
      expect(result.isAnime).toBe('false');
    });

    it('preserves and extracts originalTitle correctly', () => {
      const item = {
        id: 5,
        title: 'Spirited Away',
        original_title: '千と千尋の神隠し',
        original_language: 'ja',
        genre_ids: [16, 14],
        media_type: 'movie'
      };
      const result = classifyContent(item);
      expect(result.originalTitle).toBe('千と千尋の神隠し');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Natural-Language Query Parsing (parseSearchIntent)
  // ─────────────────────────────────────────────────────────────
  describe('parseSearchIntent — Deterministic Parsing', () => {
    it('parses "Tom Cruise action 90s" with genre Action and decade 1990s', () => {
      const intent = parseSearchIntent('Tom Cruise action 90s');
      expect(intent.genres.some(g => g.name === 'Action' && g.id === 28)).toBe(true);
      expect(intent.decade).toEqual({ label: '1990s', startYear: 1990, endYear: 1999 });
      expect(intent.cleanedQuery.toLowerCase()).toContain('tom cruise');
      expect(intent.chips.some(c => c.type === 'genre' && c.value === 28)).toBe(true);
      expect(intent.chips.some(c => c.type === 'decade' && c.value === '1990s')).toBe(true);
    });

    it('parses "Japanese anime 2024" with mediaType anime and explicit year 2024', () => {
      const intent = parseSearchIntent('Japanese anime 2024');
      expect(intent.isAnime).toBe(true);
      expect(intent.mediaType).toBe('anime');
      expect(intent.year).toBe(2024);
      expect(intent.chips.some(c => c.type === 'mediaType' && c.value === 'anime')).toBe(true);
      expect(intent.chips.some(c => c.type === 'year' && c.value === 2024)).toBe(true);
    });

    it('parses "latest sci-fi movies" with sort latest, genre Sci-Fi (878), and mediaType movie', () => {
      const intent = parseSearchIntent('latest sci-fi movies');
      expect(intent.sortBy).toBe('latest');
      expect(intent.mediaType).toBe('movie');
      expect(intent.genres.some(g => g.id === 878)).toBe(true);
      expect(intent.chips.some(c => c.type === 'sort' && c.value === 'latest')).toBe(true);
      expect(intent.chips.some(c => c.type === 'genre' && c.value === 878)).toBe(true);
    });

    it('parses person intent when using "directed by" or "starring"', () => {
      const intent = parseSearchIntent('movies directed by Christopher Nolan in 2020');
      expect(intent.personName?.toLowerCase()).toBe('christopher nolan');
      expect(intent.mediaType).toBe('movie');
      expect(intent.year).toBe(2020);
    });

    it('handles ambiguous query like "1917" without stripping it into an empty textQuery', () => {
      const intent = parseSearchIntent('1917');
      expect(intent.rawQuery).toBe('1917');
      // Should not strip "1917" out of text matching since it is the entire query!
      expect(intent.textQuery).toBe('1917');
    });

    it('handles single genre word like "Action" without stripping it completely', () => {
      const intent = parseSearchIntent('Action');
      // For pure single genre word query, textQuery remains "Action" so title search can run
      expect(intent.textQuery.toLowerCase()).toBe('action');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Typo Recovery & Damerau-Levenshtein
  // ─────────────────────────────────────────────────────────────
  describe('Typo Recovery & Transpositions', () => {
    it('calculates Damerau-Levenshtein edit distance correctly for adjacent transpositions', () => {
      // Adjacent character swap has distance 1
      expect(damerauLevenshtein('interstellar', 'insterstellar')).toBe(1);
      expect(damerauLevenshtein('spiderman', 'spidreman')).toBe(1);
      expect(damerauLevenshtein('matrix', 'mtarix')).toBe(1);
    });

    it('calculates edit distance for character omission or addition', () => {
      expect(damerauLevenshtein('batman', 'batmn')).toBe(1);
      expect(damerauLevenshtein('avatar', 'avataar')).toBe(1);
    });

    it('generates transposition variants for words with typos', () => {
      const variants = generateVariants('itnerstellar', ['itnerstellar']);
      expect(variants).toContain('interstellar');
    });

    it('generates collapsed repeat variants', () => {
      const variants = generateVariants('batttman', ['batttman']);
      expect(variants).toContain('batman');
    });

    it('generates phonetic substitution variants', () => {
      const variants = generateVariants('fantum', ['fantum']);
      expect(variants.some(v => v.includes('phantum'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Multi-Tier Ranking Priority
  // ─────────────────────────────────────────────────────────────
  describe('scoreSearchCandidate — Ranking Priority', () => {
    const baseCandidate: DiscoveryItem = {
      id: 101,
      mediaType: 'movie',
      title: 'Interstellar',
      originalTitle: 'Interstellar',
      year: '2014',
      posterPath: '/path.jpg',
      backdropPath: null,
      overview: 'Space journey',
      genres: [878, 18],
      keywords: ['space', 'wormhole'],
      originalLanguage: 'en',
      productionCountries: ['US'],
      releaseYear: 2014,
      voteAverage: 8.6,
      popularity: 150,
      isAnime: 'false'
    };

    it('ranks exact title match higher than exact original title match', () => {
      const exactTitleCandidate: DiscoveryItem = {
        ...baseCandidate,
        id: 1,
        title: 'Shingeki no Kyojin',
        originalTitle: 'Attack on Titan'
      };
      const exactOriginalCandidate: DiscoveryItem = {
        ...baseCandidate,
        id: 2,
        title: 'Attack on Titan',
        originalTitle: 'Shingeki no Kyojin'
      };

      const score1 = scoreSearchCandidate('Shingeki no Kyojin', ['shingeki', 'kyojin'], exactTitleCandidate, 0);
      const score2 = scoreSearchCandidate('Shingeki no Kyojin', ['shingeki', 'kyojin'], exactOriginalCandidate, 0);

      // Exact title match (rankTier 1) vs Exact original title match (rankTier 2)
      expect(score1.rankTier).toBe(1);
      expect(score2.rankTier).toBe(2);
      expect(score1.finalScore).toBeGreaterThan(score2.finalScore);
    });

    it('ranks exact original title match higher than prefix/fuzzy match', () => {
      const origMatch: DiscoveryItem = {
        ...baseCandidate,
        id: 3,
        title: 'Spirited Away',
        originalTitle: 'Sen to Chihiro no Kamikakushi'
      };
      const prefixMatch: DiscoveryItem = {
        ...baseCandidate,
        id: 4,
        title: 'Sen to Chihiro: The Journey',
        originalTitle: 'Something Else'
      };

      const scoreOrig = scoreSearchCandidate('Sen to Chihiro no Kamikakushi', ['sen', 'chihiro', 'kamikakushi'], origMatch, 0);
      const scorePrefix = scoreSearchCandidate('Sen to Chihiro no Kamikakushi', ['sen', 'chihiro', 'kamikakushi'], prefixMatch, 0.4);

      expect(scoreOrig.rankTier).toBe(2);
      expect(scorePrefix.rankTier).toBeGreaterThanOrEqual(3);
      expect(scoreOrig.finalScore).toBeGreaterThan(scorePrefix.finalScore);
    });

    it('ranks transposition match (edit distance 1) above weak fuzzy match', () => {
      const transpositionCandidate: DiscoveryItem = {
        ...baseCandidate,
        title: 'Interstellar'
      };
      const weakCandidate: DiscoveryItem = {
        ...baseCandidate,
        title: 'Stellar Odyssey'
      };

      const scoreTransposition = scoreSearchCandidate('insterstellar', ['insterstellar'], transpositionCandidate, 0.3);
      const scoreWeak = scoreSearchCandidate('insterstellar', ['insterstellar'], weakCandidate, 0.6);

      expect(scoreTransposition.finalScore).toBeGreaterThan(scoreWeak.finalScore);
    });

    it('uses popularity and vote average as tie-breakers when base rank is identical', () => {
      const popularItem: DiscoveryItem = {
        ...baseCandidate,
        id: 10,
        popularity: 500,
        voteAverage: 9.0
      };
      const obscureItem: DiscoveryItem = {
        ...baseCandidate,
        id: 11,
        popularity: 5,
        voteAverage: 5.0
      };

      const scorePop = scoreSearchCandidate('Interstellar', ['interstellar'], popularItem, 0);
      const scoreObscure = scoreSearchCandidate('Interstellar', ['interstellar'], obscureItem, 0);

      expect(scorePop.rankTier).toBe(scoreObscure.rankTier);
      expect(scorePop.finalScore).toBeGreaterThan(scoreObscure.finalScore);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Caching & Deduplication (TTL, In-Flight & Cache Invalidation)
  // ─────────────────────────────────────────────────────────────
  describe('BoundedTTLCache & Deduplication', () => {
    it('expires items when TTL has passed', () => {
      const cache = new BoundedTTLCache<string>(10, 50); // 50ms TTL
      cache.set('testKey', 'testValue');
      expect(cache.get('testKey')).toBe('testValue');

      // Mock Date.now to simulate time passing beyond TTL
      const originalNow = Date.now;
      try {
        Date.now = () => originalNow() + 100; // +100ms
        expect(cache.get('testKey')).toBeUndefined();
      } finally {
        Date.now = originalNow;
      }
    });

    it('evicts oldest items when limit is exceeded (LRU behavior)', () => {
      const cache = new BoundedTTLCache<number>(2, 10000);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBe(1); // refreshes 'a'
      cache.set('c', 3); // should evict 'b'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });

    it('deduplicates in-flight calls to searchContent with the same key', async () => {
      const mockResults = [
        {
          id: 550,
          mediaType: 'movie' as const,
          title: 'Fight Club',
          year: '1999',
          posterPath: '/path.jpg',
          backdropPath: null,
          overview: 'Club',
          voteAverage: 8.4,
          popularity: 80
        }
      ];

      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue(mockResults);

      // Launch 3 simultaneous search calls for identical query and options
      const [res1, res2, res3] = await Promise.all([
        searchContent('fight club'),
        searchContent('fight club'),
        searchContent('fight club')
      ]);

      expect(res1.results.length).toBe(1);
      expect(res2.results.length).toBe(1);
      expect(res3.results.length).toBe(1);
      // Underlying searchMulti network call must only have been invoked ONCE
      expect(searchMultiSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Pagination & Result Deduplication
  // ─────────────────────────────────────────────────────────────
  describe('Pagination & Dedup in searchContent', () => {
    it('returns unique results when identical item IDs are returned in fallbacks', async () => {
      const duplicateData = [
        {
          id: 123,
          mediaType: 'movie' as const,
          title: 'Dune',
          year: '2021',
          posterPath: '/dune.jpg',
          backdropPath: null,
          overview: 'Spice',
          voteAverage: 8.0,
          popularity: 200
        },
        {
          id: 123,
          mediaType: 'movie' as const,
          title: 'Dune',
          year: '2021',
          posterPath: '/dune.jpg',
          backdropPath: null,
          overview: 'Spice',
          voteAverage: 8.0,
          popularity: 200
        }
      ];

      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue(duplicateData);

      const res = await searchContent('dune', { page: 1 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe(123);
    });

    it('passes page parameter through to TMDB service', async () => {
      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([]);

      await searchContent('matrix', { page: 3 });
      expect(searchMultiSpy).toHaveBeenCalledWith('matrix', 3, undefined);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. AbortSignal Cancellation
  // ─────────────────────────────────────────────────────────────
  describe('AbortSignal handling', () => {
    it('cancels immediately if AbortSignal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(searchContent('interstellar', { signal: controller.signal })).rejects.toThrow('Aborted');
    });

    it('cancels promise when signal aborts during in-flight search', async () => {
      const controller = new AbortController();
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([]), 500);
        });
      });

      const searchPromise = searchContent('slow query', { signal: controller.signal });
      setTimeout(() => controller.abort(), 10);

      await expect(searchPromise).rejects.toThrow('Aborted');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Recommendation and Random-Discovery Regressions
  // ─────────────────────────────────────────────────────────────
  describe('Recommendation and Random-Discovery Regressions', () => {
    it('getRecommendations prioritizes franchise collection matches (+1000)', async () => {
      const sourceMovie = {
        id: 101,
        title: 'Star Wars: A New Hope',
        mediaType: 'movie' as const,
        year: '1977',
        posterPath: '/sw1.jpg',
        backdropPath: null,
        overview: 'Jedi',
        belongsToCollection: { id: 10, name: 'Star Wars Collection' },
        recommendations: [
          {
            id: 102,
            title: 'The Empire Strikes Back',
            mediaType: 'movie',
            belongs_to_collection: { id: 10 },
            genre_ids: [28, 878]
          },
          {
            id: 200,
            title: 'Unrelated Sci-Fi Film',
            mediaType: 'movie',
            genre_ids: [28, 878]
          }
        ]
      };

      vi.spyOn(tmdbModule, 'getMovieDetails').mockResolvedValue(sourceMovie as any);

      const recommendations = await getRecommendations(101, 'movie');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].id).toBe(102); // Empire Strikes Back must rank first due to collection match
    });

    it('getDiscoveryContent returns classified, deduplicated items sorted by popularity', async () => {
      const mockTrending = [
        {
          id: 501,
          title: 'Movie A',
          mediaType: 'movie' as const,
          year: '2024',
          posterPath: '/a.jpg',
          backdropPath: null,
          overview: '',
          popularity: 250,
          voteAverage: 8.1
        },
        {
          id: 502,
          title: 'Movie B',
          mediaType: 'movie' as const,
          year: '2024',
          posterPath: '/b.jpg',
          backdropPath: null,
          overview: '',
          popularity: 500,
          voteAverage: 7.9
        }
      ];

      vi.spyOn(tmdbModule, 'getTrendingMovies').mockResolvedValue(mockTrending);
      vi.spyOn(tmdbModule, 'getHomeSection').mockResolvedValue([]);

      const discovery = await getDiscoveryContent({ type: 'movie' });
      expect(discovery.length).toBe(2);
      expect(discovery[0].id).toBe(502); // 500 popularity before 250 popularity
      expect(discovery[0].isAnime).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Typo Recovery & Empty Result Regressions
  // ─────────────────────────────────────────────────────────────
  describe('Typo Recovery & Empty Result Regressions', () => {
    const mockInterstellar = {
      id: 157336,
      mediaType: 'movie' as const,
      title: 'Interstellar',
      year: '2014',
      posterPath: '/gEU2QniE6EwfVDxCzsxPnTeft0.jpg',
      backdropPath: null,
      overview: 'The adventures of a group of explorers...',
      genreIds: [12, 18, 878],
      voteAverage: 8.4,
      popularity: 140
    };

    it('recovers from "interstellr" typo, returning Interstellar and didYouMean: "Interstellar"', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        const norm = q.toLowerCase().trim();
        // Live TMDB returns empty for typo 'interstellr'
        if (norm === 'interstellr') return [];
        // Variant matches: 'interstellar' or stem 'interstell'
        if (norm === 'interstellar' || norm === 'interstell') {
          return [mockInterstellar];
        }
        return [];
      });

      const res = await searchContent('interstellr');
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].title).toBe('Interstellar');
      expect(res.results[0].id).toBe(157336);
      expect(res.didYouMean).toBe('Interstellar');
    });

    it('recovers from transposition typo "interstelalr", returning Interstellar and didYouMean', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        const norm = q.toLowerCase().trim();
        if (norm === 'interstelalr') return [];
        if (norm === 'interstellar' || norm === 'interstel') {
          return [mockInterstellar];
        }
        return [];
      });

      const res = await searchContent('interstelalr');
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].title).toBe('Interstellar');
      expect(res.didYouMean).toBe('Interstellar');
    });

    it('exact query "Interstellar" returns exact match and does not suggest didYouMean', async () => {
      const searchMultiSpy = vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        if (q.toLowerCase().includes('interstellar')) return [mockInterstellar];
        return [];
      });

      const res = await searchContent('Interstellar');
      expect(res.results.length).toBe(1);
      expect(res.results[0].title).toBe('Interstellar');
      expect(res.didYouMean).toBeUndefined();
      // Should not fire fallback variant searches when primary match is exact
      expect(searchMultiSpy).toHaveBeenCalledTimes(1);
    });

    it('genuinely nonexistent query returns empty array and no fabricated suggestion', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockResolvedValue([]);

      const res = await searchContent('xyzqweasdzxc123');
      expect(res.results).toEqual([]);
      expect(res.didYouMean).toBeUndefined();
    });

    it('handles upstream TMDB API errors and empty responses gracefully without throwing', async () => {
      vi.spyOn(tmdbModule, 'searchMulti').mockRejectedValue(new Error('500 Internal Server Error'));

      const res = await searchContent('error query');
      expect(res.results).toEqual([]);
      expect(res.didYouMean).toBeUndefined();
    });

    it('ranks multiple candidate corrections and picks closest by Damerau-Levenshtein distance', async () => {
      const mockGladiator = {
        id: 98,
        mediaType: 'movie' as const,
        title: 'Gladiator',
        year: '2000',
        posterPath: '/path1.jpg',
        backdropPath: null,
        overview: 'A former Roman General...',
        genreIds: [28, 18, 12],
        voteAverage: 8.2,
        popularity: 90
      };
      const mockGladiatorsOfRome = {
        id: 99,
        mediaType: 'movie' as const,
        title: 'Gladiators of Rome',
        year: '2012',
        posterPath: '/path2.jpg',
        backdropPath: null,
        overview: 'Animation comedy',
        genreIds: [16, 35],
        voteAverage: 5.5,
        popularity: 15
      };

      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation(async (q) => {
        const norm = q.toLowerCase();
        if (norm === 'gladiatr') return [];
        if (norm.includes('gladiator') || norm.includes('gladiat')) {
          return [mockGladiatorsOfRome, mockGladiator];
        }
        return [];
      });

      const res = await searchContent('gladiatr');
      expect(res.results.length).toBe(2);
      expect(res.results[0].title).toBe('Gladiator');
      expect(res.didYouMean).toBe('Gladiator');
    });

    it('handles rapidly changing queries and stale-response cancellation using AbortSignal', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      let resolveSlowSearch: (val: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolveSlowSearch = resolve;
      });

      vi.spyOn(tmdbModule, 'searchMulti').mockImplementation((q) => {
        if (q === 'query1') return slowPromise as any;
        return Promise.resolve([mockInterstellar]);
      });

      // Start Query 1
      const p1 = searchContent('query1', { signal: controller1.signal });

      // User types query2 quickly: abort query 1
      controller1.abort();

      // Start Query 2
      const p2 = searchContent('interstellar', { signal: controller2.signal });

      // Query 1 should reject due to abort
      await expect(p1).rejects.toThrow('Aborted');

      // Query 2 should succeed
      const res2 = await p2;
      expect(res2.results.length).toBe(1);
      expect(res2.results[0].title).toBe('Interstellar');

      // Resolve slow search to avoid dangling unresolved promise
      resolveSlowSearch!([]);
    });
  });
});

