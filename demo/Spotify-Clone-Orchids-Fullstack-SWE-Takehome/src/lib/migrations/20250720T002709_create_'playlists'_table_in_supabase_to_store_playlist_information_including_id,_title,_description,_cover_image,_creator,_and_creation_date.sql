-- =====================================================
-- IDEMPOTENT MIGRATION: playlists
-- Description: Create 'playlists' table in Supabase to store playlist information including id, title, description, cover image, creator, and creation date
-- Generated: 2025-07-20T00:27:09.261Z
-- Safe to run multiple times
-- =====================================================

-- Create table playlists (idempotent)
CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    playlist_type TEXT NOT NULL DEFAULT 'personalized',
    user_id TEXT DEFAULT 'default-user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index idx_playlists_created_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists (created_at);
-- Create index idx_playlists_updated_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_playlists_updated_at ON playlists (updated_at);

-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger playlists_updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'playlists_updated_at'
    ) THEN
        CREATE TRIGGER playlists_updated_at
            BEFORE UPDATE ON playlists
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS on playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Create RLS policy playlists_select_policy (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'playlists' 
        AND policyname = 'playlists_select_policy'
    ) THEN
        CREATE POLICY playlists_select_policy ON playlists
        FOR SELECT USING (true);
    END IF;
END $$;

-- Migration for playlists completed
-- All operations are idempotent and safe to rerun