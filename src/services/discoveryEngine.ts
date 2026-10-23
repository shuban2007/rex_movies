import Fuse from 'fuse.js';
import {
  searchMulti,
  searchPerson,
  getHomeSection,
  getMovieDetails,
  getTvDetails,
  getTrendingMovies,
  type MediaSearchResult,
  type PersonSearchResult
} from './tmdb';
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
  originalTitle?: string | null;
  isAnime: AnimeConfidence;
  genres: number[];
  keywords: string[];
  originalLanguage: string;
  productionCountries: string[];
  collectionId?: number;
  releaseYear: number | null;
}

export interface IntentChip {
  id: string;
  type: 'genre' | 'year' | 'decade' | 'mediaType' | 'sort' | 'person';
  label: string;
  value: any;
}

export interface SearchIntent {
  rawQuery: string;
  cleanedQuery: string;
  textQuery: string;
  genres: { id: number; name: string }[];
  genreIds: number[];
  year?: number;
  decade?: { label: string; startYear: number; endYear: number };
  mediaType: ContentType;
  isAnime: boolean;
  sortBy?: 'relevance' | 'trending' | 'latest';
  personName?: string;
  confidence: number;
  chips: IntentChip[];
}

export interface SearchOptions {
  page?: number;
  type?: ContentType;
  sort?: 'relevance' | 'trending' | 'latest';
  signal?: AbortSignal;
  intent?: SearchIntent;
  genreId?: number;
  year?: number;
}

export interface AdvancedSearchResult {
  results: DiscoveryItem[];
  didYouMean?: string;
  intent?: SearchIntent;
}

export interface WatchRandomPreferences {
  genres: string[];
  era: string;
  rating: string;
  runtime: string; // Movie only
  status: string; // TV only
  mood: string | null;
}

// ── In-Memory Bounded TTL Cache ──

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class BoundedTTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private limit: number;
  private defaultTtlMs: number;

  constructor(limit: number = 100, defaultTtlMs: number = 5 * 60 * 1000) {
    this.limit = limit;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const searchCache = new BoundedTTLCache<AdvancedSearchResult>(100, 5 * 60 * 1000);
const pendingSearches = new Map<string, Promise<AdvancedSearchResult>>();

export function clearSearchCache(): void {
  searchCache.clear();
  pendingSearches.clear();
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    return Promise.reject(err);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      reject(err);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise
      .then((res) => {
        signal.removeEventListener('abort', onAbort);
        resolve(res);
      })
      .catch((err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}

// ── TMDB Genre Dictionary ─────────────────────────────────────────────

interface GenreMapping {
  id: number;
  name: string;
  aliases: string[];
}

export const SUPPORTED_GENRES: GenreMapping[] = [
  { id: 28, name: 'Action', aliases: ['action', 'action packed'] },
  { id: 12, name: 'Adventure', aliases: ['adventure', 'adventures'] },
  { id: 16, name: 'Animation', aliases: ['animation', 'animated', 'cartoon', 'cartoons'] },
  { id: 35, name: 'Comedy', aliases: ['comedy', 'comedies', 'funny', 'hilarious'] },
  { id: 80, name: 'Crime', aliases: ['crime', 'heist', 'gangster', 'mob'] },
  { id: 99, name: 'Documentary', aliases: ['documentary', 'documentaries', 'docu', 'docuseries'] },
  { id: 18, name: 'Drama', aliases: ['drama', 'dramas', 'dramatic'] },
  { id: 10751, name: 'Family', aliases: ['family', 'kids', 'children'] },
  { id: 14, name: 'Fantasy', aliases: ['fantasy', 'mythological', 'magic'] },
  { id: 36, name: 'History', aliases: ['history', 'historical', 'period piece'] },
  { id: 27, name: 'Horror', aliases: ['horror', 'scary', 'spooky', 'creepy'] },
  { id: 10402, name: 'Music', aliases: ['music', 'musical', 'musicals'] },
  { id: 9648, name: 'Mystery', aliases: ['mystery', 'mysteries', 'whodunit', 'detective'] },
  { id: 10749, name: 'Romance', aliases: ['romance', 'romantic', 'rom-com', 'love story'] },
  { id: 878, name: 'Sci-Fi', aliases: ['sci-fi', 'scifi', 'sci fi', 'science fiction', 'space'] },
  { id: 53, name: 'Thriller', aliases: ['thriller', 'thrillers', 'suspense', 'psychological thriller'] },
  { id: 10752, name: 'War', aliases: ['war', 'military', 'battlefield', 'world war'] },
  { id: 37, name: 'Western', aliases: ['western', 'westerns', 'cowboy'] }
];

// ── String Normalization & Levenshtein Distance ───────────────────────

export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'part', 'anime']);

export function normalizeTitleToken(token: string): string {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    if (token.endsWith('ies')) return token.slice(0, -3) + 'y';
    if (token.endsWith('oes')) return token.slice(0, -2);
    return token.slice(0, -1);
  }
  return token;
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchQuery(query)
    .split(' ')
    .filter(t => t.length > 0)
    .filter(t => !STOP_WORDS.has(t))
    .map(normalizeTitleToken);
}

