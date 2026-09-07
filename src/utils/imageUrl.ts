/**
 * Rex.io — TMDB Image URL Utility
 *
 * Centralizes poster/backdrop URL construction.
 * All TMDB image URL logic goes through this module.
 */



export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export function getImageUrl(imagePath: string | null, size: PosterSize = 'w342'): string | null {
  if (!imagePath) return null;
  return `https://image.tmdb.org/t/p/${size}${imagePath}`;
}
