-- Schema Fix for recently_played table ID mismatch
-- Generated: 2025-07-20T20:30:00.000Z
-- This script adds track_id column to separate business logic from database primary key

-- Add track_id column to existing recently_played table
ALTER TABLE recently_played 
ADD COLUMN IF NOT EXISTS track_id TEXT;

-- Create index on track_id for performance
CREATE INDEX IF NOT EXISTS idx_recently_played_track_id ON recently_played (track_id);

-- Create unique constraint on track_id and user_id combination to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_recently_played_user_track_unique 
ON recently_played (user_id, track_id);

-- Script completed - track_id column added for proper ID semantics