/**
 * Damerau-Levenshtein distance handles insertions, deletions, substitutions,
 * and adjacent character transpositions (e.g. "itnerstellar" -> "interstellar" = 1).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = [];
  for (let i = 0; i <= al; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= bl; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        min = Math.min(min, d[i - 2][j - 2] + 1);
      }

      d[i][j] = min;
    }
  }

  return d[al][bl];
}

export function isExactTitleMatch(query: string, candidateTitle: string): boolean {
  const normQuery = normalizeSearchQuery(query);
  const normCandidate = normalizeSearchQuery(candidateTitle);
  return normQuery === normCandidate || normCandidate.includes(normQuery);
}

// ── Typo Recovery & Variant Generation ────────────────────────────────

export function generateVariants(query: string, tokens: string[]): string[] {
  const norm = normalizeSearchQuery(query);
  if (!norm || norm.length < 3) return [];

  const words = norm.split(' ');
  const vowels = ['a', 'e', 'o', 'i', 'u'];
  const isVowel = (ch: string) => vowels.includes(ch);

  // Group candidates by category
  const categories: {
    vowels: string[];
    transpositions: string[];
    stems: string[];
    repeats: string[];
    phonetics: string[];
  } = {
    vowels: [],
    transpositions: [],
    stems: [],
    repeats: [],
    phonetics: []
  };

  // 1. Repeated character reduction (e.g. "batttman" -> "batman", "spidder" -> "spider")
  const collapsedRepeats = norm.replace(/(.)\1+/g, '$1');
  if (collapsedRepeats !== norm && collapsedRepeats.length >= 3) {
    categories.repeats.push(collapsedRepeats);
  }
  const tripleToDouble = norm.replace(/(.)\1{2,}/g, '$1$1');
  if (tripleToDouble !== norm && tripleToDouble !== collapsedRepeats && tripleToDouble.length >= 3) {
    categories.repeats.push(tripleToDouble);
  }

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const w = words[wIdx];
    if (w.length >= 4) {
      // 2. Vowel omission insertion
      // Check ending consonant pairs (e.g. "llr" in "interstellr" -> "llar", "tr" in "gladiatr" -> "tor", "grs" -> "gers")
      let insertedFound = false;
      // Case A: word ends in 's' after consonants (e.g. "avengrs" -> insert between 'g' and 'r' -> "avengers")
      if (w.endsWith('s') && w.length >= 5 && !isVowel(w[w.length - 2]) && !isVowel(w[w.length - 3])) {
        for (const v of ['e', 'a', 'o']) {
          const inserted = w.slice(0, -2) + v + w.slice(-2);
          const copy = [...words];
          copy[wIdx] = inserted;
          categories.vowels.push(copy.join(' '));
        }
        insertedFound = true;
      }
      // Case B: word ends in consonant cluster with no vowel in the last 3 chars (e.g. 'interstellr' -> 'llr' -> 'llar')
      // OR ends in 'tr' (e.g. 'gladiatr' -> 'gladiator')
      const endsWithThreeConsonants = w.length >= 5 && !isVowel(w[w.length - 1]) && !isVowel(w[w.length - 2]) && !isVowel(w[w.length - 3]);
      const endsWithTr = w.endsWith('tr') && w.length >= 5;

      if (!insertedFound && (endsWithThreeConsonants || endsWithTr)) {
        for (const v of ['a', 'o', 'e']) {
          const inserted = w.slice(0, -1) + v + w[w.length - 1];
          const copy = [...words];
          copy[wIdx] = inserted;
          categories.vowels.push(copy.join(' '));
        }
      }

      // 3. Intelligent adjacent transpositions
      // Order pairs:
      // - Index 1 (frequent near-prefix typing transposition, e.g. 'itnerstellar')
      // - Index w.length - 3 and w.length - 2 (frequent suffix/sub-suffix typing transpositions, e.g. 'interstelalr')
      // - Index 0 (first 2 characters, e.g. 'teh' -> 'the')
      // - Followed by expanding outward across the entire word
      const transIndexSet = new Set<number>();
      const transIndices: number[] = [];
      const addIdx = (idx: number) => {
        if (idx >= 0 && idx <= w.length - 2 && !transIndexSet.has(idx)) {
          transIndexSet.add(idx);
          transIndices.push(idx);
        }
      };
      addIdx(1);
      addIdx(w.length - 3);
      addIdx(w.length - 2);
      addIdx(0);
      addIdx(2);
      addIdx(w.length - 4);
      addIdx(3);
      addIdx(w.length - 5);
      for (let i = 0; i <= w.length - 2; i++) addIdx(i);

      for (const i of transIndices) {
        if (w[i] !== w[i + 1]) {
          const swapped = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
          const copy = [...words];
          copy[wIdx] = swapped;
          categories.transpositions.push(copy.join(' '));
        }
      }

      // 4. Prefix / Stem truncation (e.g. "interstellr" -> "interstell", "interstelalr" -> "interstel")
      // Very effective against TMDB prefix search index!
      if (w.length >= 6) {
        const trunc1 = w.slice(0, -1);
        const copy1 = [...words];
        copy1[wIdx] = trunc1;
        categories.stems.push(copy1.join(' '));

        if (w.length >= 8) {
          const trunc2 = w.slice(0, -2);
          const copy2 = [...words];
          copy2[wIdx] = trunc2;
          categories.stems.push(copy2.join(' '));
        }
      }
    }
  }

  // 5. Common phonetic substitutions
  if (norm.includes('f')) categories.phonetics.push(norm.replace(/f/g, 'ph'));
  if (norm.includes('ph')) categories.phonetics.push(norm.replace(/ph/g, 'f'));
  if (norm.includes('k')) categories.phonetics.push(norm.replace(/k/g, 'c'));
  if (norm.includes('c') && !norm.includes('ch')) categories.phonetics.push(norm.replace(/c/g, 'k'));

  // Fair round-robin across categories
  const merged = new Set<string>();
  const maxRounds = 4;
  const order: (keyof typeof categories)[] = ['vowels', 'repeats', 'transpositions', 'stems', 'phonetics'];

  for (let round = 0; round < maxRounds; round++) {
    for (const catName of order) {
      const list = categories[catName];
      if (list && list[round]) {
        const item = list[round].trim();
        if (item !== norm && item.length >= 3) {
          merged.add(item);
          if (merged.size >= 6) break;
        }
      }
    }
    if (merged.size >= 6) break;
  }

  // If capacity remains (< 6), backfill with transpositions then stems
  if (merged.size < 6) {
    for (const item of categories.transpositions) {
      if (item !== norm && item.length >= 3) {
        merged.add(item);
        if (merged.size >= 6) break;
      }
    }
  }
  if (merged.size < 6) {
    for (const item of categories.stems) {
      if (item !== norm && item.length >= 3) {
        merged.add(item);
        if (merged.size >= 6) break;
      }
    }
  }

  // Add plural token fallback if space permits
  if (tokens.length > 0 && merged.size < 6) {
    const plural = tokens[0] + 's ' + tokens.slice(1).join(' ');
    if (plural.trim() !== norm && plural.trim().length >= 3) {
      merged.add(plural.trim());
    }
  }

  return Array.from(merged).slice(0, 6);
}

// ── Natural-Language Intent Parser ────────────────────────────────────

export function parseSearchIntent(query: string): SearchIntent {
  const rawQuery = query.trim();
  const lower = rawQuery.toLowerCase();
  const chips: IntentChip[] = [];
  const extractedGenres: { id: number; name: string }[] = [];
  const tokensExtracted: string[] = [];

  let mediaType: ContentType = 'all';
  let isAnime = false;
  let year: number | undefined;
  let decade: { label: string; startYear: number; endYear: number } | undefined;
  let sortBy: 'relevance' | 'trending' | 'latest' | undefined;
  let personName: string | undefined;

  let remaining = ` ${lower} `;

  // 1. Anime Intent
  const animeRegex = /\b(japanese anime|anime|manga)\b/gi;
  if (animeRegex.test(remaining)) {
    isAnime = true;
    mediaType = 'anime';
    remaining = remaining.replace(animeRegex, ' ');
    chips.push({ id: 'type-anime', type: 'mediaType', label: 'Anime', value: 'anime' });
  }

  // 2. Media Type Intent (Movies / TV) if not anime
  if (!isAnime) {
    const movieRegex = /\b(movies?|films?|cinema)\b/gi;
    const tvRegex = /\b(tv shows?|tv series|television|tv|shows?|series)\b/gi;
    if (movieRegex.test(remaining)) {
      mediaType = 'movie';
      remaining = remaining.replace(movieRegex, ' ');
      chips.push({ id: 'type-movie', type: 'mediaType', label: 'Movies', value: 'movie' });
    } else if (tvRegex.test(remaining)) {
      mediaType = 'tv';
      remaining = remaining.replace(tvRegex, ' ');
      chips.push({ id: 'type-tv', type: 'mediaType', label: 'TV Series', value: 'tv' });
    }
  }

  // 3. Sort / Temporal Intent
  const latestRegex = /\b(latest|newest|recent|new)\b/gi;
  const trendingRegex = /\b(trending|popular|hot)\b/gi;
  if (latestRegex.test(remaining)) {
    sortBy = 'latest';
    remaining = remaining.replace(latestRegex, ' ');
    chips.push({ id: 'sort-latest', type: 'sort', label: 'Latest', value: 'latest' });
  } else if (trendingRegex.test(remaining)) {
    sortBy = 'trending';
    remaining = remaining.replace(trendingRegex, ' ');
    chips.push({ id: 'sort-trending', type: 'sort', label: 'Trending', value: 'trending' });
  }

  // 4. Decade Intent (e.g. "90s", "1990s", "80s", "2000s", "2010s")
  const decadeRegex = /\b(19[2-9]0|20[0-2]0|[2-9]0)s\b/gi;
  const decadeMatch = decadeRegex.exec(remaining);
  if (decadeMatch) {
    let decStr = decadeMatch[1];
    let startYear = parseInt(decStr, 10);
    if (startYear < 100) {
      startYear = startYear >= 20 ? 1900 + startYear : 2000 + startYear;
    }
    const endYear = startYear + 9;
    const label = `${startYear}s`;
    decade = { label, startYear, endYear };
    remaining = remaining.replace(decadeMatch[0], ' ');
    chips.push({ id: `decade-${label}`, type: 'decade', label, value: label });
  }

  // 5. Explicit 4-Digit Year (1900–2035)
  // Guard: if the ENTIRE query is just a 4-digit number (e.g. "1917", "2012"),
  // treat it as a title query so we don't accidentally erase the query!
  const isPureYearQuery = /^\s*(19\d\d|20[0-3]\d)\s*$/.test(rawQuery);
  if (!isPureYearQuery) {
    const yearRegex = /\b(19\d\d|20[0-3]\d)\b/g;
    const yearMatch = yearRegex.exec(remaining);
    if (yearMatch && !decade) {
      year = parseInt(yearMatch[1], 10);
      remaining = remaining.replace(yearMatch[0], ' ');
      chips.push({ id: `year-${year}`, type: 'year', label: year.toString(), value: year });
    }
  }

  // 6. Genres Intent Matching
  for (const genre of SUPPORTED_GENRES) {
    for (const alias of genre.aliases) {
      const aliasPattern = new RegExp(`\\b${alias.replace('-', '[- ]')}\\b`, 'gi');
      if (aliasPattern.test(remaining)) {
        // Guard against single-word query matching genre exactly (e.g. searching "Action")
        const isPureGenre = normalizeSearchQuery(rawQuery) === alias;
        if (!isPureGenre) {
          if (!extractedGenres.some(g => g.id === genre.id)) {
            extractedGenres.push({ id: genre.id, name: genre.name });
            chips.push({ id: `genre-${genre.id}`, type: 'genre', label: genre.name, value: genre.id });
          }
          remaining = remaining.replace(aliasPattern, ' ');
          tokensExtracted.push(alias);
        }
      }
    }
  }

  // 7. Person / Actor / Director Pattern Matching
  const personPatterns = [
    /\b(?:directed by|director)\s+([a-z\s.'-]+?)(?:\s+(?:movie|movies|film|action|drama|in|from)|$)/i,
    /\b(?:starring|with)\s+([a-z\s.'-]+?)(?:\s+(?:movie|movies|film|action|drama|in|from)|$)/i
  ];
  for (const pattern of personPatterns) {
    const match = pattern.exec(rawQuery);
    if (match && match[1]?.trim().length > 2) {
      personName = match[1].trim();
      chips.push({ id: `person-${personName}`, type: 'person', label: personName, value: personName });
      break;
    }
  }

  // 8. Clean up remaining text query
  let cleaned = remaining.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^(?:watch|find|search for|about)\s+/i, '').trim();

  const textQuery = cleaned.length > 0 ? cleaned : '';

  let confidence = 0.5;
  if (chips.length > 0) confidence += Math.min(chips.length * 0.15, 0.45);
  if (textQuery.length > 0) confidence += 0.05;

  return {
    rawQuery,
    cleanedQuery: cleaned,
    textQuery,
    genres: extractedGenres,
    genreIds: extractedGenres.map(g => g.id),
    year,
    decade,
    mediaType,
    isAnime,
    sortBy,
    personName,
    confidence: Math.min(confidence, 1.0),
    chips
  };
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
  const originalTitle = item.originalTitle || item.original_title || item.original_name || null;

  let releaseYear: number | null = null;
  if (item.year) {
    releaseYear = parseInt(item.year, 10);
  } else if (item.releaseYear) {
    releaseYear = item.releaseYear;
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
    originalTitle,
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

// ── Multi-Tier Candidate Ranking ──────────────────────────────────────

export function scoreSearchCandidate(
  query: string,
  queryTokens: string[],
  candidate: DiscoveryItem,
  fuzzyScore: number,
  intent?: SearchIntent
): { item: DiscoveryItem; coverage: number; finalScore: number; rankTier: number } {
  const title = candidate.title || '';
  const originalTitle = candidate.originalTitle || '';

  const normQuery = normalizeSearchQuery(query);
  const normTitle = normalizeSearchQuery(title);
  const normOrig = normalizeSearchQuery(originalTitle);

  const titleTokens = normTitle.split(' ').filter(t => t.length > 0).map(normalizeTitleToken);
  
  // 1. Token Matching & Coverage (incorporating distance <= 1 typos)
  const totalTokens = queryTokens.length;
  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (titleTokens.includes(token)) {
      matchedTokens += 1;
    } else if (titleTokens.some(t => t.includes(token) || token.includes(t))) {
      matchedTokens += 0.5;
    } else if (titleTokens.some(t => damerauLevenshtein(token, t) <= 1)) {
      matchedTokens += 0.9;
    }
  }
  const coverage = totalTokens > 0 ? Math.min(matchedTokens / totalTokens, 1) : 1;

  let baseScore = 0;
  let rankTier = 5;

  // ── Priority 1: Exact Title Match ──
  if (normTitle === normQuery) {
    baseScore = 200;
    rankTier = 1;
  }
  // ── Priority 2: Exact Original Title Match ──
  else if (normOrig && normOrig === normQuery) {
    baseScore = 180;
    rankTier = 2;
  }
  // ── Priority 3: Prefix Match or Complete Ordered Token Match ──
  else if (normTitle.startsWith(normQuery) || (normOrig && normOrig.startsWith(normQuery))) {
    baseScore = 140;
    rankTier = 3;
  } else if (totalTokens > 0 && matchedTokens >= totalTokens) {
    baseScore = 120;
    rankTier = 3;
  }
  // ── Priority 4: Damerau-Levenshtein Edit Distance & Fuzzy Match ──
  else {
    const editDistTitle = damerauLevenshtein(normQuery, normTitle);
    const editDistOrig = normOrig ? damerauLevenshtein(normQuery, normOrig) : 99;
    const minEditDist = Math.min(editDistTitle, editDistOrig);

    if (minEditDist <= 1) {
      baseScore = 110;
      rankTier = 4;
    } else if (minEditDist === 2) {
      baseScore = 80;
      rankTier = 4;
    } else {
      baseScore = Math.max(0, (1 - fuzzyScore) * 50);
      rankTier = 4;
    }
  }

  // Token coverage bonus
  baseScore += coverage * 40;

  // Penalty for missing tokens when multiple tokens were queried
  if (totalTokens > 1 && matchedTokens < totalTokens) {
    baseScore -= (totalTokens - matchedTokens) * 25;
  }

  // ── Intent Boosts ──
  if (intent) {
    if (intent.genreIds.length > 0 && candidate.genres.some(g => intent.genreIds.includes(g))) {
      baseScore += 25;
    }
    if (intent.decade && candidate.releaseYear) {
      if (candidate.releaseYear >= intent.decade.startYear && candidate.releaseYear <= intent.decade.endYear) {
        baseScore += 30;
      }
    }
    if (intent.year && candidate.releaseYear === intent.year) {
      baseScore += 40;
    }
    if (intent.isAnime && candidate.isAnime === 'true') {
      baseScore += 35;
    }
  }

  // ── Priority 5: Popularity & Rating Tie-Breakers ──
  const popBonus = Math.min((candidate.popularity || 0) / 100, 15);
  const ratingBonus = Math.min((candidate.voteAverage || 0) * 0.8, 8);
  const finalScore = baseScore + popBonus + ratingBonus;

  return { item: candidate, coverage, finalScore, rankTier };
}

// ── Search Public API ─────────────────────────────────────────────────

export async function searchContent(query: string, options: SearchOptions = {}): Promise<AdvancedSearchResult> {
  const { signal } = options;
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    return Promise.reject(err);
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) return { results: [] };

  const { page = 1, type = 'all', sort = 'relevance', genreId, year } = options;
  const normQuery = normalizeSearchQuery(trimmed);

  // Parse natural language intent deterministically
  const intent = options.intent || parseSearchIntent(trimmed);
  const activeType = type !== 'all' ? type : (intent.mediaType !== 'all' ? intent.mediaType : 'all');

  // Determine active genre filter:
  // genreId: undefined -> default to intent's single genre (if present)
  // genreId: 0 or negative -> explicitly disabled (e.g. user removed genre chip)
  // genreId: > 0 -> explicitly requested genre ID
  let filterGenreId: number | undefined;
  if (genreId !== undefined) {
    filterGenreId = genreId > 0 ? genreId : undefined;
  } else if (intent.genreIds.length === 1) {
    filterGenreId = intent.genreIds[0];
  }

  const filterYear = year !== undefined ? (year > 0 ? year : undefined) : intent.year;

  // Unambiguous cache key distinguishing all material parameters
  const cacheKey = `${normQuery}:${page}:${activeType}:${sort}:g${filterGenreId ?? 'none'}:y${filterYear ?? 'none'}`;

  // Return cached result if available and fresh, guarded by the caller's AbortSignal
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return withAbortSignal(Promise.resolve(cached), signal);
  }

  // In-flight request deduplication for matching request identities
  if (pendingSearches.has(cacheKey)) {
    return withAbortSignal(pendingSearches.get(cacheKey)!, signal);
  }

  const searchPromise = (async () => {
    // Determine query to send to TMDB (preserve text tokens, or fallback to trimmed)
    const effectiveSearchText = intent.textQuery.length >= 2 ? intent.textQuery : trimmed;
    const queryTokens = tokenizeSearchQuery(effectiveSearchText);

    // 1. Fetch Primary TMDB results (Page requested)
    // NOTE: Shared background fetch runs without component-specific AbortSignals to prevent
    // cancellation of one consumer from aborting other concurrent consumers or poisoning the cache.
    // Errors are NOT swallowed: network/API failures must reject so they display error state and are not cached.
    const primaryFetch = searchMulti(effectiveSearchText, page);

    // Optional person search if actor/director detected or text matches name-like pattern
    let personFetch: Promise<PersonSearchResult[]> = Promise.resolve([]);
    if (page === 1 && intent.personName) {
      personFetch = searchPerson(intent.personName, 1).catch(() => []);
    }

    const [primaryResults, personResults] = await Promise.all([primaryFetch, personFetch]);
    let allResults: MediaSearchResult[] = [...primaryResults];

    // If person was found with known_for items, include them in candidate pool
    if (personResults.length > 0 && personResults[0].knownFor?.length > 0) {
      const knownForItems = personResults[0].knownFor.map(k => ({
        id: k.id,
        mediaType: k.mediaType,
        title: k.title,
        originalTitle: k.originalTitle,
        year: k.releaseYear ? k.releaseYear.toString() : null,
        posterPath: k.posterPath,
        backdropPath: null,
        overview: '',
        genreIds: k.genreIds,
        voteAverage: k.voteAverage,
        popularity: k.popularity,
      }));
      allResults = [...knownForItems, ...allResults];
    }

    // 2. Typo Fallbacks (Only on page 1)
    let isStrongResult = false;
    if (page === 1) {
      if (primaryResults.length > 0) {
        if (isExactTitleMatch(effectiveSearchText, primaryResults[0].title || '')) {
          isStrongResult = true;
        } else {
          for (const res of primaryResults.slice(0, 3)) {
            const titleTokens = tokenizeSearchQuery(res.title || '');
            let matched = 0;
            for (const qt of queryTokens) if (titleTokens.includes(qt)) matched++;
            if (queryTokens.length > 0 && matched / queryTokens.length >= 0.8) {
              isStrongResult = true;
              break;
            }
          }
        }
      }

      // If no strong match found on page 1, fetch top variants
      if (!isStrongResult) {
        const variants = generateVariants(effectiveSearchText, queryTokens);
        if (variants.length > 0) {
          const fallbackPromises = variants.map(v => searchMulti(v, 1).catch(() => []));
          const fallbackResults = await Promise.all(fallbackPromises);
          allResults = [...allResults, ...fallbackResults.flat()];
        }
      }
    }

    // 3. Deduplicate & Classify
    const uniqueMap = new Map<string, DiscoveryItem>();
    for (const item of allResults) {
      const classified = classifyContent(item);
      uniqueMap.set(`${classified.mediaType}-${classified.id}`, classified);
    }
    let uniqueResults = Array.from(uniqueMap.values());
    if (uniqueResults.length === 0) {
      const res: AdvancedSearchResult = { results: [], intent };
      searchCache.set(cacheKey, res);
      return res;
    }

    // 4. Content Type Filtering (movie / tv / anime / all)
    if (activeType !== 'all') {
      uniqueResults = uniqueResults.filter(item => {
        if (activeType === 'anime') return item.isAnime === 'true';
        if (activeType === 'movie') return item.mediaType === 'movie';
        if (activeType === 'tv') return item.mediaType === 'tv';
        return true;
      });
    }

    // Optional explicit genre filter (from chip or option)
    if (filterGenreId) {
      const genreFiltered = uniqueResults.filter(item => item.genres.includes(filterGenreId!));
      // Only apply if it doesn't eliminate all results
      if (genreFiltered.length > 0) {
        uniqueResults = genreFiltered;
      }
    }

    // Optional explicit year filter
    if (filterYear) {
      const yearFiltered = uniqueResults.filter(item => item.releaseYear === filterYear);
      if (yearFiltered.length > 0) {
        uniqueResults = yearFiltered;
      }
    }

    // 5. Fuzzy Scoring via Fuse.js
    const fuse = new Fuse(uniqueResults, {
      keys: [
        { name: 'title', weight: 0.8 },
        { name: 'originalTitle', weight: 0.2 }
      ],
      includeScore: true,
      threshold: 0.6,
      ignoreLocation: true,
    });
    const fuseResults = fuse.search(normQuery);
    const fuzzyMap = new Map<string, number>();
    for (const fr of fuseResults) {
      fuzzyMap.set(`${fr.item.mediaType}-${fr.item.id}`, fr.score || 0);
    }

    // 6. Ranking & Sorting
    const scoredResults = uniqueResults.map(item => {
      const fScore = fuzzyMap.get(`${item.mediaType}-${item.id}`) ?? 1.0;
      return scoreSearchCandidate(effectiveSearchText, queryTokens, item, fScore, intent);
    });

    if (sort === 'trending') {
      scoredResults.sort((a, b) => {
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
      // Relevance primary
      scoredResults.sort((a, b) => {
        if (a.rankTier !== b.rankTier) {
          return a.rankTier - b.rankTier; // lower tier number = higher priority
        }
        return b.finalScore - a.finalScore;
      });
    }

    const bestResults = scoredResults.map(sr => sr.item);

    // 7. Did You Mean Suggestion
    let didYouMean: string | undefined;
    if (page === 1 && scoredResults.length > 0 && !isStrongResult) {
      let closestCandidate = scoredResults[0];
      let minDistance = damerauLevenshtein(normQuery, normalizeSearchQuery(closestCandidate.item.title || ''));

      for (let i = 1; i < Math.min(5, scoredResults.length); i++) {
        const candidateTitle = scoredResults[i].item.title;
        if (candidateTitle) {
          const dist = damerauLevenshtein(normQuery, normalizeSearchQuery(candidateTitle));
          if (dist < minDistance) {
            minDistance = dist;
            closestCandidate = scoredResults[i];
          }
        }
      }

      const candidateTitle = closestCandidate.item.title;
      if (candidateTitle && normalizeSearchQuery(candidateTitle) !== normQuery) {
        if (minDistance >= 1 && minDistance <= 3) {
          didYouMean = candidateTitle;
        } else if (closestCandidate.coverage >= 0.8 && closestCandidate.finalScore > 40 && primaryResults.length === 0) {
          didYouMean = candidateTitle;
        }
      }
    }

    const res: AdvancedSearchResult = { results: bestResults, didYouMean, intent };
    searchCache.set(cacheKey, res);
    return res;
  })();

  pendingSearches.set(cacheKey, searchPromise);
  searchPromise
    .catch(() => {})
    .finally(() => {
      pendingSearches.delete(cacheKey);
    });

  return withAbortSignal(searchPromise, signal);
}

// ── Discovery (Empty Search) Public API ───────────────────────────────

export async function getDiscoveryContent(options: SearchOptions = {}): Promise<DiscoveryItem[]> {
  const { type = 'all', signal } = options;
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
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.error('Discovery fetch error', err);
    throw err;
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
