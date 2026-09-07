import { supabase } from '../lib/supabase';
import type { HistoryItem } from '../types/database';
import type { MovieSearchResult } from './tmdb';

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

  async recordMovie(movie: MovieSearchResult, userId: string | undefined): Promise<void> {
    if (!userId) {
      const guestList = getGuestHistory();
      const filtered = guestList.filter(m => m.tmdb_id !== movie.id);
      filtered.unshift({
        id: `guest_${movie.id}`,
        user_id: 'guest',
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.year,
        poster_path: movie.posterPath,
        watched_at: new Date().toISOString()
      } as HistoryItem);
      
      setGuestHistory(filtered);
      window.dispatchEvent(new Event('history-updated'));
      return;
    }

    // Use upsert to handle uniqueness constraint on (user_id, tmdb_id)
    const { error } = await supabase
      .from('watch_history')
      .upsert({
        user_id: userId,
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.year,
        poster_path: movie.posterPath,
        watched_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, tmdb_id'
      });

    if (error) {
      console.error('Error recording history:', error.message);
    } else {
      window.dispatchEvent(new Event('history-updated'));
    }
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
        title: m.title,
        year: m.year,
        poster_path: m.poster_path,
        watched_at: m.watched_at
      }));

      // Upsert handles conflict on (user_id, tmdb_id)
      const { error: upsertError } = await supabase
        .from('watch_history')
        .upsert(toUpsert, {
          onConflict: 'user_id, tmdb_id'
        });

      if (upsertError) {
        console.error('Error merging guest history:', upsertError.message);
        return;
      }

      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error('Failed to merge guest history:', err);
    }
  }
};
