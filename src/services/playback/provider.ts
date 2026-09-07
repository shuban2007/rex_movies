/**
 * Rex.io — Playback Provider Abstraction
 *
 * Decouples the playback URL construction from the rest of the application.
 * To switch providers, only this file and config.ts need to change.
 */

import { EMBED_BASE_URL } from '../../config';

export interface PlaybackProvider {
  /** Human-readable provider name */
  readonly name: string;
  /** Build the embed URL for a given TMDB movie ID */
  buildMovieUrl(tmdbId: number): string;
}

/**
 * Default playback provider implementation.
 * Uses the embed base URL from centralized config.
 */
class DefaultProvider implements PlaybackProvider {
  readonly name = 'Default';

  buildMovieUrl(tmdbId: number): string {
    return `${EMBED_BASE_URL}/${tmdbId}`;
  }
}

/** The active playback provider instance */
export const provider: PlaybackProvider = new DefaultProvider();
