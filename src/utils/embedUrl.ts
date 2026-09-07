/**
 * Rex.io — Embed URL Builder
 *
 * Builds the provider embed URL for a given TMDB movie ID.
 * This is the only place that constructs provider URLs.
 */

import { EMBED_BASE_URL } from '../config';

/**
 * Builds the provider embed URL for a given TMDB movie ID.
 *
 * @param tmdbId - The TMDB movie identifier (e.g. 533535)
 * @returns The complete iframe src URL.
 */
export function buildMovieEmbedUrl(tmdbId: number): string {
  return `${EMBED_BASE_URL}/${tmdbId}`;
}
