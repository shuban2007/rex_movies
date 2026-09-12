export interface MovieSearchResult {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
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

async function fetchTmdbEndpoint<T = any>(endpoint: string, signal?: AbortSignal): Promise<T[]> {
  try {
    const response = await fetch(`/api/${endpoint}`, { signal });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.error) {
        throw new SearchError(errorData.error.code, errorData.error.message);
      }
      throw new SearchError('HTTP_ERROR', `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    if (error instanceof SearchError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new SearchError('NETWORK_ERROR', 'Network error occurred while fetching movies.');
  }
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<MovieSearchResult[]> {
  if (!query.trim()) return [];
  return fetchTmdbEndpoint(`search-movies?q=${encodeURIComponent(query.trim())}`, signal);
}

export async function searchMulti(query: string, signal?: AbortSignal): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`/api/search-multi?q=${encodeURIComponent(query.trim())}`, { signal });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.error) throw new SearchError(errorData.error.code, errorData.error.message);
      throw new SearchError('HTTP_ERROR', `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    if (error instanceof SearchError || error.name === 'AbortError') throw error;
    throw new SearchError('NETWORK_ERROR', 'Network error occurred while searching.');
  }
}

export async function getTrendingMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchTmdbEndpoint('trending-movies', signal);
}

export async function getPopularMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchTmdbEndpoint('popular-movies', signal);
}

export async function getTopRatedMovies(signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchTmdbEndpoint('top-rated-movies', signal);
}

export async function getRecommendations(tmdbId: number, signal?: AbortSignal): Promise<MovieSearchResult[]> {
  return fetchTmdbEndpoint<MovieSearchResult>(`recommendations/${tmdbId}`, signal);
}

export async function getHomeSection(
  config: import('../config/homeSections').HomeSectionConfig,
  signal?: AbortSignal
): Promise<MediaSearchResult[]> {
  const params = new URLSearchParams(config.params || {});
  params.set('path', config.endpoint);
  params.set('type', config.mediaType);
  return fetchTmdbEndpoint<MediaSearchResult>(`section?${params.toString()}`, signal);
}

export async function getMovieDetails(tmdbId: number, signal?: AbortSignal): Promise<MovieSearchResult | null> {
  try {
    const response = await fetch(`/api/movie/${tmdbId}`, { signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get movie details:', err);
    return null;
  }
}

export async function getTvDetails(tmdbId: number, signal?: AbortSignal): Promise<TvSeriesDetails | null> {
  try {
    const response = await fetch(`/api/tv/${tmdbId}`, { signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get TV details:', err);
    return null;
  }
}

export async function getTvSeasonEpisodes(tmdbId: number, seasonNumber: number, signal?: AbortSignal): Promise<TvEpisode[]> {
  try {
    const response = await fetch(`/api/tv/${tmdbId}/season/${seasonNumber}`, { signal });
    if (!response.ok) return [];
    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to get season episodes:', err);
    return [];
  }
}
