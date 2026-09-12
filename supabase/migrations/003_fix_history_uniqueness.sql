-- Fix watch_history uniqueness: ONE row per user + tmdb_id + media_type (for both movies AND TV)
-- This replaces the previous per-episode TV uniqueness with a single record per series.

-- 1. Drop the old TV episode-level unique index
DROP INDEX IF EXISTS watch_history_tv_unique_idx;

-- 2. Drop the old movie-only unique index  
DROP INDEX IF EXISTS watch_history_movie_unique_idx;

-- 3. Create a single unified unique index for ALL media types
--    This enforces exactly one history row per user + tmdb_id + media_type
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_media_unique_idx
  ON watch_history (user_id, tmdb_id, media_type);

-- 4. Clean up any existing duplicate rows (keep the most recently watched)
-- This CTE deletes all but the newest row for each user+tmdb_id+media_type combo
DELETE FROM watch_history
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, tmdb_id, media_type
             ORDER BY watched_at DESC
           ) AS rn
    FROM watch_history
  ) ranked
  WHERE rn > 1
);
