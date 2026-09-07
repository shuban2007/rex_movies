-- 1. Add new columns to watchlist
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'movie';

-- 2. Add new columns to watch_history
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'movie';
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS season_number INTEGER;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS episode_number INTEGER;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS episode_title TEXT;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS progress INTEGER;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS duration INTEGER;

-- 3. Drop existing simple unique constraints
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_tmdb_id_key;
ALTER TABLE watch_history DROP CONSTRAINT IF EXISTS watch_history_user_id_tmdb_id_key;

-- 4. Create proper unique indexes handling nullable fields

-- Watchlist uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_unique_idx 
  ON watchlist (user_id, tmdb_id, media_type);

-- Watch History uniqueness for Movies
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_movie_unique_idx 
  ON watch_history (user_id, tmdb_id, media_type) 
  WHERE media_type = 'movie';

-- Watch History uniqueness for TV Episodes
-- (Uses season_number and episode_number. By using a partial index, we avoid the NULL != NULL issue)
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_tv_unique_idx 
  ON watch_history (user_id, tmdb_id, media_type, season_number, episode_number) 
  WHERE media_type = 'tv' AND season_number IS NOT NULL AND episode_number IS NOT NULL;
