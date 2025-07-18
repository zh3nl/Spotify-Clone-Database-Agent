-- =====================================================
-- IDEMPOTENT MIGRATION: tracks
-- Description: Create a 'tracks' table in Supabase to store track information
-- Generated: 2025-07-18T22:45:56.179Z
-- Safe to run multiple times
-- =====================================================

-- Create table tracks (idempotent)
CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index idx_tracks_created_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks (created_at);
-- Create index idx_tracks_updated_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_tracks_updated_at ON tracks (updated_at);

-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger tracks_updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'tracks_updated_at'
    ) THEN
        CREATE TRIGGER tracks_updated_at
            BEFORE UPDATE ON tracks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS on tracks
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy tracks_select_policy (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tracks' 
        AND policyname = 'tracks_select_policy'
    ) THEN
        CREATE POLICY tracks_select_policy ON tracks
        FOR SELECT USING (true);
    END IF;
END $$;

-- Migration for tracks completed
-- All operations are idempotent and safe to rerun