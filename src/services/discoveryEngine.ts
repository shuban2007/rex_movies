import Fuse from 'fuse.js';
import { searchMulti, getHomeSection, getMovieDetails, getTvDetails, getTrendingMovies, type MediaSearchResult } from './tmdb';
import { WATCH_RANDOM_MOOD_MAPPING } from '../config/watchRandomCompatibility';
import {
  WATCH_RANDOM_ERAS,
  WATCH_RANDOM_RATINGS,
  WATCH_RANDOM_TV_STATUS,
  WATCH_RANDOM_MOVIE_RUNTIMES
} from '../config/watchRandomConfig';

// ── Types ─────────────────────────────────────────────────────────────

export type AnimeConfidence = 'true' | 'false' | 'unknown';
export type ContentType = 'movie' | 'tv' | 'anime' | 'all';

export interface DiscoveryItem extends MediaSearchResult {
  isAnime: AnimeConfidence;
  genres: number[];
  keywords: string[];
  originalLanguage: string;
  productionCountries: string[];
  collectionId?: number;
  releaseYear: number | null;
  // voteAverage and popularity are already in MediaSearchResult
}

export interface SearchOptions {
  page?: number;
  type?: ContentType;
  sort?: 'relevance' | 'trending' | 'latest';
  signal?: AbortSignal;
}

export interface AdvancedSearchResult {
  results: DiscoveryItem[];
  didYouMean?: string;
}

export interface WatchRandomPreferences {
  genres: string[];
  era: string;
  rating: string;
  runtime: string; // Movie only
  status: string; // TV only
  mood: string | null;
}

// ── In-memory Search Cache (Bounded) ──────────────────────────────────
const searchCache = new Map<string, AdvancedSearchResult>();
const CACHE_LIMIT = 50;

function setCache(key: string, value: AdvancedSearchResult) {
  if (searchCache.size >= CACHE_LIMIT) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, value);
}

// ── Classification Engine ─────────────────────────────────────────────

export function classifyContent(item: any, mediaType?: 'movie' | 'tv'): DiscoveryItem {
  const type = mediaType || item.mediaType || item.media_type || (item.name ? 'tv' : 'movie');
  
  const genres = item.genres 
    ? item.genres.map((g: any) => g.id || g) 
    : item.genreIds || item.genre_ids || [];
    
  const keywords = item.keywords 
    ? (Array.isArray(item.keywords) ? item.keywords.map((k: any) => k.name?.toLowerCase() || k) : []) 
    : [];

  const originalLanguage = item.originalLanguage || item.original_language || '';
  const productionCountries = item.productionCountries || [];
  const collectionId = item.belongsToCollection?.id || item.belongs_to_collection?.id;

  let releaseYear = null;
  if (item.year) {
    releaseYear = parseInt(item.year, 10);
  } else if (item.release_date) {
    releaseYear = parseInt(item.release_date.split('-')[0], 10);
  } else if (item.first_air_date) {
    releaseYear = parseInt(item.first_air_date.split('-')[0], 10);
  }

  let animeScore = 0;
  if (genres.includes(16)) animeScore += 1; // Animation
  if (originalLanguage === 'ja') animeScore += 1;
  if (productionCountries.includes('JP')) animeScore += 1;
  
  const animeKeywords = ['anime', 'based on manga', 'shounen', 'seinen', 'isekai', 'mecha'];
  if (keywords.some((k: string) => animeKeywords.includes(k))) animeScore += 2;

  let isAnime: AnimeConfidence = 'unknown';
  if (animeScore >= 2) isAnime = 'true';
  else if (animeScore === 0) isAnime = 'false';

  return {
    id: item.id,
    mediaType: type,
    title: item.title || item.name || '',
    year: releaseYear ? releaseYear.toString() : null,
    posterPath: item.posterPath || item.poster_path || null,
    backdropPath: item.backdropPath || item.backdrop_path || null,
    overview: item.overview || '',
    genreIds: genres,
    originalLanguage,
    voteAverage: item.voteAverage || item.vote_average || 0,
    popularity: item.popularity || 0,
    isAnime,
    genres,
    keywords,
    productionCountries,
    collectionId,
    releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
  };
}

