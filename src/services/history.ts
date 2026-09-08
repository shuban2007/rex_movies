import { supabase } from '../lib/supabase';
import type { HistoryItem } from '../types/database';
import type { MediaSearchResult, TvSeriesDetails, MovieSearchResult } from './tmdb';

const GUEST_HISTORY_KEY = 'guest_history';

function getGuestHistory(): HistoryItem[] {
  try {
    const data = sessionStorage.getItem(GUEST_HISTORY_KEY);
    const parsed = data ? JSON.parse(data) : [];
    
    // Deduplicate on load
    const deduplicated = deduplicateHistory(parsed);
    if (deduplicated.length !== parsed.length) {
      setGuestHistory(deduplicated);
    }
    
    return deduplicated;
  } catch (err) {
    return [];
  }
}

/**
 * Deduplicates a list of history items, keeping only the most recently 
 * updated record for each unique mediaType + tmdbId combination.
 */
function deduplicateHistory(list: HistoryItem[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>();
  
  // Assuming list is sorted newest first, but let's sort to be safe
  const sorted = [...list].sort((a, b) => {
    return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
  });

  for (const item of sorted) {
    const key = `${item.media_type}_${item.tmdb_id}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  
  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
  });
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

    const items = data || [];
    const deduplicated = deduplicateHistory(items);
    
    // Auto-clean duplicates in DB if found
    if (deduplicated.length !== items.length) {
      const keptIds = new Set(deduplicated.map(d => d.id));
      const duplicateIds = items.filter(item => !keptIds.has(item.id)).map(item => item.id);
      
      if (duplicateIds.length > 0) {
        supabase.from('watch_history').delete().in('id', duplicateIds).then();
      }
    }

    return deduplicated;
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
      // Remove any matching media.id AND mediaType
      const filtered = guestList.filter(m => !(m.tmdb_id === media.id && m.media_type === mediaType));
      
      filtered.unshift({
        id: `guest_${media.id}_${mediaType}`,
        user_id: 'guest',
        ...recordPayload
      } as HistoryItem);
      
      setGuestHistory(filtered);
      window.dispatchEvent(new Event('history-updated'));
      return;
    }

    // Debounce database writes
    const timerKey = `${userId}_${media.id}_${mediaType}`;
    if (progressUpdateTimers[timerKey]) {
      clearTimeout(progressUpdateTimers[timerKey]);
    }

    progressUpdateTimers[timerKey] = setTimeout(async () => {
      // Find existing record by mediaType and tmdbId
      const { data: existingRecords, error: selectError } = await supabase
        .from('watch_history')
        .select('id')
        .match({ user_id: userId, tmdb_id: media.id, media_type: mediaType })
        .order('watched_at', { ascending: false });

      if (selectError) {
        console.error('Error checking history existence:', selectError.message);
        return;
      }

      if (existingRecords && existingRecords.length > 0) {
        // Update the most recent existing record
        const { error: updateError } = await supabase
          .from('watch_history')
          .update(recordPayload)
          .eq('id', existingRecords[0].id);

        if (updateError) {
          console.error('Error updating history:', updateError.message);
        } else {
          // If there were duplicates in DB, clean them up now
          if (existingRecords.length > 1) {
            const extraIds = existingRecords.slice(1).map(r => r.id);
            await supabase.from('watch_history').delete().in('id', extraIds);
          }
          window.dispatchEvent(new Event('history-updated'));
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('watch_history')
          .insert({
            user_id: userId,
            ...recordPayload
          });

        if (insertError) {
          console.error('Error inserting history:', insertError.message);
        } else {
          window.dispatchEvent(new Event('history-updated'));
        }
      }
    }, 2000);
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

      // Merge TV - because of the Supabase unique index we cannot blindly upsert on user_id, tmdb_id, media_type.
      // So we insert/update manually to avoid creating duplicate records.
      const tvs = deduplicateHistory(toUpsert.filter(m => m.media_type === 'tv') as HistoryItem[]);
      if (tvs.length > 0) {
        for (const tv of tvs) {
          const { data: existing } = await supabase
            .from('watch_history')
            .select('id')
            .match({ user_id: userId, tmdb_id: tv.tmdb_id, media_type: 'tv' })
            .limit(1)
            .single();

          if (existing) {
            await supabase.from('watch_history').update({
              title: tv.title,
              year: tv.year,
              poster_path: tv.poster_path,
              season_number: tv.season_number,
              episode_number: tv.episode_number,
              episode_title: tv.episode_title,
              progress: tv.progress,
              duration: tv.duration,
              watched_at: tv.watched_at
            }).eq('id', existing.id);
          } else {
            await supabase.from('watch_history').insert({
              user_id: userId,
              tmdb_id: tv.tmdb_id,
              media_type: 'tv',
              title: tv.title,
              year: tv.year,
              poster_path: tv.poster_path,
              season_number: tv.season_number,
              episode_number: tv.episode_number,
              episode_title: tv.episode_title,
              progress: tv.progress,
              duration: tv.duration,
              watched_at: tv.watched_at
            });
          }
        }
      }

      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error('Failed to merge guest history:', err);
    }
  }
};
