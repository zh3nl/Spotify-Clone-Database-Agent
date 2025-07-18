# Spotify Clone with AI Database Agent

A modern Spotify clone built with Next.js 15, TypeScript, and Supabase, featuring an innovative AI-powered Database Agent that automatically converts natural language requests into database implementations.

## 🎯 Core Functionalities

### 🎵 Spotify Clone Features
- **Music Player Interface**: Full-featured Spotify-like UI with play controls, progress bar, and volume control
- **Recently Played Tracks**: Dynamic display of user's recently played music
- **Made For You Playlists**: Personalized playlist recommendations
- **Popular Albums**: Trending and popular album collections
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark/Light Theme**: Theme switching with next-themes

### 🤖 AI Database Agent
- **Natural Language Processing**: Convert plain English requests into database operations
- **Automatic Schema Generation**: Create tables, indexes, and relationships from descriptions
- **Data Population**: Extract hardcoded data and populate database tables automatically
- **API Generation**: Generate REST API endpoints for database operations
- **Component Migration**: Update React components to use database instead of hardcoded data
- **Idempotent Operations**: Safe to re-run without duplicating data

### 🗄️ Database Features
- **Supabase Integration**: PostgreSQL database with real-time capabilities
- **Type-Safe Operations**: Full TypeScript support for database operations
- **Migration System**: Version-controlled database migrations
- **Backup & Rollback**: Automatic backup creation and rollback capabilities
- **State Management**: Track implemented features and database state

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase account
- An AI API key (OpenAI, Anthropic, or Google Gemini)

### 1. Clone and Install
```bash
git clone <repository-url>
cd Spotify-Clone-Orchids-Fullstack-SWE-Takehome
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Provider (choose one or more)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key

# Database Agent Configuration
DB_AGENT_DEFAULT_PROVIDER=anthropic
DB_AGENT_LOG_LEVEL=info
```

### 3. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your URL and keys
3. Go to Settings → Database → Connection string for service role key

### 4. Run the Application
```bash
# Start the development server
npm run dev

# In a new terminal, run the database agent
npm run db-agent
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🛠️ Database Agent Usage

### Interactive Mode
```bash
npm run db-agent:interactive
```

### Example Commands
```bash
# Create tables and populate with data
npm run db-agent "Create a recently played tracks feature"
npm run db-agent "Add made for you playlists to the database"
npm run db-agent "Create popular albums functionality"

# Check system status
npm run db-agent:status

# View available examples
npm run db-agent:examples

# Migration management
npm run db-agent:migrations
npm run db-agent:migrations:run
npm run db-agent:migrations:rollback
```

### Natural Language Examples
The AI Database Agent understands natural language requests:

- *"Create a table to store user's recently played tracks"*
- *"Add API endpoints for playlist management"*
- *"Update the main component to use database instead of hardcoded data"*
- *"Create a search functionality with full-text search"*

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js 15 App Router
│   ├── components/          # React components
│   │   ├── spotify-*.tsx    # Spotify UI components
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── supabase.ts     # Supabase client
│   │   └── types/          # TypeScript definitions
│   └── types/              # Global type definitions
├── cli/                    # Database Agent CLI
│   ├── agents/             # AI agents (database, code generation)
│   ├── utils/              # CLI utilities
│   └── config/             # Configuration files
├── public/                 # Static assets
└── docs/                   # Documentation files
```

## 🎮 Using the Application

### Music Player
- Click play buttons on any track to start playback
- Use the bottom player controls for play/pause, skip, volume
- Track progress is displayed with a progress bar

### Recently Played
- Automatically populated from database
- Shows last played tracks with timestamps
- Updates in real-time as you play music

### Made For You & Popular Albums
- Displays personalized recommendations
- Grid layout for easy browsing
- Hover effects and smooth animations

## 🤖 Database Agent Features

### Automatic Data Migration
The agent can:
1. **Extract** hardcoded arrays from React components
2. **Transform** data to match database schemas
3. **Create** appropriate database tables
4. **Populate** tables with the extracted data
5. **Update** components to use database APIs

### Smart Table Creation
- Analyzes data structure to create optimal schemas
- Adds appropriate indexes and constraints
- Creates relationships between tables
- Generates TypeScript types automatically

### API Generation
- Creates REST endpoints for all operations
- Includes proper error handling and validation
- Supports CRUD operations
- Generates OpenAPI documentation

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start Next.js development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database Agent
npm run db-agent         # Run database agent with query
npm run db-agent:interactive  # Interactive mode
npm run db-agent:status  # Check system status
npm run db-agent:migrations  # Manage migrations

# Setup
npm run setup            # Complete setup with examples
```

## 🔍 Troubleshooting

### Common Issues

**Database Connection Error**
- Verify Supabase URL and keys in `.env.local`
- Check Supabase project is active
- Ensure service role key has proper permissions

**AI API Errors**
- Verify API key is correct and has credits
- Check rate limits for your API provider
- Try switching providers with `DB_AGENT_DEFAULT_PROVIDER`

**Migration Failures**
- Check Supabase connection
- Review migration logs in `src/lib/migrations/`
- Use rollback: `npm run db-agent:migrations:rollback`

**Component Not Updating**
- Clear browser cache and restart dev server
- Check API endpoints are created correctly
- Verify database has data: `npm run db-agent:status`

### Debug Mode
```bash
# Enable detailed logging
DB_AGENT_LOG_LEVEL=debug npm run db-agent "your query"

# Check system state
npm run db-agent:status

# View migration history
npm run db-agent:migrations status
```

## 📚 Documentation

- **[CLI Documentation](./CLI-README.md)** - Detailed CLI usage guide
- **[Setup Guide](./SETUP-GUIDE.md)** - Step-by-step setup instructions
- **[Migration Guide](./MIGRATION-SETUP.md)** - Database migration details
- **[Troubleshooting](./MIGRATION-TROUBLESHOOTING.md)** - Common issues and solutions
- **[Claude Guide](./CLAUDE.md)** - AI assistant integration guide

## 🛡️ Security Features

- **Environment Variables**: Sensitive data stored securely
- **API Validation**: Input validation on all endpoints
- **SQL Injection Prevention**: Parameterized queries only
- **CORS Protection**: Proper cross-origin resource sharing
- **Rate Limiting**: Built-in API rate limiting

## 🎨 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons

### Backend
- **Supabase** - PostgreSQL database with real-time features
- **Next.js API Routes** - Serverless API endpoints
- **Zod** - Runtime type validation

### AI/CLI
- **OpenAI GPT-4** - Natural language processing
- **Anthropic Claude** - AI reasoning and code generation
- **Commander.js** - CLI framework
- **Inquirer.js** - Interactive command line

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the docs folder for detailed guides

---

**Happy coding! 🎵✨**