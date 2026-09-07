/**
 * Rex.io — Centralized configuration
 *
 * All configurable values live here so the provider URL, storage keys,
 * image URLs, and app metadata can be changed from a single location.
 */

/** Application identity */
export const APP_NAME = 'Rex.io';
export const APP_TAGLINE = 'Find your next movie.';

/**
 * Embed provider base URL.
 * The provider accepts a TMDB movie ID appended to this path.
 */
export const EMBED_BASE_URL = 'https://vidsrc.sbs/embed/movie';

/** TMDB image CDN base URL */
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/** Rex.io backend API base */
export const API_BASE_URL = '/api';

/** Search configuration */
export const SEARCH_RESULT_LIMIT = 20;
export const SEARCH_TIMEOUT_MS = 10_000;
export const SEARCH_QUERY_MAX_LENGTH = 200;

/** localStorage key namespace */
export const LOCAL_STORAGE_KEYS = {
  LAST_SEARCH_QUERY: 'rex_io_last_search_query',
} as const;
