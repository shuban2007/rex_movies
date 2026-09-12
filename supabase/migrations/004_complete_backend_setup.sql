-- ============================================================
-- Migration 004: Complete Supabase Backend for Email Auth
-- ============================================================
-- This migration brings the existing schema into full alignment
-- with the REX.io requirements:
--   1. Add missing columns
--   2. Add CHECK constraints for media_type
--   3. Add missing RLS policies (watchlist UPDATE)
--   4. Add updated_at auto-update trigger
--   5. Update profile creation trigger for email/password users
--   6. Clean up stale column names
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. WATCHLIST: add missing columns, constraints, policies
-- ────────────────────────────────────────────────────────────

-- media_type already exists from migration 002, but enforce NOT NULL + CHECK
-- First backfill any NULLs
UPDATE watchlist SET media_type = 'movie' WHERE media_type IS NULL;

-- Safely add NOT NULL (will fail if NULLs remain, but we just fixed them)
ALTER TABLE watchlist ALTER COLUMN media_type SET NOT NULL;
ALTER TABLE watchlist ALTER COLUMN media_type SET DEFAULT 'movie';

-- Add CHECK constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'watchlist_media_type_check'
  ) THEN
    ALTER TABLE watchlist ADD CONSTRAINT watchlist_media_type_check 
      CHECK (media_type IN ('movie', 'tv'));
  END IF;
END $$;

-- Add UPDATE policy for watchlist (was missing — needed for upsert support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'watchlist' AND policyname = 'Users can update their own watchlist.'
  ) THEN
    CREATE POLICY "Users can update their own watchlist."
      ON watchlist FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. WATCH_HISTORY: add missing columns, fix existing ones
-- ────────────────────────────────────────────────────────────

-- Add backdrop_path (was missing from original schema)
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS backdrop_path TEXT;

-- Add updated_at (was missing from original schema)
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename progress → progress_seconds for clarity (if progress exists)
-- We can't use ALTER COLUMN RENAME IF EXISTS, so check first
DO $$
BEGIN
  -- If 'progress' column exists but 'progress_seconds' does not, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'watch_history' AND column_name = 'progress'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'watch_history' AND column_name = 'progress_seconds'
  ) THEN
    ALTER TABLE watch_history RENAME COLUMN progress TO progress_seconds;
  END IF;
  
  -- If 'progress_seconds' still doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'watch_history' AND column_name = 'progress_seconds'
  ) THEN
    ALTER TABLE watch_history ADD COLUMN progress_seconds INTEGER DEFAULT 0;
  END IF;
END $$;

-- Drop the old 'duration' column if it exists (no longer needed)
ALTER TABLE watch_history DROP COLUMN IF EXISTS duration;

-- Backfill NULLs for media_type
UPDATE watch_history SET media_type = 'movie' WHERE media_type IS NULL;

-- Enforce NOT NULL + CHECK on media_type
ALTER TABLE watch_history ALTER COLUMN media_type SET NOT NULL;
ALTER TABLE watch_history ALTER COLUMN media_type SET DEFAULT 'movie';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'watch_history_media_type_check'
  ) THEN
    ALTER TABLE watch_history ADD CONSTRAINT watch_history_media_type_check 
      CHECK (media_type IN ('movie', 'tv'));
  END IF;
END $$;

-- Set default for progress_seconds
ALTER TABLE watch_history ALTER COLUMN progress_seconds SET DEFAULT 0;

-- Backfill updated_at for rows that have NULL
UPDATE watch_history SET updated_at = watched_at WHERE updated_at IS NULL;


-- ────────────────────────────────────────────────────────────
-- 3. UPDATED_AT AUTO-UPDATE TRIGGER
-- ────────────────────────────────────────────────────────────
-- This trigger automatically sets updated_at = NOW() on any UPDATE.
-- Applied to profiles and watch_history.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles: auto-update updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Watch History: auto-update updated_at
DROP TRIGGER IF EXISTS set_watch_history_updated_at ON watch_history;
CREATE TRIGGER set_watch_history_updated_at
  BEFORE UPDATE ON watch_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 4. UPDATE PROFILE CREATION TRIGGER
-- ────────────────────────────────────────────────────────────
-- The original trigger only handled Google OAuth metadata.
-- This version also handles email/password signups where the
-- display name is stored in raw_user_meta_data.display_name
-- or raw_user_meta_data.full_name.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  name_val TEXT;
  avatar_val TEXT;
BEGIN
  -- Try to extract display name from metadata
  -- Google OAuth: full_name or name
  -- Email/password: display_name (set by frontend during signup)
  name_val := NEW.raw_user_meta_data->>'full_name';
  
  IF name_val IS NULL THEN
    name_val := NEW.raw_user_meta_data->>'name';
  END IF;
  
  IF name_val IS NULL THEN
    name_val := NEW.raw_user_meta_data->>'display_name';
  END IF;

  -- Try to extract avatar URL
  -- Google OAuth: avatar_url or picture
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';
  
  IF avatar_val IS NULL THEN
    avatar_val := NEW.raw_user_meta_data->>'picture';
  END IF;

  -- Insert profile row (id matches auth.users.id)
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, name_val, avatar_val)
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself already exists from migration 001, no need to recreate
-- (CREATE OR REPLACE on the function is sufficient)


-- ────────────────────────────────────────────────────────────
-- 5. VERIFY UNIQUE INDEXES EXIST
-- ────────────────────────────────────────────────────────────
-- These should already exist from migrations 002/003, but ensure they are present.

-- Watchlist: (user_id, tmdb_id, media_type)
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_unique_idx 
  ON watchlist (user_id, tmdb_id, media_type);

-- Watch History: (user_id, tmdb_id, media_type)
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_media_unique_idx 
  ON watch_history (user_id, tmdb_id, media_type);

-- Clean up any stale partial indexes from migration 002 (if they still exist)
DROP INDEX IF EXISTS watch_history_tv_unique_idx;
DROP INDEX IF EXISTS watch_history_movie_unique_idx;


-- ────────────────────────────────────────────────────────────
-- 6. DEDUPLICATE EXISTING HISTORY (safety re-run)
-- ────────────────────────────────────────────────────────────
-- This is idempotent — if migration 003 already ran, there are no duplicates.
-- But if 003 failed or was skipped, this catches them.

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


-- ────────────────────────────────────────────────────────────
-- 7. VERIFY RLS IS ENABLED (idempotent)
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
