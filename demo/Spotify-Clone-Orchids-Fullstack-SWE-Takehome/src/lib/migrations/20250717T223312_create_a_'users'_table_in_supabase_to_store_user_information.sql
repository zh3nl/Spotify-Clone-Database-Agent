-- Idempotent Migration: a
-- Generated at: 2025-07-17T22:33:12.347Z
-- This migration can be run multiple times safely

/*
 * Migration: Create 'a' table with UUID primary key and timestamps
 * 
 * Description:
 * This migration creates a new table 'a' with UUID primary key and timestamp tracking.
 * All operations are idempotent and will not fail if executed multiple times.
 * 
 * Table Structure:
 * - id: UUID primary key with auto-generation
 * - created_at: Timestamp with timezone, defaults to current time
 * - updated_at: Timestamp with timezone, defaults to current time and updates automatically
 *
 * Created: 2023-11-15
 */

BEGIN;

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS a (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE a IS 'Table for storing a records with automatic timestamps';

-- Create function for updating the updated_at timestamp
-- This is idempotent as we drop the function first if it exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'set_updated_at_timestamp'
    ) THEN
        CREATE FUNCTION set_updated_at_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END
$$;

-- Create trigger for automatically updating the updated_at column
-- This is idempotent as we check if the trigger exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_set_updated_at_timestamp_on_a'
    ) THEN
        CREATE TRIGGER trigger_set_updated_at_timestamp_on_a
        BEFORE UPDATE ON a
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at_timestamp();
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE a ENABLE ROW LEVEL SECURITY;

-- Create a default policy that allows users to see only their own records
-- This is idempotent as we check if the policy exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'a' AND policyname = 'a_policy_select'
    ) THEN
        CREATE POLICY a_policy_select ON a
            FOR SELECT
            USING (auth.uid() = id);
    END IF;
END
$$;

-- Create policy for inserting records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'a' AND policyname = 'a_policy_insert'
    ) THEN
        CREATE POLICY a_policy_insert ON a
            FOR INSERT
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

-- Create policy for updating records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'a' AND policyname = 'a_policy_update'
    ) THEN
        CREATE POLICY a_policy_update ON a
            FOR UPDATE
            USING (auth.uid() = id);
    END IF;
END
$$;

-- Create policy for deleting records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'a' AND policyname = 'a_policy_delete'
    ) THEN
        CREATE POLICY a_policy_delete ON a
            FOR DELETE
            USING (auth.uid() = id);
    END IF;
END
$$;

-- Add error handling
DO $$
BEGIN
    RAISE NOTICE 'Table "a" migration completed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in "a" table migration: %', SQLERRM;
END
$$;

COMMIT;