-- =====================================================
-- IDEMPOTENT MIGRATION: recently_played
-- Description: Create a 'recently_played' table in Supabase to store user's recently played tracks with timestamps
-- Generated: 2025-07-18T22:45:56.170Z
-- Safe to run multiple times
-- =====================================================

-- Create table recently_played (idempotent)
CREATE TABLE IF NOT EXISTS recently_played (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER
);

-- Create index idx_recently_played_created_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_recently_played_created_at ON recently_played (created_at);
-- Create index idx_recently_played_updated_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_recently_played_updated_at ON recently_played (updated_at);

-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger recently_played_updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'recently_played_updated_at'
    ) THEN
        CREATE TRIGGER recently_played_updated_at
            BEFORE UPDATE ON recently_played
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS on recently_played
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;

-- Create RLS policy recently_played_select_policy (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'recently_played' 
        AND policyname = 'recently_played_select_policy'
    ) THEN
        CREATE POLICY recently_played_select_policy ON recently_played
        FOR SELECT USING (true);
    END IF;
END $$;

-- Migration for recently_played completed
-- All operations are idempotent and safe to rerun