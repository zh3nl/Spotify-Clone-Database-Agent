-- =====================================================
-- IDEMPOTENT MIGRATION: albums
-- Description: Create 'albums' table to store popular albums data
-- Generated: 2025-07-19T23:42:30.290Z
-- Safe to run multiple times
-- =====================================================

-- Create table albums (idempotent)
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    image_url TEXT,
    duration INTEGER NOT NULL,
    release_date DATE,
    popularity_score INTEGER DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index idx_albums_created_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums (created_at);
-- Create index idx_albums_updated_at (idempotent)
CREATE INDEX IF NOT EXISTS idx_albums_updated_at ON albums (updated_at);

-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger albums_updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'albums_updated_at'
    ) THEN
        CREATE TRIGGER albums_updated_at
            BEFORE UPDATE ON albums
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS on albums
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Create RLS policy albums_select_policy (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'albums' 
        AND policyname = 'albums_select_policy'
    ) THEN
        CREATE POLICY albums_select_policy ON albums
        FOR SELECT USING (true);
    END IF;
END $$;

-- Migration for albums completed
-- All operations are idempotent and safe to rerun