# 🎵 Spotify Clone Database Agent CLI

A powerful CLI tool that automatically implements database features for your Spotify clone using AI agents.

## 🚀 Features

- **AI-Powered**: Uses OpenAI, Anthropic, or Google Gemini to understand and implement database features
- **Interactive Mode**: Chat with the agent to describe what you want to build
- **Project Analysis**: Automatically analyzes your codebase to understand existing structure
- **Code Generation**: Creates database schemas, API endpoints, and updates React components
- **Rollback Support**: Automatically rollback changes if something goes wrong
- **Multiple AI Providers**: Support for OpenAI, Anthropic, and Google Gemini

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account (for database)
- At least one AI provider API key

## 🔧 Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Copy `cli/config/environment.example` to `.env.local` and fill in your credentials:

```bash
# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Required: At least one AI provider
OPENAI_API_KEY=your-openai-api-key
# OR
ANTHROPIC_API_KEY=your-anthropic-api-key
# OR
GEMINI_API_KEY=your-gemini-api-key
```

3. **Make the CLI executable**:
```bash
chmod +x cli/index.ts
```

## 💡 Usage

### Interactive Mode (Recommended)
Start a conversation with the database agent:

```bash
npm run db-agent:interactive
```

### Direct Query Mode
Execute a specific query:

```bash
npm run db-agent query "Can you store the recently played songs in a table"
```

### Check Status
View current project status:

```bash
npm run db-agent:status
```

### View Examples
See example queries you can use:

```bash
npm run db-agent:examples
```

## 🎯 Example Queries

Here are some example queries you can try:

1. **"Can you store the recently played songs in a table"**
   - Creates `recently_played` table
   - Generates API endpoints
   - Updates UI components to use database

2. **"Can you store the 'Made for you' and 'Popular albums' in a table"**
   - Creates `made_for_you` and `popular_albums` tables
   - Generates API routes for both
   - Updates components to fetch from database

3. **"Add a favorites system for users"**
   - Creates user favorites table
   - Adds favorite/unfavorite functionality
   - Updates UI with heart buttons

4. **"Create a search functionality with database backing"**
   - Creates search indexes
   - Implements search API
   - Updates search component

## 🔄 How It Works

1. **Project Analysis**: The agent analyzes your codebase to understand:
   - Existing components and their structure
   - Current data models and types
   - Available API routes
   - Database configuration

2. **Query Planning**: The AI creates a detailed execution plan with:
   - Database schema changes
   - API endpoint creation
   - Component updates
   - Dependency installations

3. **Code Generation**: The agent generates:
   - SQL migration files
   - TypeScript API routes
   - Updated React components
   - Database types and interfaces

4. **Rollback Support**: If anything goes wrong, the agent can rollback all changes

## 🛠️ Advanced Configuration

### Switching AI Providers
You can switch between AI providers in interactive mode or set a default:

```bash
# Set default provider
DB_AGENT_DEFAULT_PROVIDER=anthropic
```

### Logging Levels
Control the verbosity of logging:

```bash
DB_AGENT_LOG_LEVEL=debug  # debug, info, warn, error
```

## 🗂️ Project Structure

```
cli/
├── index.ts              # Main CLI entry point
├── agents/
│   ├── database-agent.ts    # Main database agent
│   ├── project-analyzer.ts  # Project analysis
│   └── code-generator.ts    # Code generation utilities
├── utils/
│   ├── logger.ts            # Logging utilities
│   ├── file-manager.ts      # File operations
│   └── ai-client.ts         # AI provider integration
└── config/
    └── environment.example  # Environment configuration
```

## 🧪 Testing

Test the CLI tool with the provided examples:

```bash
npm run db-agent:examples
npm run db-agent:interactive
```

Try the test queries mentioned in the examples to see the full workflow.

## 🔍 Troubleshooting

### Common Issues

1. **AI Provider Not Configured**
   - Make sure you have at least one AI provider API key set
   - Check that your API key is valid and has sufficient credits

2. **Supabase Connection Issues**
   - Verify your Supabase URL and anon key are correct
   - Make sure your Supabase project is active

3. **File Permission Errors**
   - Ensure the CLI has write permissions to your project directory
   - Check that you're running from the project root

4. **TypeScript Compilation Errors**
   - Make sure all dependencies are installed
   - Try running `npm install` again

### Getting Help

1. Run `npm run db-agent:status` to check configuration
2. Check the logs for detailed error messages
3. Try running in interactive mode for step-by-step guidance

## 🚀 Next Steps

After setting up the CLI tool, you can:

1. Try the example queries to see how it works
2. Implement your own custom database features
3. Extend the agent with additional capabilities
4. Integrate with your existing development workflow

## 📝 License

This project is part of the Spotify Clone demonstration and is intended for educational purposes. 