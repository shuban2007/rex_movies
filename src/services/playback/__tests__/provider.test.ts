import { describe, it, expect } from 'vitest';
import {
  getEnabledProviders,
  getProviderById,
  getDefaultProvider,
  getMovieProviderUrl,
  getTVProviderUrl
} from '../provider';

describe('Playback Provider Service', () => {
  it('registers VidCore for both movies and tv shows', () => {
    const vidcoreMovie = getProviderById('vidcore-movie');
    const vidcoreTv = getProviderById('vidcore-tv');

    expect(vidcoreMovie).toBeDefined();
    expect(vidcoreMovie?.name).toBe('VidCore');
    expect(vidcoreMovie?.mediaType).toBe('movie');
    expect(vidcoreMovie?.enabled).toBe(true);
    expect(vidcoreMovie?.hasAds).toBe(false);

    expect(vidcoreTv).toBeDefined();
    expect(vidcoreTv?.name).toBe('VidCore');
    expect(vidcoreTv?.mediaType).toBe('tv');
    expect(vidcoreTv?.enabled).toBe(true);
    expect(vidcoreTv?.hasAds).toBe(false);
  });

  it('builds valid movie embed URLs for VidCore with theme and autoplay', () => {
    const vidcoreMovie = getProviderById('vidcore-movie');
    expect(vidcoreMovie).toBeDefined();

    const url = getMovieProviderUrl(vidcoreMovie!, { tmdbId: 533535 });
    expect(url).toBe('https://vidcore.org/embed/movie/533535?theme=e50914&autoplay=true');
  });

  it('builds valid TV series embed URLs for VidCore with season and episode', () => {
    const vidcoreTv = getProviderById('vidcore-tv');
    expect(vidcoreTv).toBeDefined();

    const url = getTVProviderUrl(vidcoreTv!, { tmdbId: 1396 }, 1, 3);
    expect(url).toBe('https://vidcore.org/embed/tv/1396/1/3?theme=e50914&autoplay=true');
  });

  it('falls back to imdbId when tmdbId is not provided', () => {
    const vidcoreMovie = getProviderById('vidcore-movie');
    expect(vidcoreMovie).toBeDefined();

    const url = vidcoreMovie!.buildUrl({ tmdbId: '', imdbId: 'tt0816692' });
    expect(url).toBe('https://vidcore.org/embed/movie/tt0816692?theme=e50914&autoplay=true');
  });

  it('sorts enabled providers by priority', () => {
    const movieProviders = getEnabledProviders('movie');
    expect(movieProviders.length).toBeGreaterThan(1);
    
    // Priorities should be non-decreasing
    for (let i = 0; i < movieProviders.length - 1; i++) {
      expect(movieProviders[i].priority).toBeLessThanOrEqual(movieProviders[i + 1].priority);
    }

    // CineSrc is priority 1, VidCore is priority 2
    expect(movieProviders[0].id).toBe('cinesrc-movie');
    expect(movieProviders[1].id).toBe('vidcore-movie');
  });

  it('returns default provider correctly', () => {
    const defaultMovie = getDefaultProvider('movie');
    const defaultTv = getDefaultProvider('tv');

    expect(defaultMovie).toBeDefined();
    expect(defaultMovie?.id).toBe('cinesrc-movie');
    expect(defaultTv).toBeDefined();
    expect(defaultTv?.id).toBe('cinesrc-tv');
  });

  it('handles invalid inputs gracefully in getMovieProviderUrl and getTVProviderUrl', () => {
    const vidcoreMovie = getProviderById('vidcore-movie')!;
    const vidcoreTv = getProviderById('vidcore-tv')!;

    expect(getMovieProviderUrl(vidcoreMovie, { tmdbId: NaN })).toBeNull();
    expect(getTVProviderUrl(vidcoreTv, { tmdbId: NaN }, 1, 1)).toBeNull();
    expect(getTVProviderUrl(vidcoreTv, { tmdbId: 100 }, -1, 1)).toBeNull();
  });
});
