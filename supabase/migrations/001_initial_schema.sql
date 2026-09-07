-- 1. Create tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id)
);

CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  poster_path TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id)
);

-- Index for fast history querying
CREATE INDEX watch_history_user_id_watched_at_idx ON watch_history(user_id, watched_at DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Profiles
CREATE POLICY "Users can view their own profile." 
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. RLS Policies for Watchlist
CREATE POLICY "Users can view their own watchlist." 
  ON watchlist FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist." 
  ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist." 
  ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS Policies for Watch History
CREATE POLICY "Users can view their own watch history." 
  ON watch_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watch history." 
  ON watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history." 
  ON watch_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watch history." 
  ON watch_history FOR DELETE USING (auth.uid() = user_id);

-- 6. Trigger for Automatic Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  name_val TEXT;
  avatar_val TEXT;
BEGIN
  -- Safely try to extract name and avatar from Google OAuth metadata
  name_val := new.raw_user_meta_data->>'full_name';
  IF name_val IS NULL THEN
    name_val := new.raw_user_meta_data->>'name';
  END IF;

  avatar_val := new.raw_user_meta_data->>'avatar_url';
  IF avatar_val IS NULL THEN
    avatar_val := new.raw_user_meta_data->>'picture';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (new.id, name_val, avatar_val);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
