export interface WatchlistItem {
  id: number;
  type: 'movie' | 'tv';
}

export interface HistoryItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  watchedAt: number;
  season?: number;
  episode?: number;
  providerId?: string;
}
