-- Idempotent Migration: a
-- Generated at: 2025-07-17T22:32:58.783Z
-- This migration can be run multiple times safely

/*
 * Migration: Create recently_played table
 * 
 * This migration creates a 'recently_played' table to store user's recently played tracks.
 * The table includes relationships to users and stores track information.
 * 
 * Features:
 * - UUID primary key with automatic generation
 * - Automatic timestamps for created_at and updated_at
 * - Foreign key relationship to auth.users
 * - Indexes for efficient querying
 * - Row Level Security (RLS) to ensure users can only access their own data
 * 
 * All operations are idempotent and can be safely re-run.
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the recently_played table if it doesn't exist
CREATE TABLE IF NOT EXISTS recently_played (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    played_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

-- Add table comment
COMMENT ON TABLE recently_played IS 'Stores information about tracks recently played by users';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON recently_played(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at);
CREATE INDEX IF NOT EXISTS idx_recently_played_track_id ON recently_played(track_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatically updating the updated_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_recently_played_updated_at'
    ) THEN
        CREATE TRIGGER set_recently_played_updated_at
        BEFORE UPDATE ON recently_played
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recently_played' AND policyname = 'recently_played_select_policy'
    ) THEN
        CREATE POLICY recently_played_select_policy ON recently_played
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recently_played' AND policyname = 'recently_played_insert_policy'
    ) THEN
        CREATE POLICY recently_played_insert_policy ON recently_played
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recently_played' AND policyname = 'recently_played_update_policy'
    ) THEN
        CREATE POLICY recently_played_update_policy ON recently_played
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recently_played' AND policyname = 'recently_played_delete_policy'
    ) THEN
        CREATE POLICY recently_played_delete_policy ON recently_played
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create a function to limit the number of recently played tracks per user
CREATE OR REPLACE FUNCTION limit_recently_played_tracks()
RETURNS TRIGGER AS $$
DECLARE
    max_tracks_per_user INTEGER := 50; -- Maximum number of tracks to keep per user
BEGIN
    -- Delete oldest tracks beyond the limit
    DELETE FROM recently_played
    WHERE id IN (
        SELECT id FROM recently_played
        WHERE user_id = NEW.user_id
        ORDER BY played_at DESC NULLS LAST
        OFFSET max_tracks_per_user
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to limit the number of recently played tracks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'limit_recently_played_tracks_trigger'
    ) THEN
        CREATE TRIGGER limit_recently_played_tracks_trigger
        AFTER INSERT ON recently_played
        FOR EACH ROW
        EXECUTE FUNCTION limit_recently_played_tracks();
    END IF;
END
$$;