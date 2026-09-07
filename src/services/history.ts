import { supabase } from '../lib/supabase';
import type { HistoryItem } from '../types/database';
import type { MediaSearchResult, TvSeriesDetails, MovieSearchResult } from './tmdb';

const GUEST_HISTORY_KEY = 'guest_history';

function getGuestHistory(): HistoryItem[] {
  try {
    const data = sessionStorage.getItem(GUEST_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

function setGuestHistory(list: HistoryItem[]) {
  sessionStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(list));
}

// Simple debounce map to prevent spamming the database
const progressUpdateTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const historyService = {
  async getHistory(userId: string | undefined): Promise<HistoryItem[]> {
    if (!userId) {
      return getGuestHistory();
    }

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .order('watched_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error.message);
      return [];
    }

    return data || [];
  },

  async recordProgress(
    media: MediaSearchResult | MovieSearchResult | TvSeriesDetails,
    mediaType: 'movie' | 'tv',
    userId: string | undefined,
    seasonNumber?: number,
    episodeNumber?: number,
    episodeTitle?: string,
    progress?: number,
    duration?: number
  ): Promise<void> {
    
    const recordPayload = {
      tmdb_id: media.id,
      media_type: mediaType,
      title: media.title,
      year: media.year,
      poster_path: media.posterPath || (media as any).backdropPath,
      season_number: seasonNumber || null,
      episode_number: episodeNumber || null,
      episode_title: episodeTitle || null,
      progress: progress || null,
      duration: duration || null,
      watched_at: new Date().toISOString()
    };

    if (!userId) {
      const guestList = getGuestHistory();
      // Remove old exact match to prepend updated one
      const filtered = guestList.filter(m => {
        if (mediaType === 'movie') return m.tmdb_id !== media.id;
        return !(m.tmdb_id === media.id && m.season_number === seasonNumber && m.episode_number === episodeNumber);
      });
      
      filtered.unshift({
        id: `guest_${media.id}_${seasonNumber || 0}_${episodeNumber || 0}`,
        user_id: 'guest',
        ...recordPayload
      } as HistoryItem);
      
      setGuestHistory(filtered);
      window.dispatchEvent(new Event('history-updated'));
      return;
    }

    // Debounce database writes (save immediately if progress isn't continuously changing, otherwise throttle)
    const timerKey = `${userId}_${media.id}_${mediaType}_${seasonNumber}_${episodeNumber}`;
    if (progressUpdateTimers[timerKey]) {
      clearTimeout(progressUpdateTimers[timerKey]);
    }

    // Wrap in a promise so the caller doesn't have to await the debounce
    progressUpdateTimers[timerKey] = setTimeout(async () => {
      // Upsert logic differs based on media type because of our unique indexes
      const onConflict = mediaType === 'movie' 
        ? 'user_id, tmdb_id, media_type' 
        : 'user_id, tmdb_id, media_type, season_number, episode_number';

      const { error } = await supabase
        .from('watch_history')
        .upsert({
          user_id: userId,
          ...recordPayload
        }, {
          onConflict
        });

      if (error) {
        console.error('Error recording history:', error.message);
      } else {
        window.dispatchEvent(new Event('history-updated'));
      }
    }, 2000); // Debounce by 2 seconds to prevent rapid updates
  },

  async clearHistory(userId: string | undefined): Promise<void> {
    if (!userId) {
      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      window.dispatchEvent(new Event('history-updated'));
      return;
    }

    const { error } = await supabase
      .from('watch_history')
      .delete()
      .match({ user_id: userId });

    if (error) {
      console.error('Error clearing history:', error.message);
    } else {
      window.dispatchEvent(new Event('history-updated'));
    }
  },

  async mergeGuestHistory(userId: string): Promise<void> {
    const guestList = getGuestHistory();
    if (guestList.length === 0) return;

    try {
      const toUpsert = guestList.map(m => ({
        user_id: userId,
        tmdb_id: m.tmdb_id,
        media_type: m.media_type || 'movie',
        title: m.title,
        year: m.year,
        poster_path: m.poster_path,
        season_number: m.season_number,
        episode_number: m.episode_number,
        episode_title: m.episode_title,
        progress: m.progress,
        duration: m.duration,
        watched_at: m.watched_at
      }));

      // Merge movies
      const movies = toUpsert.filter(m => m.media_type === 'movie');
      if (movies.length > 0) {
        await supabase.from('watch_history').upsert(movies, { onConflict: 'user_id, tmdb_id, media_type' });
      }

      // Merge TV
      const tvs = toUpsert.filter(m => m.media_type === 'tv' && m.season_number != null && m.episode_number != null);
      if (tvs.length > 0) {
        await supabase.from('watch_history').upsert(tvs, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' });
      }

      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error('Failed to merge guest history:', err);
    }
  }
};
