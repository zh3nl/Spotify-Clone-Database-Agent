
-- 🎵 AUTO-POPULATED DATA FROM REACT COMPONENTS
-- Source: src/components/spotify-main-content.tsx
-- Array: recentlyPlayed
-- Records: 6
-- Transformed for table: recently_played

-- Idempotent SQL for table: recently_played
-- Description: Create 'recently_played' table in Supabase with automatic data population from recentlyPlayed array (6 records)

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create table: recently_played
CREATE TABLE IF NOT EXISTS public.recently_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for recently_played
CREATE INDEX IF NOT EXISTS idx_recently_played_created_at ON public.recently_played(created_at);
CREATE INDEX IF NOT EXISTS idx_recently_played_updated_at ON public.recently_played(updated_at);

-- Enable Row Level Security for recently_played
ALTER TABLE public.recently_played ENABLE ROW LEVEL SECURITY;

-- Create general RLS policies for recently_played (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recently_played' AND policyname = 'recently_played_read_authenticated') THEN
    CREATE POLICY "recently_played_read_authenticated" ON public.recently_played
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recently_played' AND policyname = 'recently_played_insert_authenticated') THEN
    CREATE POLICY "recently_played_insert_authenticated" ON public.recently_played
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Create or replace function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recently_played
DROP TRIGGER IF EXISTS update_recently_played_updated_at ON public.recently_played;
CREATE TRIGGER update_recently_played_updated_at
  BEFORE UPDATE ON public.recently_played
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



-- 🎵 Idempotent seed data insertion for recently_played
-- Records: 6

-- Function to safely insert seed data
CREATE OR REPLACE FUNCTION insert_seed_data_recently_played()
RETURNS void AS $$
BEGIN
  -- Only insert if table is empty or specific records don't exist
  -- Insert record 1
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '1', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Liked Songs', '320 songs', 'Your Music', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', 180
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '1'
  );

  -- Insert record 2
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '2', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Discover Weekly', 'Spotify', 'Weekly Mix', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', 210
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '2'
  );

  -- Insert record 3
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '3', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Release Radar', 'Spotify', 'New Releases', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', 195
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '3'
  );

  -- Insert record 4
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '4', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Daily Mix 1', 'Spotify', 'Daily Mix', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', 225
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '4'
  );

  -- Insert record 5
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '5', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Chill Hits', 'Spotify', 'Chill Collection', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', 240
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '5'
  );

  -- Insert record 6
  INSERT INTO public.recently_played (id, created_at, updated_at, title, artist, album, image, duration)
  SELECT '6', '2025-07-18T00:33:50.536Z', '2025-07-18T00:33:50.536Z', 'Top 50 - Global', 'Spotify', 'Global Charts', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', 205
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recently_played
    WHERE id = '6'
  );

END;
$$ LANGUAGE plpgsql;

-- Execute the seed data insertion
SELECT insert_seed_data_recently_played();

-- Clean up the function
DROP FUNCTION IF EXISTS insert_seed_data_recently_played();