// ── Search & Typo Engine Helpers ──────────────────────────────────────

function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'part', 'anime']);

function normalizeTitleToken(token: string): string {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    if (token.endsWith('ies')) return token.slice(0, -3) + 'y';
    if (token.endsWith('oes')) return token.slice(0, -2);
    return token.slice(0, -1);
  }
  return token;
}

function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchQuery(query)
    .split(' ')
    .filter(t => t.length > 0)
    .filter(t => !STOP_WORDS.has(t))
    .map(normalizeTitleToken);
}

function isExactTitleMatch(query: string, candidateTitle: string): boolean {
  const normQuery = normalizeSearchQuery(query);
  const normCandidate = normalizeSearchQuery(candidateTitle);
  return normQuery === normCandidate || normCandidate.includes(normQuery);
}

function generateVariants(query: string, tokens: string[]): string[] {
  const variants = new Set<string>();
  const norm = normalizeSearchQuery(query);
  if (tokens.length > 0) variants.add(tokens[0] + 's ' + tokens.slice(1).join(' '));
  if (tokens.length > 1) {
    const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
    if (longest.length > 4) variants.add(longest);
  }
  const noSpace = norm.replace(/\s+/g, '');
  if (noSpace.length > 3) variants.add(noSpace);
  const noDouble = norm.replace(/(.)\1+/g, '$1');
  if (noDouble !== norm && noDouble.length > 2) variants.add(noDouble);
  return Array.from(variants).slice(0, 3);
}

function scoreSearchCandidate(query: string, queryTokens: string[], candidate: DiscoveryItem, fuzzyScore: number) {
  const title = candidate.title || '';
  const normTitle = normalizeSearchQuery(title);
  const titleTokens = normTitle.split(' ').filter(t => t.length > 0).map(normalizeTitleToken);
  
  const totalTokens = queryTokens.length;
  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (titleTokens.includes(token)) matchedTokens += 1;
    else if (titleTokens.some(t => t.includes(token) || token.includes(t))) matchedTokens += 0.5;
  }
  
  const coverage = totalTokens > 0 ? matchedTokens / totalTokens : 1;
  let exact = 0;
  if (normTitle === normalizeSearchQuery(query)) exact = 150;
  else if (normTitle.includes(normalizeSearchQuery(query))) exact = 75;

  let missingPenalty = (totalTokens > 1 && matchedTokens < totalTokens) ? (totalTokens - matchedTokens) * 30 : 0;
  
  const finalScore = exact + (coverage * 60) + ((1 - fuzzyScore) * 20) - missingPenalty;
  return { item: candidate, coverage, finalScore };
}

// ── Search Public API ─────────────────────────────────────────────────

