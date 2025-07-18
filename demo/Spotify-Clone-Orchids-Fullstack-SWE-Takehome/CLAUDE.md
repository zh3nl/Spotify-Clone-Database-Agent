# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Commands
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Setup project (install dependencies and run examples)
npm run setup
```

### Database Agent CLI Commands
```bash
# Start interactive mode for database queries
npm run db-agent:interactive

# Execute a direct query
npm run db-agent query "Can you store the recently played songs in a table"

# Check project status and configuration
npm run db-agent:status

# View example queries
npm run db-agent:examples

# Migration management
npm run db-agent:migrations:status
npm run db-agent:migrations:run
npm run db-agent:migrations:rollback
npm run db-agent:migrations:debug <filename>
```

## Architecture Overview

### High-Level Structure
This is a **Spotify Clone with AI-Powered Database Agent** built on:
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and Radix UI components
- **Backend**: Supabase (PostgreSQL) with real-time capabilities
- **AI Agent**: Multi-provider CLI tool (OpenAI, Anthropic, Gemini) for automated database feature implementation

### Key Architectural Components

#### 1. Database Agent CLI System (`cli/`)
- **Entry Point**: `cli/index.ts` - Commander.js-based CLI with interactive and direct query modes
- **Core Agents**:
  - `DatabaseAgent` - Main orchestrator for query execution and operation management
  - `ProjectAnalyzer` - Analyzes codebase structure, components, and existing database features
  - `CodeGenerator` - Generates SQL migrations, API routes, and React component updates
- **Utilities**:
  - `IdempotentSQLGenerator` - Creates safe, rerunnable SQL migrations
  - `MigrationExecutor` - Handles database migration execution and rollback
  - `StateAnalyzer` - Tracks system state and implemented features
  - `AIClient` - Multi-provider AI integration (OpenAI, Anthropic, Gemini)

#### 2. Frontend Architecture (`src/`)
- **Next.js App Router**: Modern app directory structure with TypeScript
- **Main Components**:
  - `spotify-main-content.tsx` - Primary content area with database-backed sections
  - `spotify-sidebar.tsx` - Navigation and playlist management
  - `spotify-player.tsx` - Music player controls and track management
  - `spotify-header.tsx` - Top navigation and search
- **Database Integration**: Components fetch from API routes, with loading states and error handling

#### 3. Database Layer
- **Supabase Client**: `src/lib/supabase.ts` with typed database schema
- **API Routes**: Next.js API routes in `src/app/api/` for database operations
- **Database Schema**: Pre-defined tables for `recently_played`, `made_for_you`, `popular_albums`
- **Migration System**: SQL files in `src/lib/migrations/` with idempotent operations

#### 4. AI Agent Workflow
1. **Query Analysis**: Parses natural language requests and creates execution plans
2. **Feature Detection**: Identifies existing implementations to avoid duplication
3. **Code Generation**: Creates SQL migrations, API endpoints, and component updates
4. **Execution**: Runs migrations and updates code files with rollback support
5. **State Tracking**: Maintains history and current system state

### Component Integration Pattern
The system follows a **"Hardcoded to Database"** migration pattern:
- Components initially use hardcoded data arrays
- Database agent extracts this data as seed data when creating tables
- Components are automatically updated to use database APIs
- Original UI/UX is preserved during the transition

### Database Schema Management
- **Idempotent Migrations**: All SQL operations are safe to rerun
- **State Tracking**: Agent tracks executed migrations and implemented features
- **Rollback Support**: Automatic rollback on failures
- **Multi-Environment**: Works with local development and production Supabase instances

## Important Implementation Details

### Environment Configuration
Required environment variables in `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Provider (at least one required)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key

# Optional Configuration
DB_AGENT_DEFAULT_PROVIDER=anthropic
DB_AGENT_LOG_LEVEL=info
```

### Database Agent Usage Patterns
- **Interactive Mode**: Best for exploratory queries and step-by-step implementation
- **Direct Query Mode**: Efficient for specific, well-defined database features
- **Feature Detection**: Agent automatically detects and reports existing implementations
- **Seed Data Extraction**: Agent extracts hardcoded arrays from components for initial table population

### Component Update Strategy
When updating components for database integration:
- Preserve exact UI/UX appearance and behavior
- Add proper loading states and error handling
- Maintain responsive design patterns
- Use TypeScript interfaces for type safety
- Follow existing component patterns and styling

### Migration Best Practices
- All migrations are idempotent (safe to rerun)
- Include proper indexes for performance
- Add RLS policies for security
- Include rollback operations where possible
- Test migrations in development first

## Common Development Workflows

### Adding New Database Features
1. Use `npm run db-agent:interactive`
2. Describe the feature in natural language
3. Review the generated execution plan
4. Agent handles schema creation, API generation, and component updates
5. Run migrations in Supabase dashboard or via CLI

### Checking System State
1. `npm run db-agent:status` - View current configuration and feature status
2. `npm run db-agent:migrations:status` - Check migration history
3. Review `.db-agent-history.json` for operation history

### Debugging and Troubleshooting
1. Check logs for detailed error messages
2. Use `npm run db-agent:migrations:debug <filename>` for SQL parsing issues
3. Verify Supabase connection and environment variables
4. Review generated files before running migrations

This architecture enables rapid prototyping of database-backed features while maintaining code quality and type safety throughout the development process.

## Best Practices

### Code Comments
- Use comments sparingly. Only comment complex code.