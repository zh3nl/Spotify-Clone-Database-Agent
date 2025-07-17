-- Idempotent Migration: a
-- Generated at: 2025-07-17T22:33:22.138Z
-- This migration can be run multiple times safely

/*
 * Migration: Create 'a' table with UUID primary key and timestamps
 * 
 * This migration creates a new table 'a' with:
 * - UUID primary key with auto-generation
 * - created_at timestamp that defaults to current time
 * - updated_at timestamp that updates automatically via trigger
 * 
 * All operations are idempotent and will not fail if executed multiple times.
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS "a" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "a" IS 'Table to store a records';

-- Create function for updating the updated_at timestamp
-- Using CREATE OR REPLACE to ensure idempotency
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatically updating the updated_at column
-- First, check if the trigger already exists to ensure idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_updated_at' 
        AND tgrelid = 'a'::regclass
    ) THEN
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON "a"
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist yet, which shouldn't happen due to CREATE TABLE IF NOT EXISTS
        -- but we handle it gracefully anyway
        RAISE NOTICE 'Table "a" does not exist yet, skipping trigger creation';
END;
$$;

-- Enable Row Level Security
ALTER TABLE "a" ENABLE ROW LEVEL SECURITY;

-- Create a default policy that allows users to see only their own records
-- Using a DO block to ensure idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'a' 
        AND policyname = 'a_policy'
    ) THEN
        CREATE POLICY a_policy ON "a"
        USING (auth.uid() = id);
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "a" does not exist yet, skipping policy creation';
END;
$$;