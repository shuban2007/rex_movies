export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  year: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  year: string | null;
  poster_path: string | null;
  season_number?: number | null;
  episode_number?: number | null;
  episode_title?: string | null;
  progress?: number | null;
  duration?: number | null;
  watched_at: string;
}
