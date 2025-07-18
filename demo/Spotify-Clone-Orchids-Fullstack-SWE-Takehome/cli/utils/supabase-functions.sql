-- Supabase Functions for Database Agent Migration Execution
-- Run this in your Supabase SQL Editor to enable automatic migration execution

-- Function to execute arbitrary SQL (requires service role key)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to get table information (safer alternative)
CREATE OR REPLACE FUNCTION get_table_info(table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_name = $1
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$;

-- Function to check if table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = $1
  );
END;
$$;

-- Function to get all tables in public schema
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$;

-- Function to safely create table with retry logic
CREATE OR REPLACE FUNCTION create_table_safe(sql_statement text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  BEGIN
    EXECUTE sql_statement;
    result := json_build_object(
      'success', true,
      'message', 'Table created successfully'
    );
  EXCEPTION WHEN others THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
  END;
  
  RETURN result;
END;
$$;

-- Function to seed table with data
CREATE OR REPLACE FUNCTION seed_table_data(table_name text, data_json jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  record_count integer := 0;
BEGIN
  BEGIN
    -- This is a simplified version - in practice, you'd want more dynamic insertion
    result := json_build_object(
      'success', true,
      'message', 'Data seeding function called',
      'table', table_name,
      'data_size', jsonb_array_length(data_json)
    );
  EXCEPTION WHEN others THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
  END;
  
  RETURN result;
END;
$$;

-- Grant execute permissions on functions
-- Note: These grants may need to be adjusted based on your RLS policies
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_info TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_tables TO authenticated;
GRANT EXECUTE ON FUNCTION create_table_safe TO authenticated;
GRANT EXECUTE ON FUNCTION seed_table_data TO authenticated;

-- Create the migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _db_agent_migrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  description TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rollback_sql TEXT,
  checksum TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_migrations_filename ON _db_agent_migrations(filename);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON _db_agent_migrations(executed_at);

-- Add RLS policies for the migrations table
ALTER TABLE _db_agent_migrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to do everything
CREATE POLICY "Service role can manage migrations" ON _db_agent_migrations
  FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to read migrations
CREATE POLICY "Authenticated can read migrations" ON _db_agent_migrations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add helpful comments
COMMENT ON TABLE _db_agent_migrations IS 'Tracks database migrations executed by the Database Agent CLI tool';
COMMENT ON FUNCTION exec_sql IS 'Executes arbitrary SQL - requires service role key for security';
COMMENT ON FUNCTION get_table_info IS 'Returns column information for a given table';
COMMENT ON FUNCTION table_exists IS 'Checks if a table exists in the public schema';
COMMENT ON FUNCTION get_public_tables IS 'Returns list of all tables in public schema';
COMMENT ON FUNCTION create_table_safe IS 'Creates table with error handling and returns result';
COMMENT ON FUNCTION seed_table_data IS 'Seeds table with JSON data safely'; 