import { Logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';
import { ProjectContext, ImplementedFeature, OperationHistory } from './project-analyzer';
import { AIClient } from '../utils/ai-client';
import { CodeGenerator } from './code-generator';
import { MigrationExecutor, MigrationResult } from '../utils/migration-executor';
import { StateAnalyzer } from '../utils/state-analyzer';
import { IdempotentSQLGenerator } from '../utils/idempotent-sql-generator';
import { ComponentDataExtractor, DataArray } from '../utils/component-data-extractor';

export interface DatabaseOperation {
  type: 'create_table' | 'create_api' | 'install_dependency' | 'run_migration' | 'create_types' | 'create_hooks';
  description: string;
  files: string[];
  dependencies?: string[];
  tableSchema?: any;
  apiEndpoints?: string[];
  dataPopulation?: {
    arrayName: string;
    recordCount: number;
    sourceFile: string;
  };
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
  private componentDataExtractor: ComponentDataExtractor;

  constructor() {
    this.logger = new Logger();
    this.fileManager = new FileManager();
    this.aiClient = new AIClient();
    this.codeGenerator = new CodeGenerator();
    this.migrationExecutor = new MigrationExecutor();
    this.stateAnalyzer = new StateAnalyzer();
    this.sqlGenerator = new IdempotentSQLGenerator();
    this.componentDataExtractor = new ComponentDataExtractor();
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
    this.logger.analyzing('Checking for existing features...');
    
    const queryLower = query.toLowerCase();
    
    // Check if tables already exist
    const existingTables = projectContext.systemState?.database.connectedTables || [];
    const suggestedTable = this.extractTableName(query);
    
    if (existingTables.includes(suggestedTable)) {
      return {
        exists: true,
        feature: `Table: ${suggestedTable}`,
        message: `The table '${suggestedTable}' already exists in your database. Consider updating the table structure or adding new columns instead.`,
        suggestedOperations: []
      };
    }
    
    // Check if API routes already exist
    const existingRoutes = projectContext.systemState?.api.implementedRoutes || [];
    const suggestedRoute = `/api/${suggestedTable}`;
    
    if (existingRoutes.includes(suggestedRoute)) {
      return {
        exists: true,
        feature: `API Route: ${suggestedRoute}`,
        message: `The API route '${suggestedRoute}' already exists. Consider extending it with new endpoints instead.`,
        suggestedOperations: []
      };
    }
    
    // Check implemented features
    const implementedFeatures = projectContext.implementedFeatures || [];
    const relatedFeature = implementedFeatures.find(f => 
      f.name.toLowerCase().includes(queryLower) || 
      queryLower.includes(f.name.toLowerCase())
    );
    
    if (relatedFeature && relatedFeature.implemented) {
      return {
        exists: true,
        feature: relatedFeature.name,
        message: `The feature '${relatedFeature.name}' is already implemented. Tables: ${relatedFeature.tables.join(', ')}, APIs: ${relatedFeature.apis.join(', ')}`,
        suggestedOperations: []
      };
    }
    
    return {
      exists: false,
      message: 'No existing features found. Proceeding with implementation.',
      suggestedOperations: []
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

    // NEW: Check for available data arrays that match the query
    const matchedDataArray = await this.componentDataExtractor.matchQueryToDataArray(query);
    let dataPopulationInfo = '';
    
    if (matchedDataArray) {
      dataPopulationInfo = `\n\n## 🎵 Data Population Available:
- Matched data array: ${matchedDataArray.name}
- Source file: ${matchedDataArray.filePath}
- Records available: ${matchedDataArray.totalRecords}
- Sample data: ${matchedDataArray.data[0]?.title || 'N/A'}
- Schema: ${Object.keys(matchedDataArray.schema).join(', ')}

This data will be automatically populated into the created table!`;
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

    ## AUTOMATIC DATA POPULATION:
    🎯 **NEW FEATURE**: The system can now automatically populate tables with realistic data from React components!
    
    Available data arrays:
    - recentlyPlayed: 6 records (Liked Songs, Discover Weekly, Release Radar, etc.)
    - madeForYou: 6 records (Discover Weekly, Release Radar, Daily Mix 1-3, On Repeat)
    - popularAlbums: 8 records (Midnights, Harry's House, Renaissance, etc.)
    
    When creating tables that match these patterns, the system will automatically:
    1. Extract the corresponding data array from React components
    2. Transform the data to match the database schema
    3. Generate idempotent INSERT statements
    4. Include the populated data in the migration file
    
    ${dataPopulationInfo}

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
    4. Creating necessary API endpoints for data access
    5. 🎵 **NEW**: Automatically incorporating data population from React components when available

    ## Response Format:
    You MUST return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.
    The JSON must contain exactly these fields:
    - analysis: string (detailed analysis of what needs to be done, including data population info)
    - operations: array of objects with type, description, files, and dependencies
    - estimatedTime: number (seconds)
    - requirements: array of strings (what needs to be installed/configured)
    
    CRITICAL: Return ONLY the JSON object. Do not include any text before or after the JSON.

    ## Available Operation Types:
    - create_table: Create database table with schema (now includes automatic data population!)
    - create_api: Create API endpoints
    - install_dependency: Install npm packages
    - run_migration: Run database migrations
    - create_types: Generate TypeScript types
    - create_hooks: Create custom React hooks

    ## IMPORTANT: Component Integration Policy
    - DO NOT suggest update_component operations
    - Focus on database and API layer only
    - Component integration will be handled separately in future development phases
    - Preserve existing React components unchanged

    ## Important Notes:
    - Create proper TypeScript types for all database operations
    - Include error handling and loading states in API endpoints
    - Follow Next.js 13+ app directory conventions
    - 🎵 **NEW**: When creating tables, mention if automatic data population is available
    - 🎵 **NEW**: Include realistic record counts when data population is available
    - Component updates will be handled in a separate development phase`;

    const userPrompt = `Query: "${query}"

    Please analyze this query and create a comprehensive execution plan. Pay special attention to:
    1. Whether this matches any of the available data arrays for automatic population
    2. What database tables need to be created
    3. What API endpoints are needed
    4. How the data will flow from React components to database to API
    5. What TypeScript types and hooks might be needed

    ${matchedDataArray ? `\n🎵 AUTOMATIC DATA POPULATION DETECTED:
    - Data array: ${matchedDataArray.name}
    - Records: ${matchedDataArray.totalRecords}
    - Source: ${matchedDataArray.filePath}
    - This data will be automatically populated into the table!` : ''}

    IMPORTANT: Do not suggest component updates - focus only on database and API layer.

    Remember: Return ONLY the JSON object, no other text.`;

    try {
      const response = await this.aiClient.generateText(systemPrompt, userPrompt);
      const plan = JSON.parse(response) as QueryPlan;
      
      // Enhance operations with data population info
      if (matchedDataArray) {
        plan.operations = plan.operations.map(op => {
          if (op.type === 'create_table') {
            op.dataPopulation = {
              arrayName: matchedDataArray.name,
              recordCount: matchedDataArray.totalRecords,
              sourceFile: matchedDataArray.filePath
            };
          }
          return op;
        });
      }
      
      return plan;
    } catch (error) {
      this.logger.error('Failed to parse AI response as JSON');
      throw new Error('Invalid AI response format');
    }
  }

  private async validateRequirements(requirements: string[], projectContext: ProjectContext): Promise<void> {
    this.logger.analyzing('Validating requirements...');
    
    for (const requirement of requirements) {
      if (requirement.includes('supabase') && !projectContext.supabaseConfigured) {
        this.logger.warn(`Requirement not met: ${requirement}`);
        this.logger.info('Please configure Supabase in your .env.local file');
      }
      
      if (requirement.includes('dependency') && !projectContext.dependencies.includes(requirement)) {
        this.logger.warn(`Dependency not installed: ${requirement}`);
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
    this.logger.generating('Creating database table with automatic data population...');

    try {
      // Initialize the SQL generator
      await this.sqlGenerator.initialize();

      // Extract table name and columns from the operation
      const tableName = this.extractTableName(operation.description);
      const columns = this.extractColumns(operation, projectContext);

      // 🎵 DEBUG: Log extracted information
      this.logger.info(`🔍 DEBUG - Operation description: "${operation.description}"`);
      this.logger.info(`🔍 DEBUG - Extracted table name: "${tableName}"`);
      this.logger.info(`🔍 DEBUG - Extracted columns: ${columns.map(col => col.name).join(', ')}`);

      // 🎵 NEW: Check for automatic data population
      let seedData: any[] = [];
      let populationInfo = '';
      
      if (operation.dataPopulation) {
        this.logger.info(`🎵 Automatic data population detected: ${operation.dataPopulation.arrayName}`);
        
        // Extract data from React components
        const dataArray = await this.componentDataExtractor.matchQueryToDataArray(operation.description);
        
        if (dataArray) {
          // Transform data for database
          const transformedData = await this.componentDataExtractor.transformDataForDatabase(dataArray, tableName);
          seedData = transformedData;
          
          populationInfo = `\n-- 🎵 AUTO-POPULATED DATA FROM REACT COMPONENTS
-- Source: ${dataArray.filePath}
-- Array: ${dataArray.name}
-- Records: ${seedData.length}
-- Transformed for table: ${tableName}

`;
          
          this.logger.success(`✅ Prepared ${seedData.length} records from ${dataArray.name} for automatic population`);
        }
      }

      // Generate idempotent SQL using the specialized generator
      const sqlCode = await this.sqlGenerator.generateIdempotentTableSQL(
        operation.description,
        tableName,
        columns,
        {
          includeIndexes: true,
          includePolicies: true,
          includeSeedData: seedData.length > 0,
          existingTables: projectContext.systemState?.database.connectedTables || []
        }
      );

      // 🎵 NEW: Add seed data if available
      let enhancedSQLCode = sqlCode;
      if (seedData.length > 0) {
        const seedDataSQL = await this.sqlGenerator.generateIdempotentSeedData(tableName, seedData);
        enhancedSQLCode = populationInfo + sqlCode + '\n\n' + seedDataSQL;
      }

      // Validate the SQL is idempotent
      const validation = this.sqlGenerator.validateIdempotency(enhancedSQLCode);
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
      
      await this.fileManager.createFile(migrationFile, enhancedSQLCode);
      
      // Add the migration file to the operation for tracking
      operation.files.push(migrationFile);
      
      if (seedData.length > 0) {
        this.logger.success(`🎉 Created migration file with ${seedData.length} auto-populated records: ${migrationFile}`);
      } else {
        this.logger.success(`Created idempotent migration file: ${migrationFile}`);
      }
      
    } catch (error) {
      this.logger.error(`Failed to create table migration: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Helper method to extract table name from operation description
  private extractTableName(description: string): string {
    // First check for common Spotify table names
    if (description.toLowerCase().includes('recently played')) return 'recently_played';
    if (description.toLowerCase().includes('made for you')) return 'made_for_you';
    if (description.toLowerCase().includes('popular albums')) return 'popular_albums';
    if (description.toLowerCase().includes('playlist')) return 'user_playlists';
    if (description.toLowerCase().includes('search')) return 'search_history';
    
    // Look for patterns like "create table_name table" or "table called table_name"
    const patterns = [
      /create\s+(?:a\s+)?table\s+(?:called\s+|named\s+)?['""]?(\w+)['""]?/i,
      /create\s+['""]?(\w+)['""]?\s+table/i,
      /table\s+(?:called\s+|named\s+)?['""]?(\w+)['""]?/i,
      /store.*?in\s+(?:a\s+)?table\s+(?:called\s+|named\s+)?['""]?(\w+)['""]?/i,
      /['""](\w+)['""]?\s+table/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1] && !['a', 'an', 'the', 'in', 'table'].includes(match[1].toLowerCase())) {
        return match[1].toLowerCase();
      }
    }
    
    // Default fallback - clean up the description
    return description
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .split(/\s+/)
      .slice(0, 3) // Take first 3 words
      .join('_')
      .toLowerCase();
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
    
    // 🔍 ENHANCED DEBUG: Log the matching process
    this.logger.info(`🔍 DEBUG - Analyzing description: "${description}"`);
    this.logger.info(`🔍 DEBUG - Checking patterns:`);
    this.logger.info(`  - recently played: ${description.includes('recently played')}`);
    this.logger.info(`  - songs: ${description.includes('songs')}`);
    this.logger.info(`  - made for you: ${description.includes('made for you')}`);
    this.logger.info(`  - popular albums: ${description.includes('popular albums')}`);
    this.logger.info(`  - playlist: ${description.includes('playlist')}`);
    this.logger.info(`  - search: ${description.includes('search')}`);
    
    if (description.includes('recently played') || description.includes('songs')) {
      this.logger.info(`🔍 DEBUG - MATCHED: recently played/songs pattern`);
      columns.push(
        { name: 'title', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'artist', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'album', type: 'TEXT', default: '' },
        { name: 'image', type: 'TEXT', default: '' },
        { name: 'duration', type: 'INTEGER', default: '' }
      );
    } else if (description.includes('made for you')) {
      this.logger.info(`🔍 DEBUG - MATCHED: made for you pattern`);
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'playlist_id', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'title', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'description', type: 'TEXT', default: '' },
        { name: 'image', type: 'TEXT', default: '' },
        { name: 'playlist_type', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'duration', type: 'INTEGER', default: '' }
      );
    } else if (description.includes('popular albums')) {
      this.logger.info(`🔍 DEBUG - MATCHED: popular albums pattern`);
      columns.push(
        { name: 'album_id', type: 'TEXT', constraints: 'NOT NULL UNIQUE', default: '' },
        { name: 'title', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'artist', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'image', type: 'TEXT', default: '' },
        { name: 'duration', type: 'INTEGER', default: '' },
        { name: 'popularity_score', type: 'INTEGER', default: '' }
      );
    } else if (description.includes('playlist')) {
      this.logger.info(`🔍 DEBUG - MATCHED: playlist pattern`);
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'name', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'description', type: 'TEXT', default: '' },
        { name: 'is_public', type: 'BOOLEAN', default: 'false' },
        { name: 'image', type: 'TEXT', default: '' },
        { name: 'track_count', type: 'INTEGER', default: '0' }
      );
    } else if (description.includes('search')) {
      this.logger.info(`🔍 DEBUG - MATCHED: search pattern`);
      columns.push(
        { name: 'user_id', type: 'UUID', constraints: 'NOT NULL', default: '' },
        { name: 'query', type: 'TEXT', constraints: 'NOT NULL', default: '' },
        { name: 'result_count', type: 'INTEGER', default: '0' },
        { name: 'searched_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' }
      );
    } else {
      this.logger.info(`🔍 DEBUG - NO PATTERN MATCHED - only basic columns will be added`);
    }

    this.logger.info(`🔍 DEBUG - Final columns: ${columns.map(col => col.name).join(', ')}`);
    return columns;
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

  // NOTE: Component updates have been moved to a separate development phase
  // This method is commented out but preserved for future implementation
  /*
  private async executeUpdateComponent(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Updating React components...');

    for (const file of operation.files) {
      const componentPrompt = `Update React component for: ${operation.description}

      ## File: ${file}

      ## Context:
      - Existing components: ${projectContext.components.map(c => c.name).join(', ')}
      - Database tables: ${projectContext.databaseTables.join(', ') || 'none'}
      - Available APIs: ${projectContext.existingAPIs.map(api => api.path).join(', ')}

      ## Requirements:
      - Replace hardcoded data with database fetching
      - Use React hooks for state management
      - Add loading states
      - Include error handling
      - Use TypeScript properly
      - Maintain existing UI/UX
      - Add proper TypeScript types

      ## Response Format:
      Return only the TypeScript/React code for the component, no explanations or markdown formatting.`;

      const componentCode = await this.aiClient.generateText(componentPrompt, operation.description);
      
      await this.fileManager.createFile(file, componentCode);
      this.logger.success(`Updated component: ${file}`);
    }
  }
  */

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
    - Database tables: ${projectContext.databaseTables.join(', ') || 'none'}
    - Available APIs: ${projectContext.existingAPIs.map(api => api.path).join(', ')}

    ## Requirements:
    - Create reusable React hooks
    - Include proper state management
    - Add error handling
    - Include loading states
    - Use TypeScript properly
    - Follow React hooks best practices

    ## Response Format:
    Return only the TypeScript code for the hooks, no explanations or markdown formatting.`;

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
      
      // 🎵 NEW: Log data population info
      const totalTablesCreated = successful.reduce((sum, result) => {
        return sum + (result.tablesCreated?.length || 0);
      }, 0);
      
      if (totalTablesCreated > 0) {
        this.logger.success(`🎉 Successfully created ${totalTablesCreated} table(s) with automatic data population!`);
      }
      
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
          
        default:
          // Don't skip other operation types
          break;
      }
      
      if (!shouldSkip) {
        filteredOperations.push(operation);
      }
    }
    
    return filteredOperations;
  }

  // Helper method to convert file path to API path
  private filePathToAPIPath(filePath: string): string {
    // Convert src/app/api/recently-played/route.ts to /api/recently-played
    const match = filePath.match(/src\/app\/api\/(.+)\/route\.ts$/);
    if (match) {
      return `/api/${match[1]}`;
    }
    return filePath;
  }

  // Helper method to record operations for history tracking
  private async recordOperation(
    operationId: string,
    operation: DatabaseOperation,
    success: boolean,
    projectContext: ProjectContext
  ): Promise<void> {
    // Map operation type to supported history types
    const mapOperationType = (type: string): 'create_table' | 'create_api' | 'run_migration' => {
      switch (type) {
        case 'create_table':
          return 'create_table';
        case 'create_api':
          return 'create_api';
        case 'run_migration':
          return 'run_migration';
        case 'install_dependency':
        case 'create_types':
        case 'create_hooks':
        default:
          return 'run_migration'; // Default fallback
      }
    };

    // Create operation record
    const operationRecord: OperationHistory = {
      operationId,
      type: mapOperationType(operation.type),
      description: operation.description,
      targetFiles: operation.files,
      success,
      executedAt: new Date(),
      rollbackAvailable: success && operation.type !== 'run_migration',
      metadata: {
        dependencies: operation.dependencies || [],
        dataPopulation: operation.dataPopulation
      }
    };

    // Add to project context
    if (!projectContext.operationHistory) {
      projectContext.operationHistory = [];
    }
    projectContext.operationHistory.push(operationRecord);

    // Log operation
    if (success) {
      this.logger.success(`✅ ${operation.description}`);
    } else {
      this.logger.error(`❌ ${operation.description}`);
    }
  }
} 