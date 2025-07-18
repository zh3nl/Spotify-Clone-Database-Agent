# 🔧 Migration Execution Troubleshooting Guide

This guide helps you diagnose and fix migration execution issues, particularly SQL parsing problems.

## 🚨 Common Issue: "relation does not exist" Error

**Error Example:**
```
Migration failed: SQL execution failed: relation "public.recently_played" does not exist
Statement: CREATE INDEX idx_recently_played_played_at ON public.recently_played(played_at)
```

### Root Cause
This error occurs when the migration system tries to create an index on a table that hasn't been created yet. The issue is typically caused by:

1. **Incorrect SQL Parsing**: The simple semicolon-based SQL parser breaks complex PostgreSQL statements
2. **Statement Execution Order**: Index creation statements execute before table creation
3. **Multi-line SQL Handling**: Complex SQL with functions, triggers, and policies isn't parsed correctly

### Solution Implemented

We've implemented a **PostgreSQL-aware SQL parser** that properly handles:
- ✅ Multi-line SQL statements
- ✅ Function definitions with `$$` delimiters
- ✅ Complex PostgreSQL syntax (policies, triggers, extensions)
- ✅ Proper statement ordering
- ✅ Comment handling
- ✅ String literal parsing

## 🔍 Debugging Migration Issues

### Step 1: Check Migration Status
```bash
npm run db-agent:status
```

Look for:
- Supabase configuration status
- Migration system health
- Pending migrations

### Step 2: Debug Migration Parsing
```bash
npm run db-agent:migrations:debug filename.sql
```

This will show:
- 📄 File information
- 📊 Parsing results
- 📋 Individual statements
- 🔄 Generated rollback SQL

**Example Output:**
```
🔍 Debugging migration: 20250717T214630_create_recently_played.sql

📄 Migration file: src/lib/migrations/20250717T214630_create_recently_played.sql
📊 File size: 3421 characters

✅ Parsing Results:
- Statements parsed: 12
- Tables to create: recently_played
- Rollback SQL generated: Yes

📋 Parsed Statements:
1. CREATE EXTENSION IF NOT EXISTS "pgcrypto"
2. CREATE TABLE IF NOT EXISTS public.recently_played (     id UUID PRIMARY KEY...
3. CREATE INDEX idx_recently_played_user_id ON public.recently_played(user_id)
...
```

### Step 3: Check Migration Status
```bash
npm run db-agent:migrations
```

Shows:
- ✅ Executed migrations
- ⏳ Pending migrations
- 🔧 Setup requirements

### Step 4: Setup Requirements
If migration system isn't working:

1. **Install Supabase Functions:**
   ```bash
   # Copy cli/utils/supabase-functions.sql to your Supabase SQL Editor
   # Run it in your dashboard
   ```

2. **Set Environment Variables:**
   ```bash
   # In .env.local
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Important!
   ```

3. **Verify Permissions:**
   - Service role key is required for DDL operations
   - Anon key has limited permissions

## 🛠️ Manual Migration Execution

If automatic execution fails, you can run migrations manually:

### Option 1: Use Generated Fallback Script
When migrations fail, a `database-setup-manual.sql` file is created with:
- Manual setup instructions
- Migration file list
- Troubleshooting tips

### Option 2: Direct SQL Execution
1. Copy migration SQL from `src/lib/migrations/`
2. Paste into Supabase SQL Editor
3. Execute statement by statement

### Option 3: Fix and Retry
1. Fix any SQL syntax issues
2. Delete the migration from `_db_agent_migrations` table
3. Run migration again

## 📊 Understanding Migration Parsing

### Before (Broken)
```typescript
// Simple semicolon split - BROKEN
const statements = sql.split(';')
```

**Problems:**
- Breaks multi-line statements
- Doesn't handle function delimiters (`$$`)
- Ignores PostgreSQL-specific syntax
- Wrong execution order

### After (Fixed)
```typescript
// PostgreSQL-aware parser - FIXED
const statements = this.parsePostgreSQLStatements(sql)
```

**Benefits:**
- ✅ Proper multi-line handling
- ✅ Function delimiter support
- ✅ Comment processing
- ✅ Correct statement ordering
- ✅ Rollback SQL generation

## 🔄 Migration Rollback

If something goes wrong:

```bash
# Rollback specific migration
npm run db-agent migrations rollback filename.sql

# Check status
npm run db-agent:migrations
```

## 📋 Enhanced Error Handling

The system now provides:
- **Detailed SQL parsing logs**
- **Statement-by-statement execution tracking**
- **Comprehensive error messages**
- **Automatic fallback scripts**
- **Rollback capability**

## 💡 Pro Tips

### 1. Test Parsing First
```bash
npm run db-agent:migrations:debug your-migration.sql
```
Always verify parsing before execution.

### 2. Use Service Role Key
```bash
SUPABASE_SERVICE_ROLE_KEY=your-key
```
Required for DDL operations like CREATE TABLE.

### 3. Check Logs
Watch the detailed output during migration execution for any warnings.

### 4. Incremental Testing
Test migrations on a development database first.

### 5. Backup Before Major Changes
Always backup your database before running migrations.

## 🔍 Common Error Messages

### "Migration executor not initialized"
- **Cause**: Supabase functions not installed
- **Fix**: Run `cli/utils/supabase-functions.sql` in dashboard

### "RPC exec_sql not available"
- **Cause**: Functions haven't been installed
- **Fix**: Install Supabase functions

### "Some operations may be restricted"
- **Cause**: Using anon key instead of service role
- **Fix**: Set `SUPABASE_SERVICE_ROLE_KEY`

### "relation does not exist"
- **Cause**: SQL parsing issue (fixed in this version)
- **Fix**: Use the new PostgreSQL-aware parser

### "Invalid Supabase credentials"
- **Cause**: Wrong API keys
- **Fix**: Check your Supabase dashboard for correct keys

## 📞 Getting Additional Help

If issues persist:

1. **Check Status**: `npm run db-agent:status`
2. **Debug Parsing**: `npm run db-agent:migrations:debug filename.sql`
3. **Review Logs**: Look for detailed error messages
4. **Check Environment**: Verify all environment variables
5. **Test Connection**: Ensure Supabase is accessible

The enhanced migration system is designed to be robust and provide clear feedback at each step. Most issues can be resolved by following the debugging steps above. 