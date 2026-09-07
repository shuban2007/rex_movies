export type MediaType = 'movie' | 'tv';

export interface ProviderParams {
  tmdbId: number | string;
  season?: number | string;
  episode?: number | string;
}

export interface Provider {
  id: string;
  name: string;
  mediaType: MediaType;
  enabled: boolean;
  isDefault?: boolean;
  hasAds?: boolean;
  disableSandbox?: boolean;
  buildUrl: (params: ProviderParams) => string;
}

export const providers: Provider[] = [
  // MOVIE PROVIDERS
  {
    id: 'cinesrc-movie',
    name: 'CineSrc',
    mediaType: 'movie',
    enabled: true,
    isDefault: true,
    hasAds: true,
    buildUrl: ({ tmdbId }) => `https://cinesrc.st/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidsrc-sbs-movie',
    name: 'VidSrc SBS',
    mediaType: 'movie',
    enabled: true,
    buildUrl: ({ tmdbId }) => `https://vidsrc.sbs/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidcore-movie',
    name: 'VidCore',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    buildUrl: ({ tmdbId }) => `https://vidcore.org/embed/movie/${tmdbId}`,
  },
  {
    id: 'filmu-movie',
    name: 'FilmU',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    disableSandbox: true,
    buildUrl: ({ tmdbId }) => `https://embed.filmu.in/movie/${tmdbId}`,
  },

  // TV PROVIDERS
  {
    id: 'cinesrc-tv',
    name: 'CineSrc',
    mediaType: 'tv',
    enabled: true,
    isDefault: true,
    hasAds: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://cinesrc.st/embed/tv/${tmdbId}?s=${season}&e=${episode}`,
  },
  {
    id: 'vidsrc-sbs-tv',
    name: 'VidSrc SBS',
    mediaType: 'tv',
    enabled: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidcore-tv',
    name: 'VidCore',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidcore.org/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'filmu-tv',
    name: 'FilmU',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    disableSandbox: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://embed.filmu.in/tv/${tmdbId}/${season}/${episode}`,
  },
];

/**
 * Gets all enabled providers for a specific media type.
 */
export function getEnabledProviders(mediaType: MediaType): Provider[] {
  return providers.filter(p => p.enabled && p.mediaType === mediaType);
}

/**
 * Gets a specific provider by ID.
 */
export function getProviderById(id: string): Provider | undefined {
  return providers.find(p => p.id === id);
}

/**
 * Gets the default/fallback provider for a media type.
 */
export function getDefaultProvider(mediaType: MediaType): Provider | undefined {
  const enabled = getEnabledProviders(mediaType);
  return enabled.find(p => p.isDefault) || enabled[0];
}
