export interface MovieSearchResult {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  imdbId?: string | null;
}

export interface MediaSearchResult {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
}

export interface TvSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export interface TvEpisode {
  id: number;
  episodeNumber: number;
  title: string;
  airDate: string | null;
  overview: string;
  stillPath: string | null;
}

export interface TvSeriesDetails extends MovieSearchResult {
  seasons: TvSeason[];
}

export class SearchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SearchError';
  }
}

// ── In-Memory Bounded Cache ──
class LRUCache<T> {
  cache: Map<string, T>;
  limit: number;

  constructor(limit: number) {
    this.cache = new Map<string, T>();
    this.limit = limit;
  }
  
  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    // Refresh position
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  
  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// Cache holds up to 200 items in-memory. Reset on page reload.
const apiCache = new LRUCache<any>(200);
const pendingRequests = new Map<string, Promise<any>>();

// ── AbortSignal Wrapper ──
// Wraps a shared promise to respect the local caller's AbortSignal
// without cancelling the underlying network fetch for other consumers.
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
    signal.addEventListener('abort', onAbort);
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

// ── Deduplicator & Caching Engine ──
async function executeFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData?.error) {
      throw new SearchError(errorData.error.code, errorData.error.message);
    }
    throw new SearchError('HTTP_ERROR', `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function fetchWithCache<T>(
  cacheKey: string,
  url: string,
  signal?: AbortSignal,
  extractResults: boolean = false
): Promise<T> {
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return withAbortSignal(Promise.resolve(cached), signal);
  }

  if (pendingRequests.has(cacheKey)) {
    return withAbortSignal(pendingRequests.get(cacheKey)!, signal);
  }

  const promise = executeFetch<any>(url)
    .then((data) => {
      const result = extractResults ? (data.results || []) : data;
      apiCache.set(cacheKey, result);
      return result as T;
    })
    .catch((error) => {
      // Map standard fetch abort to standard SearchError if needed, 
      // but the network fetch here shouldn't abort because we didn't pass signal to fetch().
      if (error instanceof SearchError) throw error;
      throw new SearchError('NETWORK_ERROR', 'Network error occurred.');
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, promise);
  
  return withAbortSignal(promise, signal);
}

// ── API Methods ──

export async function searchMovies(query: string, signal?: AbortSignal): Promise<MovieSearchResult[]> {
  if (!query.trim()) return [];
  const q = encodeURIComponent(query.trim());
  return fetchWithCache(`searchMovies:${q}`, `/api/search-movies?q=${q}`, signal, true);
}

export async function searchMulti(query: string, signal?: AbortSignal): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];
  const q = encodeURIComponent(query.trim());
  return fetchWithCache(`searchMulti:${q}`, `/api/search-multi?q=${q}`, signal, true);
}

export async function getTrendingMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchWithCache('trendingMovies', '/api/trending-movies', signal, true);
}

export async function getPopularMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchWithCache('popularMovies', '/api/popular-movies', signal, true);
}

export async function getTopRatedMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchWithCache('topRatedMovies', '/api/top-rated-movies', signal, true);
}

export async function getRecommendations(tmdbId: number, signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchWithCache(`recommendations:${tmdbId}`, `/api/recommendations/${tmdbId}`, signal, true);
}

export async function getHomeSection(
  config: import('../config/homeSections').HomeSectionConfig,
  signal?: AbortSignal
): Promise<MediaSearchResult[]> {
  const params = new URLSearchParams(config.params || {});
  params.set('path', config.endpoint);
  params.set('type', config.mediaType);
  const cacheKey = `section:${config.endpoint}:${config.mediaType}:${params.toString()}`;
  return fetchWithCache(cacheKey, `/api/section?${params.toString()}`, signal, true);
}

export async function getMovieDetails(tmdbId: number, signal?: AbortSignal): Promise<MovieSearchResult | null> {
  try {
    return await fetchWithCache<MovieSearchResult>(`movieDetails:${tmdbId}`, `/api/movie/${tmdbId}`, signal, false);
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get movie details:', err);
    return null;
  }
}

export async function getTvDetails(tmdbId: number, signal?: AbortSignal): Promise<TvSeriesDetails | null> {
  try {
    return await fetchWithCache<TvSeriesDetails>(`tvDetails:${tmdbId}`, `/api/tv/${tmdbId}`, signal, false);
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get TV details:', err);
    return null;
  }
}

export async function getTvSeasonEpisodes(tmdbId: number, seasonNumber: number, signal?: AbortSignal): Promise<TvEpisode[]> {
  try {
    return await fetchWithCache<TvEpisode[]>(`tvSeasonEpisodes:${tmdbId}:${seasonNumber}`, `/api/tv/${tmdbId}/season/${seasonNumber}`, signal, false);
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get season episodes:', err);
    return [];
  }
}
