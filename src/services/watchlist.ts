import { supabase } from '../lib/supabase';
import type { WatchlistItem } from '../types/database';
import type { MovieSearchResult } from './tmdb';

let watchlistCache: WatchlistItem[] | null = null;
let currentUserId: string | null = null;

const GUEST_WATCHLIST_KEY = 'guest_watchlist';

function getGuestWatchlist(): WatchlistItem[] {
  try {
    const data = sessionStorage.getItem(GUEST_WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

function setGuestWatchlist(list: WatchlistItem[]) {
  sessionStorage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(list));
}

export const watchlistService = {
  async getWatchlist(userId: string | undefined): Promise<WatchlistItem[]> {
    if (!userId) {
      watchlistCache = getGuestWatchlist();
      currentUserId = null;
      return watchlistCache;
    }

    // Return cache if it matches the current user
    if (watchlistCache && currentUserId === userId) {
      return watchlistCache;
    }
    
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching watchlist:', error.message);
      return [];
    }
    
    watchlistCache = data || [];
    currentUserId = userId;
    return watchlistCache;
  },

  isInWatchlistSync(tmdbId: number): boolean {
    if (!watchlistCache) return false;
    return !!watchlistCache.find(m => m.tmdb_id === tmdbId);
  },

  async addMovie(movie: MovieSearchResult, userId: string | undefined): Promise<boolean> {
    if (!userId) {
      const guestList = getGuestWatchlist();
      if (!guestList.find(m => m.tmdb_id === movie.id)) {
        guestList.unshift({
          id: `guest_${movie.id}`,
          user_id: 'guest',
          tmdb_id: movie.id,
          title: movie.title,
          year: movie.year,
          poster_path: movie.posterPath,
          backdrop_path: movie.backdropPath,
          created_at: new Date().toISOString()
        });
        setGuestWatchlist(guestList);
        watchlistCache = guestList;
        window.dispatchEvent(new Event('watchlist-updated'));
      }
      return true;
    }

    const { error } = await supabase
      .from('watchlist')
      .insert({
        user_id: userId,
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.year,
        poster_path: movie.posterPath,
        backdrop_path: movie.backdropPath
      });

    if (error) {
      if (error.code !== '23505') {
        console.error('Error adding to watchlist:', error.message);
        return false;
      }
    }

    // Optimistically update cache
    if (watchlistCache) {
      watchlistCache.unshift({
        id: 'optimistic',
        user_id: userId,
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.year,
        poster_path: movie.posterPath,
        backdrop_path: movie.backdropPath,
        created_at: new Date().toISOString()
      });
    }

    window.dispatchEvent(new Event('watchlist-updated'));
    return true;
  },

  async removeMovie(tmdbId: number, userId: string | undefined): Promise<boolean> {
    if (!userId) {
      const guestList = getGuestWatchlist();
      const newList = guestList.filter(m => m.tmdb_id !== tmdbId);
      setGuestWatchlist(newList);
      watchlistCache = newList;
      window.dispatchEvent(new Event('watchlist-updated'));
      return true;
    }

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .match({ user_id: userId, tmdb_id: tmdbId });

    if (error) {
      console.error('Error removing from watchlist:', error.message);
      return false;
    }

    if (watchlistCache) {
      watchlistCache = watchlistCache.filter(m => m.tmdb_id !== tmdbId);
    }

    window.dispatchEvent(new Event('watchlist-updated'));
    return true;
  },

  async mergeGuestWatchlist(userId: string): Promise<void> {
    const guestList = getGuestWatchlist();
    if (guestList.length === 0) return;

    try {
      // Get existing Supabase watchlist to avoid duplicates
      const { data: existingData, error: fetchError } = await supabase
        .from('watchlist')
        .select('tmdb_id')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const existingIds = new Set((existingData || []).map(m => m.tmdb_id));
      const toInsert = guestList.filter(m => !existingIds.has(m.tmdb_id)).map(m => ({
        user_id: userId,
        tmdb_id: m.tmdb_id,
        title: m.title,
        year: m.year,
        poster_path: m.poster_path,
        backdrop_path: m.backdrop_path,
        created_at: m.created_at
      }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('watchlist')
          .insert(toInsert);
          
        if (insertError) {
          console.error('Error merging guest watchlist:', insertError.message);
          return;
        }
      }

      sessionStorage.removeItem(GUEST_WATCHLIST_KEY);
      this.clearCache(); // Force refresh from Supabase on next load
      window.dispatchEvent(new Event('watchlist-updated'));
    } catch (err) {
      console.error('Failed to merge guest watchlist:', err);
    }
  },

  clearCache() {
    watchlistCache = null;
    currentUserId = null;
  }
};
