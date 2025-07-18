import { Logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';
import { ProjectContext, ImplementedFeature, OperationHistory } from './project-analyzer';
import { AIClient } from '../utils/ai-client';
import { CodeGenerator } from './code-generator';
import { MigrationExecutor, MigrationResult } from '../utils/migration-executor';
import { StateAnalyzer } from '../utils/state-analyzer';
import { IdempotentSQLGenerator } from '../utils/idempotent-sql-generator';

export interface DatabaseOperation {
  type: 'create_table' | 'create_api' | 'update_component' | 'install_dependency' | 'run_migration' | 'create_types' | 'create_hooks';
  description: string;
  files: string[];
  dependencies?: string[];
  tableSchema?: any;
  apiEndpoints?: string[];
}

export interface QueryPlan {
  query: string;
  analysis: string;
  operations: DatabaseOperation[];
  estimatedTime: number;
  requirements: string[];
}

export class DatabaseAgent {
  private logger: Logger;
  private fileManager: FileManager;
  private aiClient: AIClient;
  private codeGenerator: CodeGenerator;
  private migrationExecutor: MigrationExecutor;
  private stateAnalyzer: StateAnalyzer;
  private sqlGenerator: IdempotentSQLGenerator;

  constructor() {
    this.logger = new Logger();
    this.fileManager = new FileManager();
    this.aiClient = new AIClient();
    this.codeGenerator = new CodeGenerator();
    this.migrationExecutor = new MigrationExecutor();
    this.stateAnalyzer = new StateAnalyzer();
    this.sqlGenerator = new IdempotentSQLGenerator();
  }

  async executeQuery(query: string, projectContext: ProjectContext): Promise<void> {
    this.logger.section('Database Agent Execution');
    this.logger.info(`Query: "${query}"`);

    try {
      // Phase 0: Initialize migration executor if needed
      this.logger.agentStatus('analyzing');
      await this.initializeMigrationExecutor();

      // Phase 1: Analyze the query and create a plan
      this.logger.agentStatus('thinking');
      const plan = await this.analyzeQuery(query, projectContext);
      
      this.logger.subsection('Execution Plan');
      this.logger.info(plan.analysis);
      this.logger.info(`Operations: ${plan.operations.length}`);
      this.logger.info(`Estimated time: ${plan.estimatedTime}s`);

      // Phase 2: Validate requirements
      this.logger.agentStatus('analyzing');
      await this.validateRequirements(plan.requirements, projectContext);

      // Phase 3: Execute operations
      this.logger.agentStatus('executing');
      await this.executeOperations(plan.operations, projectContext);

      this.logger.success('Query executed successfully! 🎉');
      
    } catch (error) {
      this.logger.error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Attempt rollback
      this.logger.warn('Attempting to rollback changes...');
      await this.fileManager.rollbackOperations();
      
      throw error;
    }
  }

  private async initializeMigrationExecutor(): Promise<void> {
    try {
      await this.migrationExecutor.initialize();
    } catch (error) {
      this.logger.warn(`Migration executor initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.info('Some migration features may be limited. Check your Supabase configuration.');
    }
  }

  // Check if the query is asking for something that already exists
  private async checkForExistingFeature(query: string, projectContext: ProjectContext): Promise<{
    exists: boolean;
    feature?: string;
    message: string;
    suggestedOperations?: DatabaseOperation[];
  }> {
    const queryLower = query.toLowerCase();
    
    // Check for recently played functionality
    if (queryLower.includes('recently played') || queryLower.includes('recent songs')) {
      const recentlyPlayedFeature = projectContext.implementedFeatures.find(f => f.name === 'recently_played');
      if (recentlyPlayedFeature?.implemented) {
        return {
          exists: true,
          feature: 'recently_played',
          message: `Recently played functionality is already implemented! 
            ✅ Table: ${recentlyPlayedFeature.tables.join(', ')}
            ✅ API: ${recentlyPlayedFeature.apis.join(', ')}
            ✅ Components: ${recentlyPlayedFeature.components.join(', ')}
            
            The recently played songs feature is fully functional. You can access it through the existing API endpoints and components.`,
          suggestedOperations: []
        };
      }
    }

    // Check for made for you functionality
    if (queryLower.includes('made for you') || queryLower.includes('recommendations') || queryLower.includes('personalized')) {
      const madeForYouFeature = projectContext.implementedFeatures.find(f => f.name === 'made_for_you');
      if (madeForYouFeature?.implemented) {
        return {
          exists: true,
          feature: 'made_for_you',
          message: `Made for you functionality is already implemented!
            ✅ Table: ${madeForYouFeature.tables.join(', ')}
            ✅ API: ${madeForYouFeature.apis.join(', ')}
            ✅ Components: ${madeForYouFeature.components.join(', ')}
            
            The personalized recommendations feature is fully functional.`,
          suggestedOperations: []
        };
      }
    }

    // Check for popular albums functionality
    if (queryLower.includes('popular albums') || queryLower.includes('trending albums') || queryLower.includes('popular music')) {
      const popularAlbumsFeature = projectContext.implementedFeatures.find(f => f.name === 'popular_albums');
      if (popularAlbumsFeature?.implemented) {
        return {
          exists: true,
          feature: 'popular_albums',
          message: `Popular albums functionality is already implemented!
            ✅ Table: ${popularAlbumsFeature.tables.join(', ')}
            ✅ API: ${popularAlbumsFeature.apis.join(', ')}
            ✅ Components: ${popularAlbumsFeature.components.join(', ')}
            
            The popular albums feature is fully functional.`,
          suggestedOperations: []
        };
      }
    }

    // Check for playlist functionality
    if (queryLower.includes('playlist') || queryLower.includes('user playlist')) {
      const playlistFeature = projectContext.implementedFeatures.find(f => f.name === 'user_playlists');
      if (playlistFeature?.implemented) {
        return {
          exists: true,
          feature: 'user_playlists',
          message: `User playlist functionality is already implemented!
            ✅ Table: ${playlistFeature.tables.join(', ')}
            ✅ API: ${playlistFeature.apis.join(', ')}
            ✅ Components: ${playlistFeature.components.join(', ')}
            
            The user playlist management feature is fully functional.`,
          suggestedOperations: []
        };
      }
    }

    // Check for search functionality
    if (queryLower.includes('search') || queryLower.includes('find songs') || queryLower.includes('discovery')) {
      const searchFeature = projectContext.implementedFeatures.find(f => f.name === 'search_functionality');
      if (searchFeature?.implemented) {
        return {
          exists: true,
          feature: 'search_functionality',
          message: `Search functionality is already implemented!
            ✅ Table: ${searchFeature.tables.join(', ')}
            ✅ API: ${searchFeature.apis.join(', ')}
            ✅ Components: ${searchFeature.components.join(', ')}
            
            The search and discovery feature is fully functional.`,
          suggestedOperations: []
        };
      }
    }

    // Check for specific table existence
    const tableMatches = queryLower.match(/table?\s+(\w+)/);
    if (tableMatches) {
      const tableName = tableMatches[1];
      if (projectContext.systemState?.database.connectedTables.includes(tableName)) {
        return {
          exists: true,
          feature: `table_${tableName}`,
          message: `Table '${tableName}' already exists in the database!
            
            The table is already created and ready to use. You can query it through the existing API endpoints or create new ones if needed.`,
          suggestedOperations: []
        };
      }
    }

    return {
      exists: false,
      message: 'No existing functionality found for this query'
    };
  }

  private async analyzeQuery(query: string, projectContext: ProjectContext): Promise<QueryPlan> {
    this.logger.thinking('Analyzing query and creating execution plan...');

    // First, check if this query is asking for something that already exists
    const existingFeatureCheck = await this.checkForExistingFeature(query, projectContext);
    if (existingFeatureCheck.exists) {
      this.logger.info(`Feature already implemented: ${existingFeatureCheck.feature}`);
      return {
        query,
        analysis: existingFeatureCheck.message,
        operations: existingFeatureCheck.suggestedOperations || [],
        estimatedTime: 0,
        requirements: []
      };
    }

    const systemPrompt = `You are an expert database agent for a Spotify clone built with Next.js and Supabase. You specialize in analyzing user requests and creating precise execution plans.

    ## Current Project Context:
    - Components: ${projectContext.components.length} (${projectContext.components.filter(c => c.usesDatabase).length} use database)
    - Data structures: ${projectContext.currentDataStructures.length} (${projectContext.currentDataStructures.filter(ds => ds.isForDatabase).length} database-related)
    - Existing APIs: ${projectContext.existingAPIs.length} (${projectContext.existingAPIs.filter(api => api.hasDatabase).length} use database)
    - Supabase configured: ${projectContext.supabaseConfigured}
    - Current database tables: ${projectContext.databaseTables.join(', ') || 'none'}
    - AI Provider: ${projectContext.aiProvider}
    - Dependencies: ${projectContext.dependencies.join(', ')}

    ## Implemented Features:
    ${projectContext.implementedFeatures.map(f => `- ${f.name}: ${f.implemented ? '✅ IMPLEMENTED' : '❌ NOT IMPLEMENTED'} (Tables: ${f.tables.join(', ') || 'none'}, APIs: ${f.apis.join(', ') || 'none'})`).join('\n')}

    ## System State:
    - Database tables: ${projectContext.systemState?.database.connectedTables.join(', ') || 'none'}
    - Implemented API routes: ${projectContext.systemState?.api.implementedRoutes.join(', ') || 'none'}
    - Components using database: ${projectContext.systemState?.components.usingDatabase.join(', ') || 'none'}
    - Executed migrations: ${projectContext.systemState?.database.executedMigrations.length || 0}

    ## Hardcoded Data Analysis:
    ${projectContext.hardcodedDataAnalysis.map(hd => `- ${hd.variableName} (${hd.dataType}) → suggested table: ${hd.suggestedTableName}`).join('\n')}

    ## Current Data Structures:
    ${projectContext.currentDataStructures.map(ds => `- ${ds.name} (${ds.type}${ds.isForDatabase ? ' - database related' : ''}): ${ds.properties.map(p => `${p.name}: ${p.type}${p.optional ? '?' : ''}`).join(', ')}`).join('\n')}

    ## Existing API Routes:
    ${projectContext.existingAPIs.map(api => `- ${api.path} [${api.methods.join(', ')}]${api.hasDatabase ? ' (uses database)' : ''}`).join('\n')}

    ## CRITICAL: AVOID DUPLICATE WORK
    - DO NOT create operations for features that are already implemented
    - DO NOT create tables that already exist in the database
    - DO NOT create APIs that already exist
    - If user asks for existing functionality, suggest modifications or confirm it's already available

    ## Your Task:
    Analyze the user's query and create a detailed execution plan. Focus on:
    1. Understanding what database features need to be implemented
    2. Identifying which existing hardcoded data should be moved to database
    3. Planning the migration from static data to dynamic database operations
    4. Ensuring seamless integration with existing components

    ## Response Format:
    You MUST return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.
    The JSON must contain exactly these fields:
    - analysis: string (detailed analysis of what needs to be done)
    - operations: array of objects with type, description, files, and dependencies
    - estimatedTime: number (seconds)
    - requirements: array of strings (what needs to be installed/configured)
    
    CRITICAL: Return ONLY the JSON object. Do not include any text before or after the JSON.

    ## Available Operation Types:
    - create_table: Create database table with schema
    - create_api: Create API endpoints
    - update_component: Update existing React components
    - install_dependency: Install npm packages
    - run_migration: Run database migrations
    - create_types: Generate TypeScript types
    - create_hooks: Create custom React hooks

    ## Important Notes:
    - Always preserve existing UI/UX while adding database functionality
    - Use the existing data structures as a guide for table schema
    - Create proper TypeScript types for all database operations
    - Include error handling and loading states in components
    - Follow Next.js 13+ app directory conventions`;

    const response = await this.aiClient.generateText(systemPrompt, query);
    
    try {
      // Extract JSON more precisely by finding balanced braces
      this.logger.info('Extracting JSON from AI response...');
      const jsonString = this.extractJSON(response);
      if (!jsonString) {
        this.logger.error('No valid JSON found in AI response');
        this.logger.codeBlock(response.substring(0, 500) + '...', 'text');
        throw new Error('No valid JSON found in AI response');
      }
      
      this.logger.info('JSON extracted successfully, parsing...');
      const plan = JSON.parse(jsonString);
      
      // Validate the plan structure
      if (!plan.analysis || !plan.operations || !plan.estimatedTime || !plan.requirements) {
        this.logger.error('Invalid plan structure from AI response');
        this.logger.codeBlock(jsonString, 'json');
        throw new Error('Invalid plan structure from AI response');
      }
      
      this.logger.success('AI response parsed successfully');
      return {
        query,
        analysis: plan.analysis,
        operations: plan.operations,
        estimatedTime: plan.estimatedTime,
        requirements: plan.requirements
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response.');
      this.logger.info(`Response length: ${response.length}`);
      this.logger.info('Response preview:');
      this.logger.codeBlock(response.substring(0, 1000) + (response.length > 1000 ? '\n... (truncated)' : ''), 'text');
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractJSON(text: string): string | null {
    try {
      // Find the first opening brace
      const start = text.indexOf('{');
      if (start === -1) return null;

      // Count braces to find the matching closing brace
      let braceCount = 0;
      let end = -1;
      
      for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            end = i;
            break;
          }
        }
      }
      
      if (end === -1) return null;
      
      const jsonString = text.substring(start, end + 1);
      
      // Validate that it's actually valid JSON by attempting to parse it
      JSON.parse(jsonString);
      
      return jsonString;
    } catch (error) {
      // If JSON parsing fails, try alternative extraction methods
      return this.fallbackJSONExtraction(text);
    }
  }

  private fallbackJSONExtraction(text: string): string | null {
    try {
      // Method 1: Look for JSON between code blocks or similar markers
      const patterns = [
        /```json\s*(\{[\s\S]*?\})\s*```/i,
        /```\s*(\{[\s\S]*?\})\s*```/i,
        /(\{[\s\S]*?\})\s*$/,  // JSON at the end
        /^(\{[\s\S]*?\})/,     // JSON at the beginning
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          try {
            JSON.parse(match[1]);
            return match[1];
          } catch {
            continue;
          }
        }
      }

      // Method 2: Try to find the largest valid JSON object
      const lines = text.split('\n');
      let jsonLines: string[] = [];
      let inJson = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{')) {
          inJson = true;
          jsonLines = [line];
        } else if (inJson) {
          jsonLines.push(line);
          if (trimmed.endsWith('}')) {
            try {
              const jsonString = jsonLines.join('\n');
              JSON.parse(jsonString);
              return jsonString;
            } catch {
              // Continue looking
            }
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async validateRequirements(requirements: string[], projectContext: ProjectContext): Promise<void> {
    this.logger.analyzing('Validating requirements...');

    for (const requirement of requirements) {
      this.logger.info(`Checking: ${requirement}`);

      if (requirement.includes('supabase') && !projectContext.supabaseConfigured) {
        this.logger.warn('Supabase not configured. Will set up Supabase configuration.');
        // Add Supabase setup to operations
      }

      if (requirement.includes('npm install')) {
        const packageName = requirement.replace('npm install ', '');
        if (!projectContext.dependencies.includes(packageName)) {
          this.logger.info(`Will install ${packageName}`);
        }
      }
    }
  }

  private async executeOperations(operations: DatabaseOperation[], projectContext: ProjectContext): Promise<void> {
    // Filter operations to avoid duplicates
    const filteredOperations = await this.filterRedundantOperations(operations, projectContext);
    
    if (filteredOperations.length === 0) {
      this.logger.info('No operations needed - all requested functionality already exists! 🎉');
      return;
    }

    const totalOperations = filteredOperations.length;
    this.logger.info(`Executing ${totalOperations} operations (${operations.length - filteredOperations.length} skipped as redundant)`);

    for (let i = 0; i < filteredOperations.length; i++) {
      const operation = filteredOperations[i];
      this.logger.progress(i + 1, totalOperations, operation.description);

      const operationId = `${Date.now()}-${i}`;
      let success = false;

      try {
        switch (operation.type) {
          case 'create_table':
            await this.executeCreateTable(operation, projectContext);
            success = true;
            break;
          case 'create_api':
            await this.executeCreateAPI(operation, projectContext);
            success = true;
            break;
          case 'update_component':
            await this.executeUpdateComponent(operation, projectContext);
            success = true;
            break;
          case 'install_dependency':
            await this.executeInstallDependency(operation, projectContext);
            success = true;
            break;
          case 'run_migration':
            await this.executeRunMigration(operation, projectContext);
            success = true;
            break;
          case 'create_types':
            await this.executeCreateTypes(operation, projectContext);
            success = true;
            break;
          case 'create_hooks':
            await this.executeCreateHooks(operation, projectContext);
            success = true;
            break;
          default:
            this.logger.warn(`Unknown operation type: ${operation.type}`);
        }

        // Record successful operation
        await this.recordOperation(operationId, operation, success, projectContext);

      } catch (error) {
        this.logger.error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
        await this.recordOperation(operationId, operation, false, projectContext);
        throw error;
      }
    }
  }

  private async executeCreateTable(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating idempotent database table schema...');

    try {
      // Initialize the SQL generator
      await this.sqlGenerator.initialize();

      // Extract table name and columns from the operation
      const tableName = this.extractTableName(operation.description);
      const columns = this.extractColumns(operation, projectContext);

      // --- Seed Data Extraction Logic ---
      let seedData: any[] | null = null;
      let includeSeedData = false;
      // Map table names to array names in the frontend
      const tableToArrayMap: Record<string, string> = {
        'recently_played': 'recentlyPlayed',
        'made_for_you': 'madeForYou',
        'popular_albums': 'popularAlbums',
      };
      const arrayName = tableToArrayMap[tableName];
      if (arrayName) {
        // Use the extractArrayFromFile utility from file-manager
        const { extractArrayFromFile } = require('../utils/file-manager');
        const frontendFile = 'src/components/spotify-main-content.tsx';
        const rawSeedData = await extractArrayFromFile(frontendFile, arrayName);
        if (rawSeedData && Array.isArray(rawSeedData) && rawSeedData.length > 0) {
          // Transform the raw seed data to match database schema
          seedData = this.transformSeedData(rawSeedData, tableName);
          if (seedData && seedData.length > 0) {
            includeSeedData = true;
            this.logger.info(`Extracted and transformed ${seedData.length} seed records from ${arrayName} in ${frontendFile}`);
          } else {
            this.logger.warn(`Failed to transform seed data for ${arrayName}`);
          }
        } else {
          this.logger.info(`No seed data found for ${arrayName} in ${frontendFile}`);
        }
      }
      // --- End Seed Data Extraction Logic ---

      // Generate comprehensive migration with seed data
      const sqlCode = await this.sqlGenerator.generateCompleteMigration(
        operation.description,
        tableName,
        columns,
        {
          includeIndexes: true,
          includePolicies: true,
          includeSeedData,
          seedData: includeSeedData ? seedData : undefined
        }
      );

      // Validate the SQL is idempotent
      const validation = this.sqlGenerator.validateIdempotency(sqlCode);
      if (!validation.isIdempotent) {
        this.logger.warn('Generated SQL may not be fully idempotent:');
        validation.issues.forEach(issue => this.logger.warn(`  - ${issue}`));
      }

      // Create migration file
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
      const operationName = operation.description.replace(/\s+/g, '_').toLowerCase();
      const migrationFile = `src/lib/migrations/${timestamp}_${operationName}.sql`;
      
      // Ensure migrations directory exists
      await this.fileManager.ensureDirectory('src/lib/migrations');
      
      await this.fileManager.createFile(migrationFile, sqlCode);
      
      // Add the migration file to the operation for tracking
      operation.files.push(migrationFile);
      
      this.logger.success(`Created idempotent migration file: ${migrationFile}`);
      
    } catch (error) {
      this.logger.error(`Failed to create table migration: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Helper method to extract table name from operation description
  private extractTableName(description: string): string {
    // Look for patterns like "create table_name" or "store data in table_name"
    const tableMatches = description.match(/(?:create|table|store.*in)\s+(\w+)/i);
    if (tableMatches) {
      return tableMatches[1];
    }
    
    // Look for common Spotify table names
    if (description.toLowerCase().includes('recently played')) return 'recently_played';
    if (description.toLowerCase().includes('made for you')) return 'made_for_you';
    if (description.toLowerCase().includes('popular albums')) return 'popular_albums';
    if (description.toLowerCase().includes('playlist')) return 'user_playlists';
    if (description.toLowerCase().includes('search')) return 'search_history';
    
    // Default fallback
    return description.replace(/\s+/g, '_').toLowerCase();
  }

  // Helper method to extract columns from operation and project context
  private extractColumns(operation: DatabaseOperation, projectContext: ProjectContext): any[] {
    const columns = [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', default: 'gen_random_uuid()' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' }
    ];

    // Add columns based on operation description
    const description = operation.description.toLowerCase();
    
    if (description.includes('recently played')) {
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'track_id', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'track_name', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'artist_name', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'album_name', type: 'TEXT', default: '' },
        { name: 'played_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
        { name: 'duration_ms', type: 'INTEGER', default: '' }
      );
    } else if (description.includes('made for you')) {
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'title', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'description', type: 'TEXT', default: '' },
        { name: 'image_url', type: 'TEXT', default: '' },
        { name: 'type', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'recommendation_score', type: 'DECIMAL(3,2)', default: '' }
      );
    } else if (description.includes('popular albums')) {
      columns.push(
        { name: 'album_id', type: 'TEXT', constraints: 'NOT NULL UNIQUE', default: '' },
        { name: 'title', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'artist', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'image_url', type: 'TEXT', default: '' },
        { name: 'release_date', type: 'DATE', default: '' },
        { name: 'popularity_score', type: 'INTEGER', default: '' },
        { name: 'genre', type: 'TEXT', default: '' }
      );
    } else if (description.includes('playlist')) {
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'name', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'description', type: 'TEXT', default: '' },
        { name: 'is_public', type: 'BOOLEAN', default: 'false' },
        { name: 'image_url', type: 'TEXT', default: '' },
        { name: 'track_count', type: 'INTEGER', default: '0' }
      );
    } else if (description.includes('search')) {
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'query', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'result_count', type: 'INTEGER', default: '0' },
        { name: 'searched_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' }
      );
    }

    return columns;
  }

  // Transform raw seed data to match database schema
  private transformSeedData(rawData: any[], tableName: string): any[] | null {
    try {
      switch (tableName) {
        case 'recently_played':
          return rawData.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            image_url: item.image,
            duration: item.duration,
            played_at: new Date().toISOString(),
            user_id: 'default-user', // Default user ID for seed data
            created_at: new Date().toISOString()
          }));

        case 'made_for_you':
          return rawData.map(item => ({
            id: item.id,
            title: item.title,
            description: item.artist, // Using artist field as description
            image_url: item.image,
            playlist_type: 'personalized',
            user_id: 'default-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        case 'popular_albums':
          return rawData.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            image_url: item.image,
            release_date: '2023-01-01', // Default release date
            duration: item.duration,
            popularity_score: Math.floor(Math.random() * 100), // Random popularity score
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        default:
          this.logger.warn(`No transformation defined for table: ${tableName}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error transforming seed data for ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async executeCreateAPI(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating API endpoints...');

    for (const file of operation.files) {
      const apiPrompt = `Create a Next.js API route for: ${operation.description}

      ## File: ${file}

      ## Context:
      - Existing API routes: ${projectContext.existingAPIs.map(api => `${api.path} [${api.methods.join(', ')}]`).join(', ')}
      - Database tables: ${projectContext.databaseTables.join(', ') || 'none'}
      - TypeScript types: ${projectContext.currentDataStructures.filter(ds => ds.isForDatabase).map(ds => ds.name).join(', ')}

      ## Requirements:
      - Use Next.js 13+ app directory structure
      - Include GET, POST, PUT, DELETE methods as appropriate
      - Use Supabase client from '@/lib/supabase'
      - Include proper TypeScript types
      - Add comprehensive error handling
      - Include input validation using Zod
      - Add proper HTTP status codes
      - Include CORS headers if needed
      - Add rate limiting considerations
      - Include JSDoc comments

      ## Response Format:
      Return only the TypeScript code for the API route, no explanations or markdown formatting.`;

      const apiCode = await this.aiClient.generateText(apiPrompt, operation.description);
      
      // Ensure API directory exists
      const apiDir = file.split('/').slice(0, -1).join('/');
      await this.fileManager.ensureDirectory(apiDir);
      
      await this.fileManager.createFile(file, apiCode);
      this.logger.success(`Created API route: ${file}`);
    }
  }

  private async executeUpdateComponent(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Updating React components...');

    for (const file of operation.files) {
      try {
        // Read existing component
        const existingComponent = await this.fileManager.readFile(file);
        
        const componentPrompt = `Update this React component to use database instead of hardcoded data:

        ## Operation: ${operation.description}
        ## File: ${file}

        ## Current Component:
        ${existingComponent}

        ## Available API Endpoints:
        ${operation.apiEndpoints?.map(endpoint => `- ${endpoint}`).join('\n') || 'Will be created'}

        ## Requirements:
        - Replace hardcoded data with API calls
        - Add loading states with proper UI feedback
        - Add error handling with user-friendly messages
        - Maintain exact same UI/UX appearance
        - Use React hooks (useState, useEffect, useCallback)
        - Add proper TypeScript types
        - Include proper error boundaries
        - Add optimistic updates where appropriate
        - Follow React best practices

        ## Response Format:
        Return only the updated TypeScript/React component code, no explanations or markdown formatting.`;

        const updatedComponent = await this.aiClient.generateText(componentPrompt, operation.description);
        
        await this.fileManager.updateFile(file, updatedComponent);
        this.logger.success(`Updated component: ${file}`);
      } catch (error) {
        this.logger.error(`Failed to update component ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async executeCreateTypes(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating TypeScript types...');

    const typesPrompt = `Create TypeScript type definitions for: ${operation.description}

    ## Context:
    - Existing types: ${projectContext.currentDataStructures.map(ds => ds.name).join(', ')}
    - Database tables: ${projectContext.databaseTables.join(', ') || 'none'}

    ## Requirements:
    - Create comprehensive TypeScript interfaces
    - Include proper type definitions for all database operations
    - Add utility types for API responses
    - Include proper JSDoc comments
    - Export all types properly
    - Follow TypeScript best practices

    ## Response Format:
    Return only the TypeScript type definitions, no explanations or markdown formatting.`;

    const typesCode = await this.aiClient.generateText(typesPrompt, operation.description);
    
    const typesFile = 'src/lib/types/database.ts';
    await this.fileManager.ensureDirectory('src/lib/types');
    
    await this.fileManager.createFile(typesFile, typesCode);
    this.logger.success(`Created types file: ${typesFile}`);
  }

  private async executeCreateHooks(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating custom React hooks...');

    const hooksPrompt = `Create custom React hooks for: ${operation.description}

    ## Context:
    - API endpoints: ${operation.apiEndpoints?.join(', ') || 'to be created'}
    - Database operations: ${operation.description}

    ## Requirements:
    - Create reusable custom hooks
    - Include loading and error states
    - Add proper TypeScript types
    - Include caching where appropriate
    - Add refetch functionality
    - Follow React hooks best practices
    - Include JSDoc comments

    ## Response Format:
    Return only the TypeScript hook code, no explanations or markdown formatting.`;

    const hooksCode = await this.aiClient.generateText(hooksPrompt, operation.description);
    
    const hooksFile = 'src/hooks/database.ts';
    await this.fileManager.ensureDirectory('src/hooks');
    
    await this.fileManager.createFile(hooksFile, hooksCode);
    this.logger.success(`Created hooks file: ${hooksFile}`);
  }

  private async executeInstallDependency(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.executing('Installing dependencies...');

    // In a real implementation, this would run npm install
    // For now, just update package.json
    const packageJsonPath = 'package.json';
    const packageJson = projectContext.packageJson;
    
    if (operation.dependencies) {
      for (const dependency of operation.dependencies) {
        if (!packageJson.dependencies[dependency]) {
          packageJson.dependencies[dependency] = 'latest';
          this.logger.info(`Added dependency: ${dependency}`);
        }
      }
    }

    await this.fileManager.updateFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    this.logger.success('Updated package.json');
  }

  private async executeRunMigration(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.executing('Running database migration...');

    try {
      // Get all migration files that need to be executed
      const migrationFiles = operation.files.filter(file => file.endsWith('.sql'));
      
      if (migrationFiles.length === 0) {
        this.logger.warn('No SQL migration files found to execute');
        return;
      }

      // Resolve full paths for migration files
      const migrationPaths = migrationFiles.map(file => {
        // If file is relative, resolve it from project root
        if (!file.startsWith('/')) {
          return `${projectContext.projectRoot}/${file}`;
        }
        return file;
      });

      // Execute migrations using the migration executor
      this.logger.info(`Executing ${migrationPaths.length} migration file(s)...`);
      const results = await this.migrationExecutor.executeMigrations(migrationPaths);

      // Process results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        this.logger.error(`${failed.length} migration(s) failed:`);
        failed.forEach(result => {
          this.logger.error(`- ${result.migration.filename}: ${result.error}`);
        });

        // Create fallback setup script for failed migrations
        await this.createFallbackSetupScript(operation, failed);
        
        throw new Error(`Migration execution failed for ${failed.length} file(s)`);
      }

      // Verify schema after successful migrations
      const allTablesCreated = successful.flatMap(r => r.tablesCreated || []);
      if (allTablesCreated.length > 0) {
        this.logger.analyzing('Verifying database schema...');
        const schemaVerification = await this.migrationExecutor.verifyDatabaseSchema(allTablesCreated);
        
        if (!schemaVerification.valid) {
          this.logger.warn(`Schema verification issues detected:`);
          if (schemaVerification.missing.length > 0) {
            this.logger.warn(`Missing tables: ${schemaVerification.missing.join(', ')}`);
          }
        } else {
          this.logger.success('Database schema verified successfully');
        }
      }

      this.logger.success(`Successfully executed ${successful.length} migration(s)`);
      
      // Update project context with new tables
      projectContext.databaseTables.push(...allTablesCreated);

    } catch (error) {
      this.logger.error(`Migration execution failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Create fallback setup script
      await this.createFallbackSetupScript(operation, []);
      
      throw error;
    }
  }

  private async createFallbackSetupScript(operation: DatabaseOperation, failedResults: MigrationResult[]): Promise<void> {
    this.logger.info('Creating fallback setup script...');

    const setupScript = `-- Migration: ${operation.description}
-- Automatic migration execution failed. Please run manually.

-- INSTRUCTIONS FOR MANUAL SETUP:
-- 1. Ensure Supabase functions are installed by running cli/utils/supabase-functions.sql in your Supabase SQL editor
-- 2. Set SUPABASE_SERVICE_ROLE_KEY environment variable for full automation
-- 3. Run the migration files below in order
-- 4. Verify tables were created successfully

-- Migration files to run:
${operation.files.map(file => `-- File: ${file}`).join('\n')}

${failedResults.length > 0 ? `
-- FAILED MIGRATIONS:
${failedResults.map(result => `-- FAILED: ${result.migration.filename} - ${result.error}`).join('\n')}
` : ''}

-- Setup Supabase functions (run once):
-- Copy and run the contents of cli/utils/supabase-functions.sql

-- Alternative: Use Supabase CLI
-- supabase functions deploy exec_sql
-- supabase db push

-- Troubleshooting:
-- 1. Check your Supabase environment variables
-- 2. Ensure you have the necessary permissions
-- 3. Verify your Supabase project is active
-- 4. Check the Supabase dashboard for any errors`;

    await this.fileManager.createFile('database-setup-manual.sql', setupScript);
    this.logger.success('Created manual setup script: database-setup-manual.sql');
  }

  // Filter operations to avoid redundant work
  private async filterRedundantOperations(operations: DatabaseOperation[], projectContext: ProjectContext): Promise<DatabaseOperation[]> {
    const filteredOperations: DatabaseOperation[] = [];
    
    for (const operation of operations) {
      let shouldSkip = false;
      
      switch (operation.type) {
        case 'create_table':
          // Check if table already exists
          const tableNameMatch = operation.description.match(/table\s+(\w+)/i);
          if (tableNameMatch) {
            const tableName = tableNameMatch[1];
            if (projectContext.systemState?.database.connectedTables.includes(tableName)) {
              this.logger.info(`Skipping table creation for '${tableName}' - already exists`);
              shouldSkip = true;
            }
          }
          break;
          
        case 'create_api':
          // Check if API route already exists
          for (const file of operation.files) {
            const apiPath = this.filePathToAPIPath(file);
            if (projectContext.systemState?.api.implementedRoutes.includes(apiPath)) {
              this.logger.info(`Skipping API creation for '${apiPath}' - already exists`);
              shouldSkip = true;
              break;
            }
          }
          break;
          
        case 'update_component':
          // Check if component already uses database
          for (const file of operation.files) {
            if (projectContext.systemState?.components.usingDatabase.includes(file)) {
              this.logger.info(`Skipping component update for '${file}' - already uses database`);
              shouldSkip = true;
              break;
            }
          }
          break;
          
        case 'install_dependency':
          // Check if dependency already installed
          if (operation.dependencies) {
            const newDependencies = operation.dependencies.filter(dep => 
              !projectContext.dependencies.includes(dep)
            );
            if (newDependencies.length === 0) {
              this.logger.info(`Skipping dependency installation - all dependencies already installed`);
              shouldSkip = true;
            } else {
              // Update operation to only install new dependencies
              operation.dependencies = newDependencies;
            }
          }
          break;
          
        case 'run_migration':
          // Check if migration files already executed
          const newMigrationFiles = operation.files.filter(file => {
            const filename = file.split('/').pop() || file;
            return !projectContext.systemState?.database.executedMigrations.includes(filename);
          });
          
          if (newMigrationFiles.length === 0) {
            this.logger.info(`Skipping migration execution - all migrations already executed`);
            shouldSkip = true;
          } else {
            // Update operation to only run new migrations
            operation.files = newMigrationFiles;
          }
          break;
      }
      
      if (!shouldSkip) {
        filteredOperations.push(operation);
      }
    }
    
    return filteredOperations;
  }

  // Convert file path to API path
  private filePathToAPIPath(filePath: string): string {
    // Convert src/app/api/route-name/route.ts to /api/route-name
    const apiMatch = filePath.match(/src\/app\/api\/([^\/]+)/);
    if (apiMatch) {
      return `/api/${apiMatch[1]}`;
    }
    
    // Convert pages/api/route-name.ts to /api/route-name
    const pagesMatch = filePath.match(/pages\/api\/(.+)\.ts$/);
    if (pagesMatch) {
      return `/api/${pagesMatch[1]}`;
    }
    
    return filePath;
  }

  // Record operation in history
  private async recordOperation(operationId: string, operation: DatabaseOperation, success: boolean, projectContext: ProjectContext): Promise<void> {
    // Map operation type to history type (filtering to only supported types)
    const supportedTypes = ['create_table', 'create_api', 'update_component', 'run_migration'];
    const operationType = supportedTypes.includes(operation.type) ? operation.type as 'create_table' | 'create_api' | 'update_component' | 'run_migration' : 'run_migration';
    
    const historyEntry: OperationHistory = {
      operationId,
      type: operationType,
      description: operation.description,
      targetFiles: operation.files,
      success,
      executedAt: new Date(),
      rollbackAvailable: success && ['create_table', 'run_migration'].includes(operation.type),
      metadata: {
        dependencies: operation.dependencies,
        tableSchema: operation.tableSchema,
        apiEndpoints: operation.apiEndpoints
      }
    };

    // Save to project analyzer (which handles the history file)
    const projectAnalyzer = new (await import('./project-analyzer')).ProjectAnalyzer(projectContext.projectRoot);
    await projectAnalyzer.saveOperationHistory(historyEntry);
  }

  // Helper method to get current status
  getStatus(): string {
    return 'Database Agent Ready';
  }

  // Helper method to cancel current operation
  async cancelOperation(): Promise<void> {
    this.logger.warn('Cancelling current operation...');
    await this.fileManager.rollbackOperations();
    this.logger.success('Operation cancelled and changes rolled back');
  }
} 