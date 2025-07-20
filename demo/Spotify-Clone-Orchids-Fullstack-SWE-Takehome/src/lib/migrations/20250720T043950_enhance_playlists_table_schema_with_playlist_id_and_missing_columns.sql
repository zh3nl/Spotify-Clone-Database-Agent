-- =====================================================
-- IDEMPOTENT MIGRATION: Enhance playlists table schema
-- Description: Add playlist_id unique identifier and missing columns to match albums implementation
-- Generated: 2025-07-20T04:39:50.000Z
-- Safe to run multiple times
-- =====================================================

-- Add playlist_id column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playlists' 
        AND column_name = 'playlist_id'
    ) THEN
        ALTER TABLE playlists ADD COLUMN playlist_id TEXT NOT NULL UNIQUE;
    END IF;
END $$;

-- Add genre column for playlist categorization (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playlists' 
        AND column_name = 'genre'
    ) THEN
        ALTER TABLE playlists ADD COLUMN genre TEXT;
    END IF;
END $$;

-- Rename 'type' to 'playlist_type' for consistency (idempotent)
DO $$
BEGIN
    -- Check if 'type' column exists and 'playlist_type' doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playlists' 
        AND column_name = 'type'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playlists' 
        AND column_name = 'playlist_type'
    ) THEN
        ALTER TABLE playlists RENAME COLUMN type TO playlist_type;
    END IF;
END $$;

-- Create index on playlist_id (idempotent)
CREATE INDEX IF NOT EXISTS idx_playlists_playlist_id ON playlists (playlist_id);

-- Create index on playlist_type (idempotent) 
CREATE INDEX IF NOT EXISTS idx_playlists_playlist_type ON playlists (playlist_type);

-- Create index on genre (idempotent)
CREATE INDEX IF NOT EXISTS idx_playlists_genre ON playlists (genre);

-- Add comment to table
COMMENT ON TABLE playlists IS 'Enhanced playlists table with unique playlist_id and comprehensive schema matching albums implementation';

-- Migration for playlists schema enhancement completed
-- All operations are idempotent and safe to rerun