export async function searchContent(query: string, options: SearchOptions = {}): Promise<AdvancedSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { results: [] };
  
  const { page = 1, type = 'all', sort = 'relevance', signal } = options;
  const normQuery = normalizeSearchQuery(trimmed);
  const cacheKey = `${normQuery}:${page}:${type}:${sort}`;
  
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;
  
  const queryTokens = tokenizeSearchQuery(trimmed);
  
  // 1. Fetch TMDB (Page requested)
  const primaryResults = await searchMulti(trimmed, page, signal);
  let allResults = [...primaryResults];
  
  // 2. Typo Fallbacks (Only on page 1)
  let isStrongResult = false;
  if (page === 1) {
    if (primaryResults.length > 0) {
      if (isExactTitleMatch(trimmed, primaryResults[0].title || '')) {
        isStrongResult = true;
      } else {
        for (const res of primaryResults.slice(0, 3)) {
          const titleTokens = tokenizeSearchQuery(res.title || '');
          let matched = 0;
          for (const qt of queryTokens) if (titleTokens.includes(qt)) matched++;
          if (queryTokens.length > 0 && matched / queryTokens.length >= 0.8) {
            isStrongResult = true; break;
          }
        }
      }
    }
    
    if (!isStrongResult) {
      const variants = generateVariants(trimmed, queryTokens);
      const fallbackPromises = variants.map(v => searchMulti(v, 1, signal).catch(() => []));
      const fallbackResults = await Promise.all(fallbackPromises);
      allResults = [...primaryResults, ...fallbackResults.flat()];
    }
  }

  // 3. Deduplicate & Classify
  const uniqueMap = new Map<string, DiscoveryItem>();
  for (const item of allResults) {
    uniqueMap.set(`${item.mediaType}-${item.id}`, classifyContent(item));
  }
  let uniqueResults = Array.from(uniqueMap.values());
  if (uniqueResults.length === 0) {
    const res = { results: [] };
    setCache(cacheKey, res);
    return res;
  }

  // 4. Filtering
  if (type !== 'all') {
    uniqueResults = uniqueResults.filter(item => {
      if (type === 'anime') return item.isAnime === 'true';
      if (type === 'movie') return item.mediaType === 'movie';
      if (type === 'tv') return item.mediaType === 'tv';
      return true;
    });
  }

  // 5. Fuzzy Scoring (Fuse)
  const fuse = new Fuse(uniqueResults, {
    keys: [{ name: 'title', weight: 1.0 }],
    includeScore: true,
    threshold: 0.6,
    ignoreLocation: true,
  });
  const fuseResults = fuse.search(normQuery);
  const fuzzyMap = new Map<string, number>();
  for (const fr of fuseResults) fuzzyMap.set(`${fr.item.mediaType}-${fr.item.id}`, fr.score || 0);

  // 6. Ranking & Sorting
  let scoredResults = uniqueResults.map(item => {
    const fScore = fuzzyMap.get(`${item.mediaType}-${item.id}`) ?? 1.0;
    return scoreSearchCandidate(trimmed, queryTokens, item, fScore);
  });
  
  if (sort === 'trending') {
    scoredResults.sort((a, b) => {
      // Relevance tie-breaker if popularity is close, otherwise popularity
      const popA = a.item.popularity || 0;
      const popB = b.item.popularity || 0;
      if (Math.abs(popA - popB) < 10) return b.finalScore - a.finalScore;
      return popB - popA;
    });
  } else if (sort === 'latest') {
    scoredResults.sort((a, b) => {
      const yearA = a.item.releaseYear || 0;
      const yearB = b.item.releaseYear || 0;
      if (yearA === yearB) return b.finalScore - a.finalScore;
      return yearB - yearA;
    });
  } else {
    // Relevance
    scoredResults.sort((a, b) => b.finalScore - a.finalScore);
  }

  const bestResults = scoredResults.map(sr => sr.item);

  // 7. Did You Mean
  let didYouMean: string | undefined;
  if (page === 1 && scoredResults.length > 0 && !isStrongResult && primaryResults.length === 0) {
    const top = scoredResults[0];
    if (top.coverage >= 0.8 && top.finalScore > 30) {
       const bestTitle = top.item.title;
       if (bestTitle && normalizeSearchQuery(bestTitle) !== normQuery) {
         didYouMean = bestTitle;
       }
    }
  }

  const res = { results: bestResults, didYouMean };
  setCache(cacheKey, res);
  return res;
}

// ── Discovery (Empty Search) Public API ───────────────────────────────

export async function getDiscoveryContent(options: SearchOptions = {}): Promise<DiscoveryItem[]> {
  const { type = 'all', signal } = options;
  // Fetch a mix based on type
  try {
    let results: DiscoveryItem[] = [];
    if (type === 'all' || type === 'movie') {
      const movies = await getTrendingMovies(signal);
      results = results.concat(movies.map(m => classifyContent(m, 'movie')));
    }
    if (type === 'all' || type === 'tv' || type === 'anime') {
      const tv = await getHomeSection({
        id: 'trending-tv',
        title: 'Trending TV',
        endpoint: '/trending/tv/day',
        mediaType: 'tv',
      }, signal);
      results = results.concat(tv.map(t => classifyContent(t, 'tv')));
    }
    
    // Filter
    if (type !== 'all') {
      results = results.filter(item => {
        if (type === 'anime') return item.isAnime === 'true';
        if (type === 'movie') return item.mediaType === 'movie';
        if (type === 'tv') return item.mediaType === 'tv';
        return true;
      });
    }

    // Deduplicate
    const uniqueMap = new Map<string, DiscoveryItem>();
    for (const item of results) {
      uniqueMap.set(`${item.mediaType}-${item.id}`, item);
    }
    const finalResults = Array.from(uniqueMap.values());
    finalResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return finalResults;
  } catch (err) {
    console.error('Discovery fetch error', err);
    return [];
  }
}

