-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create recently_played table
CREATE TABLE IF NOT EXISTS public.recently_played (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL,
    album_art TEXT NOT NULL,
    duration INTEGER NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_recently_played_user_id ON public.recently_played(user_id);
CREATE INDEX idx_recently_played_played_at ON public.recently_played(played_at);
CREATE INDEX idx_recently_played_track_id ON public.recently_played(track_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.recently_played
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.recently_played ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view their own recently played tracks
CREATE POLICY "Users can view their own recently played tracks"
ON public.recently_played
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own recently played tracks
CREATE POLICY "Users can insert their own recently played tracks"
ON public.recently_played
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own recently played tracks
CREATE POLICY "Users can update their own recently played tracks"
ON public.recently_played
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own recently played tracks
CREATE POLICY "Users can delete their own recently played tracks"
ON public.recently_played
FOR DELETE
USING (auth.uid() = user_id);

-- Sample seed data (will only work if these user IDs exist in your auth.users table)
-- Replace these UUIDs with actual user IDs from your system
INSERT INTO public.recently_played (user_id, track_id, title, artist, album, album_art, duration, played_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'track1', 'Bohemian Rhapsody', 'Queen', 'A Night at the Opera', 'https://example.com/album1.jpg', 354, now() - interval '1 hour'),
    ('00000000-0000-0000-0000-000000000001', 'track2', 'Hotel California', 'Eagles', 'Hotel California', 'https://example.com/album2.jpg', 391, now() - interval '2 hours'),
    ('00000000-0000-0000-0000-000000000002', 'track3', 'Stairway to Heaven', 'Led Zeppelin', 'Led Zeppelin IV', 'https://example.com/album3.jpg', 482, now() - interval '30 minutes'),
    ('00000000-0000-0000-0000-000000000002', 'track4', 'Imagine', 'John Lennon', 'Imagine', 'https://example.com/album4.jpg', 183, now() - interval '1 day'),
    ('00000000-0000-0000-0000-000000000001', 'track5', 'Billie Jean', 'Michael Jackson', 'Thriller', 'https://example.com/album5.jpg', 294, now() - interval '3 hours');

-- Comment: This table stores a user's recently played tracks with timestamps
-- The RLS policies ensure users can only access their own play history
-- Indexes are added for common query patterns (by user, by time, by track)