-- Database Schema Creation Script
-- This creates the required tables for the Spotify Clone application
-- Execute this in Supabase SQL Editor before running the population script

-- Create recently_played table
CREATE TABLE IF NOT EXISTS recently_played (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  image_url TEXT,
  duration INTEGER NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT DEFAULT 'default-user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create made_for_you table
CREATE TABLE IF NOT EXISTS made_for_you (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  playlist_type TEXT NOT NULL DEFAULT 'personalized',
  user_id TEXT DEFAULT 'default-user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create popular_albums table
CREATE TABLE IF NOT EXISTS popular_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  image_url TEXT,
  release_date DATE,
  duration INTEGER NOT NULL,
  popularity_score INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON recently_played(user_id);

CREATE INDEX IF NOT EXISTS idx_made_for_you_user_id ON made_for_you(user_id);
CREATE INDEX IF NOT EXISTS idx_made_for_you_playlist_type ON made_for_you(playlist_type);
CREATE INDEX IF NOT EXISTS idx_made_for_you_created_at ON made_for_you(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_popular_albums_popularity_score ON popular_albums(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popular_albums_artist ON popular_albums(artist);
CREATE INDEX IF NOT EXISTS idx_popular_albums_release_date ON popular_albums(release_date DESC);

-- Enable Row Level Security (RLS) but allow all operations for demo purposes
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE made_for_you ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_albums ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for demo - in production, you'd want more restrictive policies)
CREATE POLICY IF NOT EXISTS "Allow all operations on recently_played" ON recently_played FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on made_for_you" ON made_for_you FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on popular_albums" ON popular_albums FOR ALL USING (true);

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('recently_played', 'made_for_you', 'popular_albums')
ORDER BY tablename;