// ── Recommendations Engine ────────────────────────────────────────────

export async function getRecommendations(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<DiscoveryItem[]> {
  const sourceItem = mediaType === 'movie' 
    ? await getMovieDetails(tmdbId) 
    : await getTvDetails(tmdbId);
    
  if (!sourceItem) return [];

  const sourceMetadata = classifyContent(sourceItem, mediaType);
  const candidatesMap = new Map<number, any>();
  
  const addCandidates = (items: any[]) => {
    if (!items) return;
    items.forEach(item => {
      if (item.id !== tmdbId && !candidatesMap.has(item.id)) candidatesMap.set(item.id, item);
    });
  };

  if ('recommendations' in sourceItem) addCandidates((sourceItem as any).recommendations);
  if ('similar' in sourceItem) addCandidates((sourceItem as any).similar);

  const candidates = Array.from(candidatesMap.values());
  const scored = candidates.map(candidate => {
    let score = 0;
    const candidateMeta = classifyContent(candidate);

    if (sourceMetadata.collectionId && candidateMeta.collectionId === sourceMetadata.collectionId) score += 1000;
    if (sourceMetadata.mediaType === candidateMeta.mediaType) score += 500;
    
    if (sourceMetadata.isAnime === 'true' && candidateMeta.isAnime === 'true') score += 300;
    else if (sourceMetadata.isAnime === 'false' && candidateMeta.isAnime === 'false') score += 50;
    else if (sourceMetadata.isAnime !== candidateMeta.isAnime) score -= 200;

    candidateMeta.genres.forEach(g => { if (sourceMetadata.genres.includes(g)) score += 10; });
    candidateMeta.keywords.forEach(k => { if (sourceMetadata.keywords.includes(k)) score += 5; });
    
    if (sourceMetadata.originalLanguage === candidateMeta.originalLanguage) score += 5;
    score += ((candidateMeta.voteAverage || 0) * 2);
    score += Math.min((candidateMeta.popularity || 0) / 100, 20);

    return { item: candidateMeta, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item).slice(0, 20);
}

// ── Watch Random Engine ───────────────────────────────────────────────

const TARGET_RESULTS = 10;
const MIN_RESULTS = 5;

export async function getRandomContent(
  type: ContentType, 
  preferences?: WatchRandomPreferences, 
  seenIds: Set<number> = new Set()
): Promise<DiscoveryItem | DiscoveryItem[] | null> {
  // If no preferences, run simple random
  if (!preferences) {
    const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
    const mediaType = type === 'anime' ? 'tv' : type;
    const params: Record<string, string> = {
      sort_by: 'popularity.desc',
      'vote_count.gte': '100',
      'vote_average.gte': '6'
    };
    if (type === 'anime') {
      params.with_genres = '16';
      params.with_original_language = 'ja';
    }
    
    for (let attempts = 0; attempts < 5; attempts++) {
      params.page = (Math.floor(Math.random() * 50) + 1).toString();
      try {
        const results = await getHomeSection({ id: 'random', title: 'Random', mediaType: mediaType as 'movie' | 'tv', endpoint, params });
        const validResults = results.map(i => classifyContent(i, mediaType as 'movie' | 'tv')).filter(meta => {
          if (!meta.posterPath || !meta.title || seenIds.has(meta.id)) return false;
          if (type === 'anime' && meta.isAnime !== 'true') return false;
          if (type !== 'anime' && meta.isAnime === 'true') return false;
          if (type === 'movie' && meta.mediaType !== 'movie') return false;
          if (type === 'tv' && meta.mediaType !== 'tv') return false;
          return true;
        });
        if (validResults.length > 0) return validResults[Math.floor(Math.random() * validResults.length)];
      } catch {
        // Ignored
      }
    }
    return null;
  }
  
  // Preference Mode
  let results = await fetchWithConstraints(type, preferences, { useRating: true, useEra: true, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRandom(results);

  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: true, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRandom(results);

  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRandom(results);

  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: false, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRandom(results);

  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: false, strictMood: false });
  if (results.length >= MIN_RESULTS) return rankRandom(results);

  if (preferences.genres.length > 1) {
    const resultsA = await fetchWithConstraints(type, { ...preferences, genres: [preferences.genres[0]] }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
    const resultsB = await fetchWithConstraints(type, { ...preferences, genres: [preferences.genres[1]] }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
    const merged = new Map();
    [...resultsA, ...resultsB].forEach(r => merged.set(r.id, r));
    results = Array.from(merged.values());
    if (results.length >= MIN_RESULTS) return rankRandom(results);
  }

  results = await fetchWithConstraints(type, { ...preferences, genres: [] }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
  return rankRandom(results);
}

interface Constraints { useRating: boolean; useEra: boolean; useStatus: boolean; strictMood: boolean; }
async function fetchWithConstraints(type: ContentType, prefs: WatchRandomPreferences, c: Constraints): Promise<DiscoveryItem[]> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const mediaType = type === 'anime' ? 'tv' : type as 'movie' | 'tv';
  let params: Record<string, string> = { page: '1', sort_by: 'popularity.desc', 'vote_count.gte': '50' };

  let genreStr = '';
  if (type === 'anime') {
    params.with_original_language = 'ja';
    genreStr = '16';
    if (prefs.genres.length > 0) genreStr += `,${prefs.genres.join(',')}`;
  } else if (prefs.genres.length > 0) {
    genreStr = prefs.genres.join(',');
  }

  if (prefs.mood && c.strictMood) {
    const moodGenres = WATCH_RANDOM_MOOD_MAPPING[prefs.mood];
    if (moodGenres && moodGenres.length > 0) genreStr = genreStr ? `${genreStr}|${moodGenres[0]}` : moodGenres[0].toString();
  }
  if (genreStr) params.with_genres = genreStr;

  if (c.useEra && prefs.era !== 'any') {
    const eraObj = WATCH_RANDOM_ERAS.find(e => e.id === prefs.era);
    if (eraObj) {
      if (eraObj.gte) params['primary_release_date.gte'] = eraObj.gte;
      if (eraObj.lte) params['primary_release_date.lte'] = eraObj.lte;
      if (type !== 'movie') {
        if (eraObj.gte) params['first_air_date.gte'] = eraObj.gte;
        if (eraObj.lte) params['first_air_date.lte'] = eraObj.lte;
      }
    }
  }

  if (c.useRating && prefs.rating !== 'any') {
    const ratingObj = WATCH_RANDOM_RATINGS.find(r => r.id === prefs.rating);
    if (ratingObj && ratingObj.gte) params['vote_average.gte'] = ratingObj.gte.toString();
  }

  if (type === 'movie' && c.useStatus && prefs.runtime !== 'any') {
    const rtObj = WATCH_RANDOM_MOVIE_RUNTIMES.find(r => r.id === prefs.runtime);
    if (rtObj) {
      if (rtObj.gte) params['with_runtime.gte'] = rtObj.gte.toString();
      if (rtObj.lte) params['with_runtime.lte'] = rtObj.lte.toString();
    }
  } else if (type !== 'movie' && c.useStatus && prefs.status !== 'any') {
    const statusObj = WATCH_RANDOM_TV_STATUS.find(s => s.id === prefs.status);
    if (statusObj && statusObj.with_status) params.with_status = statusObj.with_status;
  }

  try {
    const fetchResults = await getHomeSection({ id: 'pref', title: 'Pref', mediaType, endpoint, params });
    return fetchResults.map(i => classifyContent(i, mediaType)).filter(meta => {
      if (!meta.posterPath || !meta.title) return false;
      if (type === 'anime' && meta.isAnime !== 'true') return false;
      if (type !== 'anime' && meta.isAnime === 'true') return false;
      return true;
    });
  } catch { return []; }
}

function rankRandom(results: DiscoveryItem[]): DiscoveryItem[] {
  if (results.length === 0) return [];
  const scored = results.map(item => ({ item, score: Math.random() * 10 }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TARGET_RESULTS).map(s => s.item);
}
