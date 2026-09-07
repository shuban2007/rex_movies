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
  buildUrl: (params: ProviderParams) => string;
}

export const providers: Provider[] = [
  // MOVIE PROVIDERS
  {
    id: 'vidsrc-movie',
    name: 'VidSrc',
    mediaType: 'movie',
    enabled: false,
    buildUrl: ({ tmdbId }) => `https://v1.vidsrc.wiki/embed/movie/${tmdbId}/`,
  },
  {
    id: 'autoembed-movie',
    name: 'AutoEmbed',
    mediaType: 'movie',
    enabled: false,
    buildUrl: ({ tmdbId }) => `https://autoembed.app/embed/movie/${tmdbId}`,
  },
  {
    id: 'autoembed-movie-2',
    name: 'AutoEmbed Server 2',
    mediaType: 'movie',
    enabled: false,
    buildUrl: ({ tmdbId }) => `https://autoembed.app/embed/movie/${tmdbId}?server=2`,
  },
  {
    id: 'watch-v2-autoembed-movie',
    name: 'AutoEmbed Watch v2',
    mediaType: 'movie',
    enabled: false,
    buildUrl: ({ tmdbId }) => `https://watch-v2.autoembed.app/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidsrc-sbs-movie',
    name: 'VidSrc SBS',
    mediaType: 'movie',
    enabled: true,
    isDefault: true,
    buildUrl: ({ tmdbId }) => `https://vidsrc.sbs/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidsrc-wiki-movie',
    name: 'VidSrc',
    mediaType: 'movie',
    enabled: false,
    buildUrl: ({ tmdbId }) => `https://v1.vidsrc.wiki/embed/movie/${tmdbId}/`,
  },

  // TV PROVIDERS
  {
    id: 'vidsrc-tv',
    name: 'VidSrc',
    mediaType: 'tv',
    enabled: false,
    buildUrl: ({ tmdbId, season, episode }) => `https://v1.vidsrc.wiki/embed/tv/${tmdbId}/${season}/${episode}/`,
  },
  {
    id: 'autoembed-tv',
    name: 'AutoEmbed',
    mediaType: 'tv',
    enabled: false,
    buildUrl: ({ tmdbId, season, episode }) => `https://autoembed.app/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'autoembed-tv-2',
    name: 'AutoEmbed Server 2',
    mediaType: 'tv',
    enabled: false,
    buildUrl: ({ tmdbId, season, episode }) => `https://autoembed.app/embed/tv/${tmdbId}/${season}/${episode}?server=2`,
  },
  {
    id: 'watch-v2-autoembed-tv',
    name: 'AutoEmbed Watch v2',
    mediaType: 'tv',
    enabled: false,
    buildUrl: ({ tmdbId, season, episode }) => `https://watch-v2.autoembed.app/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrc-wiki-tv',
    name: 'VidSrc',
    mediaType: 'tv',
    enabled: false,
    buildUrl: ({ tmdbId, season, episode }) => `https://v1.vidsrc.wiki/embed/tv/${tmdbId}/${season}/${episode}/`,
  },
  {
    id: 'vidsrc-sbs-tv',
    name: 'VidSrc SBS',
    mediaType: 'tv',
    enabled: true,
    isDefault: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,
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
