# 🗄️ Database Migration Execution System

The Database Agent now includes **automatic migration execution** capabilities! This guide will help you set up and use the enhanced migration system.

## ✨ What's New in Phase 1.1

- **Automatic Migration Execution**: No more manual SQL copying - migrations run automatically
- **Database Connection Validation**: Verifies Supabase connection before operations
- **Migration Rollback Support**: Safe rollback of executed migrations
- **Schema Synchronization**: Verifies database state after migrations
- **Migration Tracking**: Tracks executed migrations to prevent duplicates
- **Real-time Progress Display**: Live feedback during migration execution

## 🚀 Quick Setup

### 1. Install Supabase Functions (One-time setup)

Run the following SQL in your **Supabase SQL Editor**:

```bash
# Copy and paste the contents of this file into your Supabase SQL Editor:
cat cli/utils/supabase-functions.sql
```

This creates the necessary functions for automatic migration execution.

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Required for full automation (recommended)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Provider (choose one)
ANTHROPIC_API_KEY=your-anthropic-key
# OR
OPENAI_API_KEY=your-openai-key
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for automatic table creation and migration execution.

## 📋 Migration Commands

### Check Migration Status
```bash
npm run db-agent:migrations
# or
npm run db-agent migrations status
```

Shows:
- ✅ Executed migrations with timestamps
- ⏳ Pending migrations waiting to run
- 🔧 Setup requirements if not configured

### Execute Pending Migrations
```bash
npm run db-agent:migrations:run
# or 
npm run db-agent migrations run
```

Automatically:
- Executes all pending migration files
- Verifies tables were created successfully
- Updates migration tracking
- Provides detailed progress feedback

### Rollback a Migration
```bash
npm run db-agent:migrations:rollback filename.sql
# or
npm run db-agent migrations rollback 20240125_create_recently_played.sql
```

Safely rolls back a specific migration using stored rollback SQL.

### Enhanced Status Command
```bash
npm run db-agent:status
```

Now shows migration system status along with project information.

## 🔄 Complete Workflow Example

### 1. Generate and Execute Database Features

```bash
# Start interactive mode
npm run db-agent:interactive

# Enter your query (example):
> Can you store the recently played songs in a table

# The agent will:
# ✓ Generate migration file (src/lib/migrations/20240125_create_recently_played.sql)
# ✓ Execute migration automatically 
# ✓ Create API endpoints
# ✓ Update React components
# ✓ Verify database schema
```

### 2. Check What Happened

```bash
# View migration status
npm run db-agent:migrations

# Check overall status
npm run db-agent:status
```

### 3. If Something Goes Wrong

```bash
# Rollback the last migration
npm run db-agent migrations rollback 20240125_create_recently_played.sql

# Check status again
npm run db-agent:migrations
```

## 📁 Migration File Structure

Migrations are stored in:
- `src/lib/migrations/` (preferred)
- `supabase/migrations/`
- `migrations/`

Migration files follow the format:
```
20240125123456_description_of_change.sql
```

## 🛠️ Advanced Features

### Schema Verification
After each migration, the system:
- Verifies all expected tables exist
- Checks for missing or extra tables
- Reports any schema inconsistencies

### Migration Tracking
All executed migrations are tracked in the `_db_agent_migrations` table:
- Execution timestamps
- Rollback SQL (for safe rollbacks)
- Checksums for integrity verification

### Error Recovery
If migration execution fails:
- Automatic fallback to manual setup script
- Detailed error reporting
- File rollback capabilities
- Safe retry mechanisms

## 🚨 Troubleshooting

### Migration Executor Not Working?

1. **Check Environment Variables**:
   ```bash
   npm run db-agent:status
   ```

2. **Install Supabase Functions**:
   - Copy `cli/utils/supabase-functions.sql`
   - Paste in Supabase SQL Editor
   - Click "Run"

3. **Verify Service Role Key**:
   - Get it from Supabase Dashboard → Settings → API
   - Add as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

4. **Check Permissions**:
   - Ensure your Supabase project allows function creation
   - Verify RLS policies don't block the operation

### Common Error Messages

**"Migration executor not initialized"**
- Run the Supabase functions setup SQL
- Check your environment variables

**"Invalid Supabase credentials"**
- Verify your SUPABASE_URL and API keys
- Check if your Supabase project is active

**"RPC exec_sql not available"**
- The Supabase functions haven't been installed
- Run `cli/utils/supabase-functions.sql` in your dashboard

**"Some operations may be restricted"**
- You're using the anon key instead of service role key
- Set `SUPABASE_SERVICE_ROLE_KEY` for full functionality

## 💡 Pro Tips

### 1. Always Check Status First
```bash
npm run db-agent:status
```
This shows migration readiness and any setup issues.

### 2. Review Generated Migrations
Before they execute, check the generated SQL in `src/lib/migrations/`

### 3. Use Rollbacks Safely
Only rollback if you're sure about the impact. Check what tables/data might be affected.

### 4. Keep Backups
While the system is robust, always backup your database before major changes.

### 5. Monitor Logs
Watch the detailed output during migration execution for any warnings.

## 🎯 What's Next?

The migration execution system is the foundation for upcoming features:
- **Phase 1.2**: Real-time Progress Display
- **Phase 1.3**: Frontend Integration Validation  
- **Phase 2**: Enhanced Agent Capabilities

## 🆘 Getting Help

If you encounter issues:

1. Check this guide first
2. Run `npm run db-agent:status` for diagnostics
3. Review the generated `database-setup-manual.sql` file
4. Check Supabase dashboard logs
5. Verify your environment configuration

The system is designed to be robust and provide clear feedback at each step! 