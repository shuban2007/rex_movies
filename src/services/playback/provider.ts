export type MediaType = 'movie' | 'tv';

export interface ProviderParams {
  tmdbId: number | string;
  season?: number | string;
  episode?: number | string;
  imdbId?: string | null;
  progress?: number;
}

export interface Provider {
  id: string;
  name: string;
  mediaType: MediaType;
  enabled: boolean;
  isDefault?: boolean;
  hasAds: boolean;
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
    priority: 4,
    buildUrl: ({ tmdbId }) => `https://vidsrc.sbs/embed/movie/${tmdbId}`,
  },
  {
    id: 'filmu-movie',
    name: 'FilmU',
    mediaType: 'movie',
    enabled: true,
    hasAds: true,
    priority: 2,
    buildUrl: ({ tmdbId }) => `https://embed.filmu.in/movie/${tmdbId}`,
  },
  {
    id: 'vidrift-movie',
    name: 'VidRift',
    mediaType: 'movie',
    enabled: true,
    hasAds: false,
    priority: 3,
    buildUrl: ({ tmdbId }) => `https://embed.vidrift.in/embed/movie/${tmdbId}?brand=REX.io`,
  },
  {
    id: 'vidy-movie',
    name: 'Vidy',
    mediaType: 'movie',
    enabled: true,
    hasAds: false,
    priority: 5,
    supportsPlaybackEvents: true,
    buildUrl: ({ tmdbId, progress }) => {
      const url = new URL(`https://vidy.st/movie/${tmdbId}`);
      url.searchParams.set('color', 'E50914');
      url.searchParams.set('autoplay', 'true');
      if (progress && progress > 0) {
        url.searchParams.set('progress', Math.floor(progress).toString());
      }
      return url.toString();
    }
  },

  // TV PROVIDERS
  {
    id: 'cinesrc-tv',
    name: 'CineSrc',
    mediaType: 'tv',
    enabled: true,
    isDefault: true,
    hasAds: true,
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
    priority: 4,
    buildUrl: ({ tmdbId, season, episode }) => `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'filmu-tv',
    name: 'FilmU',
    mediaType: 'tv',
    enabled: true,
    hasAds: true,
    priority: 2,
    buildUrl: ({ tmdbId, season, episode }) => `https://embed.filmu.in/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidrift-tv',
    name: 'VidRift',
    mediaType: 'tv',
    enabled: true,
    hasAds: false,
    priority: 3,
    supportsPlaybackEvents: true,
    buildUrl: ({ tmdbId, season, episode }) => `https://embed.vidrift.in/embed/tv/${tmdbId}/${season}/${episode}?brand=REX.io`,
  },
  {
    id: 'vidy-tv',
    name: 'Vidy',
    mediaType: 'tv',
    enabled: true,
    hasAds: false,
    priority: 5,
    supportsPlaybackEvents: true,
    buildUrl: ({ tmdbId, season, episode, progress }) => {
      const url = new URL(`https://vidy.st/tv/${tmdbId}/${season}/${episode}`);
      url.searchParams.set('color', 'E50914');
      url.searchParams.set('autoplay', 'true');
      if (progress && progress > 0) {
        url.searchParams.set('progress', Math.floor(progress).toString());
      }
      return url.toString();
    }
  },
  
  // NEXSTREAM
  {
    id: 'nexstream-movie',
    name: 'NexStream',
    mediaType: 'movie',
    enabled: !!(import.meta.env.VITE_NEXSTREAM_BASE_URL && import.meta.env.VITE_NEXSTREAM_API_KEY),
    hasAds: false,
    priority: 6,
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
    priority: 6,
    buildUrl: ({ tmdbId, season, episode }) => {
      const baseUrl = import.meta.env.VITE_NEXSTREAM_BASE_URL?.replace(/\/$/, '');
      const apiKey = import.meta.env.VITE_NEXSTREAM_API_KEY;
      if (!baseUrl || !apiKey) return '';
      return `${baseUrl}/embed/tv/${tmdbId}/${season}/${episode}?apikey=${apiKey}`;
    }
  },
  
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
  progress?: number;
}

export function getMovieProviderUrl(provider: Provider, media: ProviderMedia): string | null {
  if (!provider.enabled || provider.mediaType !== 'movie') return null;
  if (!media.tmdbId || isNaN(media.tmdbId)) return null;

  try {
    const url = provider.buildUrl({
      tmdbId: media.tmdbId,
      imdbId: media.imdbId,
      progress: media.progress
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
      imdbId: media.imdbId,
      progress: media.progress
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
