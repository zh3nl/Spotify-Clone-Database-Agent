-- Add missing columns to recently_played table
-- This migration adds the data columns that were missing from the initial table creation

-- Add columns to recently_played table if they don't exist
DO $$
BEGIN
  -- Add title column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'title') THEN
    ALTER TABLE public.recently_played ADD COLUMN title TEXT;
  END IF;

  -- Add artist column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'artist') THEN
    ALTER TABLE public.recently_played ADD COLUMN artist TEXT;
  END IF;

  -- Add album column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'album') THEN
    ALTER TABLE public.recently_played ADD COLUMN album TEXT;
  END IF;

  -- Add image column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'image') THEN
    ALTER TABLE public.recently_played ADD COLUMN image TEXT;
  END IF;

  -- Add duration column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'duration') THEN
    ALTER TABLE public.recently_played ADD COLUMN duration INTEGER;
  END IF;

  -- Add played_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'played_at') THEN
    ALTER TABLE public.recently_played ADD COLUMN played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add user_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recently_played' 
                 AND column_name = 'user_id') THEN
    ALTER TABLE public.recently_played ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Create additional indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_recently_played_title ON public.recently_played(title);
CREATE INDEX IF NOT EXISTS idx_recently_played_artist ON public.recently_played(artist);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON public.recently_played(played_at);
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON public.recently_played(user_id); 