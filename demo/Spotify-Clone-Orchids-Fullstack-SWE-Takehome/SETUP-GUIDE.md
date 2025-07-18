# 🚀 Database Agent Setup Guide

This guide will help you set up the Spotify Clone Database Agent with Anthropic AI and Supabase.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account
- An Anthropic API key
- Basic knowledge of React and TypeScript

## 🔧 Step-by-Step Setup

### 1. Install Dependencies

```bash
cd Spotify-Clone-Orchids-Fullstack-SWE-Takehome
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "New project"
   - Choose your organization
   - Enter project details
   - Wait for the project to be created

2. **Get Your Supabase Credentials**:
   - Go to your project dashboard
   - Navigate to Settings → API
   - Copy your Project URL and anon public key

### 3. Set Up Anthropic AI

1. **Create an Anthropic Account**:
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Sign up or log in
   - Navigate to API Keys section

2. **Create API Key**:
   - Click "Create Key"
   - Give it a name (e.g., "Spotify Clone Agent")
   - Copy the API key immediately (you won't see it again)

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Anthropic AI Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Database Agent Configuration
DB_AGENT_DEFAULT_PROVIDER=anthropic
DB_AGENT_LOG_LEVEL=info
```

**Important**: Replace the placeholder values with your actual credentials.

### 5. Verify Setup

Test your configuration:

```bash
npm run db-agent:status
```

You should see:
- ✅ Project Status with component counts
- ✅ Supabase: Configured (if set up correctly)
- ✅ AI Provider: Anthropic (if API key is valid)

## 🧪 Testing the CLI Tool

### 1. View Available Commands

```bash
npm run db-agent:examples
```

### 2. Test Interactive Mode

```bash
npm run db-agent:interactive
```

Try these example queries:
- `"Can you store the recently played songs in a table"`
- `"Can you store the 'Made for you' and 'Popular albums' in a table"`

### 3. Test Direct Query Mode

```bash
npm run db-agent query "Can you store the recently played songs in a table"
```

## 📊 What the Agent Does

When you run a query, the agent will:

1. **Analyze Your Project**: 
   - Scans your React components
   - Identifies hardcoded data
   - Analyzes existing data structures

2. **Create Execution Plan**:
   - Determines what tables to create
   - Plans API endpoints
   - Identifies components to update

3. **Generate Code**:
   - Creates SQL migration files
   - Generates Next.js API routes
   - Updates React components to use database
   - Creates TypeScript types

4. **File Operations**:
   - Creates new files as needed
   - Updates existing files
   - Maintains backup for rollback

## 🗂️ Generated File Structure

After running queries, you'll see new files like:

```
src/
├── lib/
│   ├── supabase.ts (✅ Already created)
│   ├── migrations/
│   │   └── 20240101000000_create_recently_played.sql
│   └── types/
│       └── database.ts
├── app/
│   └── api/
│       ├── recently-played/
│       │   └── route.ts
│       ├── made-for-you/
│       │   └── route.ts
│       └── popular-albums/
│           └── route.ts
├── hooks/
│   └── database.ts
└── components/
    └── (updated existing components)
```

## 🛠️ Running Database Migrations

After the agent creates migration files:

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration SQL
4. Run the migration

### Option 2: Supabase CLI (Advanced)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## 🔍 Troubleshooting

### Common Issues

1. **"No AI provider configured"**
   - Check your `.env.local` file
   - Ensure `ANTHROPIC_API_KEY` is set correctly
   - Verify the API key is valid

2. **"Supabase connection failed"**
   - Verify your Supabase URL and anon key
   - Check if your Supabase project is active
   - Ensure the credentials are in `.env.local`

3. **"Permission denied" errors**
   - Ensure the CLI has write permissions
   - Run from the project root directory

4. **TypeScript compilation errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that all imports are correct

### Getting Help

1. **Check Status**:
   ```bash
   npm run db-agent:status
   ```

2. **View Logs**:
   The agent provides detailed logs during execution

3. **Rollback Changes**:
   If something goes wrong, the agent automatically attempts to rollback changes

## 🎯 Example Workflow

Here's a complete example of using the agent:

```bash
# 1. Check everything is set up correctly
npm run db-agent:status

# 2. Start interactive mode
npm run db-agent:interactive

# 3. When prompted, enter your query:
# "Can you store the recently played songs in a table"

# 4. The agent will:
#    - Analyze your project
#    - Create execution plan
#    - Generate migration files
#    - Create API endpoints
#    - Update React components

# 5. Run the migration in Supabase
#    - Copy the SQL from src/lib/migrations/
#    - Paste into Supabase SQL Editor
#    - Execute the migration

# 6. Test your app
npm run dev
```

## 🔄 Next Steps

After successful setup:

1. **Try the Example Queries**: Test both provided example queries
2. **Create Custom Queries**: Try your own database feature requests
3. **Integrate with Your App**: Use the generated API endpoints in your components
4. **Extend Functionality**: Add more complex database operations

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the generated logs for error details
3. Ensure all environment variables are set correctly
4. Try running `npm run db-agent:status` to diagnose configuration issues

Happy coding! 🚀 