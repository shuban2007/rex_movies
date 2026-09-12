export type MediaType = 'movie' | 'tv';

export interface ProviderParams {
  tmdbId: number | string;
  season?: number | string;
  episode?: number | string;
  imdbId?: string | null;
}

export interface Provider {
  id: string;
  name: string;
  mediaType: MediaType;
  enabled: boolean;
  isDefault?: boolean;
  hasAds: boolean;
  supportsSandbox: boolean;
  supportsPlaybackEvents?: boolean;
  priority: number;
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
    supportsSandbox: true,
    supportsPlaybackEvents: true,
    priority: 1, // SET AS TOP PRIORITY
    buildUrl: ({ tmdbId }) => `https://cinesrc.st/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidsrc-sbs-movie',
    name: 'VidSrc SBS',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    supportsSandbox: true,
    priority: 4,
    buildUrl: ({ tmdbId }) => `https://vidsrc.sbs/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidcore-movie',
    name: 'VidCore',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    supportsSandbox: true,
    priority: 5,
    buildUrl: ({ tmdbId }) => `https://vidcore.org/embed/movie/${tmdbId}`,
  },
  {
    id: 'filmu-movie',
    name: 'FilmU',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    supportsSandbox: false,
    priority: 6,
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
    supportsSandbox: true,
    supportsPlaybackEvents: true,
    priority: 1, // SET AS TOP PRIORITY
    buildUrl: ({ tmdbId, season, episode }) => `https://cinesrc.st/embed/tv/${tmdbId}?s=${season}&e=${episode}`,
  },
  {
    id: 'vidsrc-sbs-tv',
    name: 'VidSrc SBS',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    supportsSandbox: true,
    priority: 4,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidcore-tv',
    name: 'VidCore',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    supportsSandbox: true,
    priority: 5,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidcore.org/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'filmu-tv',
    name: 'FilmU',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    supportsSandbox: false,
    priority: 6,
    buildUrl: ({ tmdbId, season, episode }) => `https://embed.filmu.in/tv/${tmdbId}/${season}/${episode}`,
  },
  
  // NEXSTREAM
  {
    id: 'nexstream-movie',
    name: 'NexStream',
    mediaType: 'movie',
    enabled: !!(import.meta.env.VITE_NEXSTREAM_BASE_URL && import.meta.env.VITE_NEXSTREAM_API_KEY),
    hasAds: false,
    supportsSandbox: true,
    priority: 2,
    buildUrl: ({ tmdbId }) => {
      const baseUrl = import.meta.env.VITE_NEXSTREAM_BASE_URL?.replace(/\/$/, '');
      const apiKey = import.meta.env.VITE_NEXSTREAM_API_KEY;
      if (!baseUrl || !apiKey) return '';
      return `${baseUrl}/embed/movie/${tmdbId}?apikey=${apiKey}`;
    }
  },
  {
    id: 'nexstream-tv',
    name: 'NexStream',
    mediaType: 'tv',
    enabled: !!(import.meta.env.VITE_NEXSTREAM_BASE_URL && import.meta.env.VITE_NEXSTREAM_API_KEY),
    hasAds: false,
    supportsSandbox: true,
    priority: 2,
    buildUrl: ({ tmdbId, season, episode }) => {
      const baseUrl = import.meta.env.VITE_NEXSTREAM_BASE_URL?.replace(/\/$/, '');
      const apiKey = import.meta.env.VITE_NEXSTREAM_API_KEY;
      if (!baseUrl || !apiKey) return '';
      return `${baseUrl}/embed/tv/${tmdbId}/${season}/${episode}?apikey=${apiKey}`;
    }
  },
  
  // EMBEDMASTER
  {
    id: 'embedmaster-movie',
    name: 'EmbedMaster',
    mediaType: 'movie',
    enabled: true,
    hasAds: false,
    supportsSandbox: true,
    priority: 3,
    buildUrl: ({ tmdbId, imdbId }) => {
      const id = imdbId || `tmdb-${tmdbId}`;
      return `https://embedmaster.link/movie/${id}?skin=onyx&welcome_page=off`;
    }
  },
  {
    id: 'embedmaster-tv',
    name: 'EmbedMaster',
    mediaType: 'tv',
    enabled: true,
    hasAds: false,
    supportsSandbox: true,
    priority: 3,
    buildUrl: ({ tmdbId, season, episode, imdbId }) => {
      const id = imdbId || `tmdb-${tmdbId}`;
      return `https://embedmaster.link/tv/${id}/${season}/${episode}?skin=onyx&welcome_page=off`;
    }
  }
];

/**
 * Gets all enabled providers for a specific media type, sorted by priority.
 */
export function getEnabledProviders(mediaType: MediaType): Provider[] {
  return providers
    .filter(p => p.enabled && p.mediaType === mediaType)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Gets a specific provider by ID.
 */
export function getProviderById(id: string): Provider | undefined {
  return providers.find(p => p.id === id);
}

/**
 * Gets the default/fallback provider for a media type.
 * Since providers are sorted by priority, this returns the highest priority provider.
 */
export function getDefaultProvider(mediaType: MediaType): Provider | undefined {
  const enabled = getEnabledProviders(mediaType);
  return enabled.find(p => p.isDefault) || enabled[0];
}

export interface ProviderMedia {
  tmdbId: number;
  imdbId?: string | null;
}

export function getMovieProviderUrl(provider: Provider, media: ProviderMedia): string | null {
  if (!provider.enabled || provider.mediaType !== 'movie') return null;
  if (!media.tmdbId || isNaN(media.tmdbId)) return null;

  try {
    const url = provider.buildUrl({
      tmdbId: media.tmdbId,
      imdbId: media.imdbId
    });

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }

    new URL(url);
    return url;
  } catch {
    return null;
  }
}

export function getTVProviderUrl(
  provider: Provider,
  media: ProviderMedia,
  season: number,
  episode: number
): string | null {
  if (!provider.enabled || provider.mediaType !== 'tv') return null;
  if (!media.tmdbId || isNaN(media.tmdbId)) return null;
  if (typeof season !== 'number' || season < 0 || isNaN(season)) return null;
  if (typeof episode !== 'number' || episode < 0 || isNaN(episode)) return null;

  try {
    const url = provider.buildUrl({
      tmdbId: media.tmdbId,
      season,
      episode,
      imdbId: media.imdbId
    });

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }

    new URL(url);
    return url;
  } catch {
    return null;
  }
}
