export interface MovieSearchResult {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
}

export class SearchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SearchError';
  }
}

async function fetchTmdbEndpoint(endpoint: string, signal?: AbortSignal): Promise<MovieSearchResult[]> {
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
  return fetchTmdbEndpoint(`recommendations/${tmdbId}`, signal);
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
