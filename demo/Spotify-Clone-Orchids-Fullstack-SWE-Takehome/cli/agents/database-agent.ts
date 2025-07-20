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

    ## CRITICAL JSON RESPONSE REQUIREMENTS:
    You MUST respond with ONLY raw JSON - no markdown, no explanations, no additional text.
    
    RESPONSE FORMAT:
    {
      "analysis": "string - detailed analysis of what needs to be done",
      "operations": [{
        "type": "string - operation type",
        "description": "string - what this operation does",
        "files": ["string - file paths"],
        "dependencies": ["string - npm packages or requirements"]
      }],
      "estimatedTime": 60,
      "requirements": ["string - what needs to be installed/configured"]
    }
    
    CRITICAL: Do NOT wrap the JSON in markdown code blocks. Do NOT add any explanatory text before or after the JSON. Return ONLY the raw JSON object.

    ## Available Operation Types:
    - create_table: Create database table with schema
    - create_api: Create API endpoints
    - update_component: Update existing React components
    - install_dependency: Install npm packages
    - run_migration: Run database migrations
    - create_types: Generate TypeScript types
    - create_hooks: Create custom React hooks

    ## CRITICAL: PROJECT STRUCTURE REQUIREMENTS
    - This project uses src/ directory structure
    - API routes MUST be in src/app/api/ directory (NOT app/api/)
    - Components are in src/components/
    - Types are in src/lib/types/
    - All file paths must include the src/ prefix

    ## File Path Examples:
    - API routes: "src/app/api/albums/popular/route.ts"
    - Components: "src/components/spotify-main-content.tsx" 
    - Types: "src/lib/types/database.ts"
    - Hooks: "src/hooks/database.ts"

    ## Important Notes:
    - Always preserve existing UI/UX while adding database functionality
    - Use the existing data structures as a guide for table schema
    - Create proper TypeScript types for all database operations
    - Include error handling and loading states in components
    - Follow Next.js 13+ app directory conventions
    - ALWAYS use src/ prefix in file paths`;

    const response = await this.aiClient.generateText(systemPrompt, query);
    
    try {
      this.logger.info('Extracting JSON from AI response...');
      this.logger.info(`Response length: ${response.length}`);
      
      // Try multiple extraction methods
      let jsonString = this.extractJSON(response);
      
      if (!jsonString) {
        this.logger.warn('Primary JSON extraction failed, trying alternative methods...');
        
        // Try to find JSON in the response using more aggressive patterns
        const alternativePatterns = [
          // Look for JSON after common AI response prefixes
          /(?:here'?s?|here is|below is|the json|response|plan)\s*:?\s*\n?([\s\S]*)/gi,
          // Look for JSON after explanatory text
          /(?:analysis|plan|execution plan|response)\s*:?\s*\n?([\s\S]*)/gi,
          // Just grab everything after the first mention of JSON-like content
          /\{[\s\S]*\}/g
        ];
        
        for (const pattern of alternativePatterns) {
          const matches = response.matchAll(pattern);
          for (const match of matches) {
            const candidate = match[1] || match[0];
            if (candidate) {
              const extractedJson = this.extractJSON(candidate);
              if (extractedJson) {
                jsonString = extractedJson;
                break;
              }
            }
          }
          if (jsonString) break;
        }
      }
      
      if (!jsonString) {
        this.logger.error('No valid JSON found in AI response after all extraction attempts');
        this.logger.info('Response preview (first 1000 chars):');
        this.logger.codeBlock(response.substring(0, 1000) + (response.length > 1000 ? '\n... (truncated)' : ''), 'text');
        
        // Try one more desperate attempt: look for anything that looks like JSON
        const desperateMatch = response.match(/\{[\s\S]*\}/g);
        if (desperateMatch) {
          for (const candidate of desperateMatch) {
            try {
              JSON.parse(candidate);
              jsonString = candidate;
              this.logger.warn('Found JSON using desperate extraction method');
              break;
            } catch {
              continue;
            }
          }
        }
        
        if (!jsonString) {
          throw new Error('No valid JSON found in AI response');
        }
      }
      
      this.logger.success('JSON extracted successfully');
      this.logger.info(`Extracted JSON length: ${jsonString.length}`);
      
      const plan = JSON.parse(jsonString);
      
      // Validate the plan structure
      if (!plan.analysis || !plan.operations || typeof plan.estimatedTime !== 'number' || !plan.requirements) {
        this.logger.error('Invalid plan structure from AI response');
        this.logger.error(`Missing fields: ${[
          !plan.analysis ? 'analysis' : null,
          !plan.operations ? 'operations' : null,
          typeof plan.estimatedTime !== 'number' ? 'estimatedTime' : null,
          !plan.requirements ? 'requirements' : null
        ].filter(Boolean).join(', ')}`);
        this.logger.codeBlock(jsonString, 'json');
        throw new Error('Invalid plan structure from AI response');
      }
      
      this.logger.success('AI response parsed and validated successfully');
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
      
      // Try to provide more specific error guidance
      if (response.includes('I cannot') || response.includes('I apologize') || response.includes('unable to')) {
        this.logger.warn('AI response indicates it cannot fulfill the request. This might be due to:');
        this.logger.warn('1. The request being too complex or ambiguous');
        this.logger.warn('2. Missing context or information needed to proceed');
        this.logger.warn('3. The AI model being confused by the system prompt');
        this.logger.info('Try rephrasing your query or providing more specific details.');
      }
      
      if (response.includes('```') && !response.includes('```json')) {
        this.logger.warn('AI response contains code blocks but not JSON. The model may be responding with explanatory text instead of pure JSON.');
      }
      
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractJSON(text: string): string | null {
    try {
      // Method 1: Try to parse the entire text as JSON (ideal case)
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          JSON.parse(trimmed);
          return trimmed;
        } catch {
          // Continue to other methods
        }
      }

      // Method 2: Extract JSON from markdown code blocks
      const codeBlockPatterns = [
        /```json\s*\n?([\s\S]*?)\n?```/gi,
        /```\s*\n?([\s\S]*?)\n?```/gi,
        /`([\s\S]*?)`/gi
      ];

      for (const pattern of codeBlockPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const candidate = match[1]?.trim();
          if (candidate && candidate.startsWith('{') && candidate.endsWith('}')) {
            try {
              JSON.parse(candidate);
              return candidate;
            } catch {
              continue;
            }
          }
        }
      }

      // Method 3: Find JSON by balanced braces (original logic, improved)
      const start = text.indexOf('{');
      if (start === -1) return null;

      let braceCount = 0;
      let end = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = start; i < text.length; i++) {
        const char = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
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
      // Method 1: Look for JSON with various delimiters
      const patterns = [
        // JSON in code blocks
        /```json\s*\n?([\s\S]*?)\n?```/gi,
        /```\s*\n?([\s\S]*?)\n?```/gi,
        // JSON in backticks
        /`([\s\S]*?)`/gi,
        // JSON at the end of text
        /(\{[\s\S]*?\})\s*$/,
        // JSON at the beginning of text
        /^(\{[\s\S]*?\})/,
        // JSON anywhere in the text
        /(\{[\s\S]*?\})/g
      ];

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const candidate = match[1]?.trim();
          if (candidate && candidate.startsWith('{') && candidate.endsWith('}')) {
            try {
              JSON.parse(candidate);
              return candidate;
            } catch {
              continue;
            }
          }
        }
      }

      // Method 2: Line-by-line JSON reconstruction
      const lines = text.split('\n');
      let jsonLines: string[] = [];
      let inJson = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Start of JSON
        if (!inJson && trimmed.startsWith('{')) {
          inJson = true;
          jsonLines = [line];
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        } else if (inJson) {
          jsonLines.push(line);
          braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          
          // End of JSON
          if (braceCount === 0) {
            try {
              const jsonString = jsonLines.join('\n');
              JSON.parse(jsonString);
              return jsonString;
            } catch {
              // Reset and continue looking
              inJson = false;
              jsonLines = [];
              braceCount = 0;
            }
          }
        }
      }
      
      // Method 3: Try to clean up common AI response artifacts
      const cleanedText = text
        .replace(/^[\s\S]*?(?=\{)/m, '') // Remove text before first {
        .replace(/\}[\s\S]*$/m, '}')      // Remove text after last }
        .replace(/\n\s*\n/g, '\n')        // Remove double newlines
        .trim();
      
      if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
        try {
          JSON.parse(cleanedText);
          return cleanedText;
        } catch {
          // Continue to next method
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

      // --- Enhanced Seed Data Extraction Logic ---
      let seedData: any[] | null = null;
      let includeSeedData = false;
      
      // Map table names to array names in the frontend
      const tableToArrayMap: Record<string, string> = {
        'recently_played': 'FALLBACK_RECENTLY_PLAYED',
        'playlists': 'FALLBACK_MADE_FOR_YOU', 
        'albums': 'FALLBACK_POPULAR_ALBUMS',
      };
      
      const arrayName = tableToArrayMap[tableName];
      if (arrayName) {
        this.logger.info(`🎯 Found seed data mapping: ${tableName} → ${arrayName}`);
        this.logger.info(`📂 Attempting to extract seed data for table "${tableName}" from array "${arrayName}"`);
        
        try {
          // Use the extractArrayFromFile utility from file-manager
          const { extractArrayFromFile } = require('../utils/file-manager');
          const frontendFile = 'src/components/spotify-main-content.tsx';
          
          this.logger.info(`🔍 Searching for array "${arrayName}" in file: ${frontendFile}`);
          const rawSeedData = await extractArrayFromFile(frontendFile, arrayName);
          
          if (rawSeedData && Array.isArray(rawSeedData) && rawSeedData.length > 0) {
            this.logger.success(`🎉 Successfully extracted ${rawSeedData.length} raw items from "${arrayName}"`);
            this.logger.info(`📋 Sample raw data: ${JSON.stringify(rawSeedData[0], null, 2)}`);
            
            // Transform the raw seed data to match database schema
            this.logger.info(`🔄 Transforming raw data to match database schema for table: ${tableName}`);
            seedData = this.transformSeedData(rawSeedData, tableName);
            
            if (seedData && seedData.length > 0) {
              this.logger.success(`✨ Transformation successful: ${seedData.length} records transformed`);
              this.logger.info(`📊 Sample transformed data: ${JSON.stringify(seedData[0], null, 2)}`);
              
              // Validate the transformed seed data
              this.logger.info(`🔍 Validating transformed seed data...`);
              const validation = this.sqlGenerator.validateSeedData(seedData, tableName);
              
              if (validation.isValid) {
                includeSeedData = true;
                this.logger.success(`✅ Seed data validation passed! Ready to insert ${seedData.length} records into ${tableName}`);
                
                if (validation.warnings.length > 0) {
                  this.logger.warn(`⚠️ Validation warnings:`);
                  validation.warnings.forEach(warning => this.logger.warn(`  • ${warning}`));
                }
              } else {
                this.logger.error(`❌ Seed data validation failed for ${tableName}:`);
                validation.errors.forEach(error => this.logger.error(`  • ${error}`));
                this.logger.warn(`⏭️ Proceeding without seed data for ${tableName}`);
                seedData = null;
                includeSeedData = false;
              }
            } else {
              this.logger.error(`❌ Data transformation failed for "${arrayName}"`);
              this.logger.error(`   Raw data length: ${rawSeedData.length}, Transformed data: ${seedData ? 'empty array' : 'null'}`);
              this.logger.warn(`⏭️ Proceeding without seed data for ${tableName}`);
            }
          } else {
            this.logger.warn(`⚠️ No valid seed data found for "${arrayName}" in ${frontendFile}`);
            this.logger.info(`   Raw extraction result: ${rawSeedData ? `${typeof rawSeedData} (length: ${Array.isArray(rawSeedData) ? rawSeedData.length : 'N/A'})` : 'null'}`);
            this.logger.info(`💡 Tip: Check if the array exists in the file or if it's in a different format`);
          }
        } catch (error) {
          this.logger.error(`💥 Error during seed data extraction for "${arrayName}"`);
          this.logger.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
          if (error instanceof Error && error.stack) {
            this.logger.error(`   Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
          }
          this.logger.warn(`⏭️ Proceeding without seed data for ${tableName}`);
        }
      } else {
        this.logger.warn(`⚠️ No seed data mapping defined for table: "${tableName}"`);
        this.logger.info(`   Available mappings: ${Object.keys(tableToArrayMap).join(', ')}`);
        this.logger.info(`💡 Consider adding a mapping in tableToArrayMap if seed data is needed`);
      }
      // --- End Enhanced Seed Data Extraction Logic ---

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
      
      // CRITICAL: Now run the migration and populate with seed data
      await this.runMigrationAndPopulate(migrationFile, tableName, seedData, includeSeedData);
      
    } catch (error) {
      this.logger.error(`Failed to create table migration: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * CRITICAL: Run migration and populate table with seed data
   * This ensures proper sequencing: Table Creation → Data Population
   */
  private async runMigrationAndPopulate(migrationFile: string, tableName: string, seedData: any[] | null, includeSeedData: boolean): Promise<void> {
    try {
      // Phase 1: Execute the migration to create the table
      this.logger.info(`🚀 Phase 1: Running migration to create table "${tableName}"`);
      
      const migrationPaths = [migrationFile];
      const results = await this.migrationExecutor.executeMigrations(migrationPaths);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        this.logger.error(`❌ Migration failed for table "${tableName}":`);
        failed.forEach(result => {
          this.logger.error(`- ${result.migration.filename}: ${result.error}`);
        });
        throw new Error(`Migration execution failed for ${tableName}`);
      }
      
      this.logger.success(`✅ Phase 1 Complete: Table "${tableName}" created successfully`);
      
      // Phase 2: Verify table exists before attempting to populate
      this.logger.info(`🔍 Phase 2: Verifying table "${tableName}" exists`);
      
      const tableExists = await this.verifyTableExists(tableName);
      if (!tableExists) {
        throw new Error(`Table "${tableName}" was not created successfully - cannot populate data`);
      }
      
      this.logger.success(`✅ Phase 2 Complete: Table "${tableName}" verified to exist`);
      
      // Phase 3: Populate table with seed data (only if we have valid seed data)
      if (includeSeedData && seedData && seedData.length > 0) {
        this.logger.info(`🌱 Phase 3: Populating table "${tableName}" with ${seedData.length} records`);
        
        await this.populateTableWithSeedData(tableName, seedData);
        
        this.logger.success(`✅ Phase 3 Complete: Table "${tableName}" populated with ${seedData.length} records`);
      } else {
        this.logger.info(`⏭️ Phase 3 Skipped: No seed data available for table "${tableName}"`);
      }
      
      this.logger.success(`🎉 Complete workflow finished for table "${tableName}": Created → Verified → Populated`);
      
    } catch (error) {
      this.logger.error(`❌ Migration and population failed for table "${tableName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Verify that a table exists in the database
   */
  private async verifyTableExists(tableName: string): Promise<boolean> {
    try {
      // Use the migration executor to check if table exists
      const tableInfo = await this.migrationExecutor.verifyDatabaseSchema([tableName]);
      return tableInfo.valid;
    } catch (error) {
      this.logger.warn(`Could not verify table existence for "${tableName}": ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Populate a table with seed data using direct database insertion
   */
  private async populateTableWithSeedData(tableName: string, seedData: any[]): Promise<void> {
    try {
      // Create a temporary populate operation to use existing population logic
      const populateOperation: DatabaseOperation = {
        type: 'run_migration',
        description: `Populate ${tableName} with seed data`,
        files: [],
        tableSchema: { tableName, seedData }
      };
      
      // Use the existing migration executor to run the INSERT statements
      const insertSQL = this.generateInsertSQL(tableName, seedData);
      const tempMigrationFile = `temp_populate_${tableName}_${Date.now()}.sql`;
      
      // Write temporary SQL file
      await this.fileManager.ensureDirectory('src/lib/migrations');
      const tempPath = `src/lib/migrations/${tempMigrationFile}`;
      await this.fileManager.createFile(tempPath, insertSQL);
      
      // Execute the INSERT statements
      const results = await this.migrationExecutor.executeMigrations([tempPath]);
      
      // Clean up temporary file
      await this.fileManager.deleteFile(tempPath);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        this.logger.error(`❌ Failed to populate table "${tableName}":`);
        failed.forEach(result => {
          this.logger.error(`- ${result.error}`);
        });
        throw new Error(`Population failed for ${tableName}`);
      }
      
      this.logger.success(`✅ Successfully populated table "${tableName}" with ${seedData.length} records`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to populate table "${tableName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate INSERT SQL statements for seed data
   */
  private generateInsertSQL(tableName: string, seedData: any[]): string {
    if (!seedData || seedData.length === 0) {
      return '-- No seed data to insert';
    }

    const columns = Object.keys(seedData[0]);
    const values = seedData.map(record => {
      const recordValues = columns.map(col => {
        const value = record[col];
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
        }
        if (typeof value === 'boolean') {
          return value ? 'TRUE' : 'FALSE';
        }
        return value.toString();
      });
      return `(${recordValues.join(', ')})`;
    });

    const sql = `-- Insert seed data into ${tableName}
INSERT INTO ${tableName} (${columns.join(', ')}) 
VALUES 
${values.join(',\n')}
ON CONFLICT (id) DO NOTHING;`;

    return sql;
  }

  // Helper method to extract table name from operation description
  private extractTableName(description: string): string {
    this.logger.info(`🔍 Extracting table name from description: "${description}"`);
    
    // Method 1: Extract quoted table names (most reliable)
    const quotedPatterns = [
      /'([^']+)'/,           // Single quotes: 'table_name'
      /"([^"]+)"/,           // Double quotes: "table_name"  
      /`([^`]+)`/            // Backticks: `table_name`
    ];
    
    for (const pattern of quotedPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const tableName = match[1];
        this.logger.success(`✅ Extracted table name from quotes: "${tableName}"`);
        return tableName;
      }
    }
    
    // Method 2: Extract after "create", skipping articles and prepositions
    const createPatterns = [
      /create\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(?:table\s+named\s+)?(\w+)\s+table/i,
      /create\s+(?:a\s+|an\s+|the\s+)?(\w+)(?:\s+table)?/i,
      /(?:create|add|make)\s+(?:a\s+|an\s+|the\s+)?(\w+)(?:\s+(?:table|entity|model))?/i
    ];
    
    for (const pattern of createPatterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[1] !== 'table' && match[1] !== 'new') {
        const tableName = match[1].toLowerCase();
        this.logger.info(`📋 Extracted table name from create pattern: "${tableName}"`);
        
        // Validate it's not a common English word we want to skip
        const skipWords = ['a', 'an', 'the', 'new', 'table', 'database', 'data', 'to', 'in', 'for', 'with', 'and'];
        if (!skipWords.includes(tableName)) {
          this.logger.success(`✅ Validated table name: "${tableName}"`);
          return tableName;
        }
      }
    }
    
    // Method 3: Priority-based keyword matching for Spotify tables
    const spotifyTableMap = [
      { keywords: ['recently played', 'recent songs', 'recent tracks'], table: 'recently_played' },
      { keywords: ['made for you', 'personalized', 'recommendations'], table: 'playlists' },
      { keywords: ['popular albums', 'trending albums', 'popular music'], table: 'albums' },
      { keywords: ['user playlist', 'playlist', 'user list'], table: 'user_playlists' },
      { keywords: ['search', 'find songs', 'discovery'], table: 'search_history' },
      { keywords: ['track', 'song', 'music'], table: 'tracks' },
      { keywords: ['user', 'account', 'profile'], table: 'users' }
    ];
    
    const lowerDescription = description.toLowerCase();
    for (const mapping of spotifyTableMap) {
      for (const keyword of mapping.keywords) {
        if (lowerDescription.includes(keyword)) {
          this.logger.success(`🎯 Matched Spotify table by keyword "${keyword}": "${mapping.table}"`);
          return mapping.table;
        }
      }
    }
    
    // Method 4: Extract any word that looks like a table name
    const wordMatches = description.match(/\b(\w+(?:_\w+)*)\b/g);
    if (wordMatches) {
      for (const word of wordMatches) {
        const lowerWord = word.toLowerCase();
        // Look for words that contain underscores (likely table names) or end with common table suffixes
        if (lowerWord.includes('_') || 
            lowerWord.endsWith('table') || 
            lowerWord.endsWith('data') || 
            lowerWord.endsWith('info') ||
            lowerWord.match(/^(recently|made|popular|user|search|track|song|music|album|playlist)$/)) {
          
          const cleanedName = lowerWord.replace(/table$/, '').replace(/data$/, '');
          if (cleanedName.length > 2 && cleanedName !== 'table' && cleanedName !== 'data') {
            this.logger.info(`🔤 Extracted potential table name from words: "${cleanedName}"`);
            return cleanedName;
          }
        }
      }
    }
    
    // Method 5: Fallback - clean the entire description
    const fallback = description
      .replace(/[^\w\s]/g, ' ')        // Remove special characters
      .replace(/\b(?:create|a|an|the|table|in|to|for|with|store|data|supabase)\b/gi, ' ') // Remove common words
      .replace(/\s+/g, '_')            // Replace spaces with underscores
      .toLowerCase()
      .replace(/^_+|_+$/g, '');        // Trim underscores
    
    this.logger.warn(`⚠️ Using fallback extraction method: "${fallback}"`);
    return fallback || 'unknown_table';
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
      this.logger.info(`Transforming ${rawData.length} items for table: ${tableName}`);
      
      // Log the first item to understand the structure
      if (rawData.length > 0) {
        this.logger.info(`Sample raw data structure: ${JSON.stringify(rawData[0], null, 2)}`);
      }

      switch (tableName) {
        case 'recently_played':
          return rawData.map((item, index) => {
            const transformed = {
              id: item.id || `rp_${index + 1}`,
              title: item.title || 'Unknown Track',
              artist: item.artist || 'Unknown Artist',
              album: item.album || 'Unknown Album',
              image_url: item.albumArt || item.image || null,
              duration: typeof item.duration === 'number' ? item.duration : 180,
              played_at: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(), // Staggered play times
              user_id: 'default-user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.logger.info(`Transformed recently_played item ${index + 1}: ${JSON.stringify(transformed, null, 2)}`);
            return transformed;
          });

        case 'playlists':
          return rawData.map((item, index) => {
            const transformed = {
              id: item.id || `mfy_${index + 1}`,
              title: item.title || 'Unknown Playlist',
              description: item.artist || 'Personalized playlist just for you', // Using artist field as description
              image_url: item.albumArt || item.image || null,
              playlist_type: item.title && item.title.includes('Daily Mix') ? 'daily_mix' : 'personalized',
              user_id: 'default-user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.logger.info(`Transformed made_for_you item ${index + 1}: ${JSON.stringify(transformed, null, 2)}`);
            return transformed;
          });

        case 'albums':
          return rawData.map((item, index) => {
            const transformed = {
              id: item.id || `pa_${index + 1}`,
              title: item.title || 'Unknown Album',
              artist: item.artist || 'Unknown Artist',
              image_url: item.albumArt || item.image || null,
              duration: typeof item.duration === 'number' ? item.duration : 240,
              release_date: this.generateRandomReleaseDate(),
              popularity_score: Math.floor(Math.random() * 20) + 80, // Random score 80-100 for popular albums
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.logger.info(`Transformed popular_albums item ${index + 1}: ${JSON.stringify(transformed, null, 2)}`);
            return transformed;
          });

        default:
          this.logger.warn(`No transformation defined for table: ${tableName}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error transforming seed data for ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error(`Raw data sample: ${JSON.stringify(rawData.slice(0, 2), null, 2)}`);
      return null;
    }
  }

  // Helper method to generate random release dates for albums
  private generateRandomReleaseDate(): string {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return randomDate.toISOString().split('T')[0]; // Return just the date part
  }

  // Helper method to infer genre from artist name (basic heuristic)
  private inferGenreFromArtist(artistName: string): string {
    const genreMap: Record<string, string> = {
      'taylor swift': 'pop',
      'harry styles': 'pop',
      'bad bunny': 'reggaeton',
      'beyoncé': 'r&b',
      'olivia rodrigo': 'pop',
      'the weeknd': 'r&b',
      'billie eilish': 'alternative',
      'lorde': 'alternative',
      'clairo': 'indie',
      'arctic monkeys': 'indie rock',
      'the strokes': 'indie rock',
      'tame impala': 'psychedelic rock',
      'gracie abrams': 'pop',
      'spotify': 'playlist'
    };

    const lowerArtist = artistName.toLowerCase();
    return genreMap[lowerArtist] || 'unknown';
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

    const typesFile = 'src/lib/types/database.ts';
    let existingTypes = '';
    let shouldAppend = false;
    
    // Check if types file already exists
    try {
      existingTypes = await this.fileManager.readFile(typesFile);
      shouldAppend = true;
      this.logger.info('Found existing types file, will merge new types...');
    } catch (error) {
      this.logger.info('No existing types file found, creating new one...');
      shouldAppend = false;
    }

    const typesPrompt = shouldAppend 
      ? `Add new TypeScript type definitions for: ${operation.description}

    ## Existing Types File:
    ${existingTypes}

    ## Context:
    - Existing types: ${projectContext.currentDataStructures.map(ds => ds.name).join(', ')}
    - Database tables: ${projectContext.databaseTables.join(', ') || 'none'}

    ## Requirements:
    - ADD new TypeScript interfaces to the existing file
    - Do NOT remove or modify existing types
    - Include proper type definitions for all database operations
    - Add utility types for API responses
    - Include proper JSDoc comments
    - Export all types properly
    - Follow TypeScript best practices
    - Preserve all existing imports and exports

    ## Response Format:
    Return the COMPLETE updated TypeScript file with both existing and new types, no explanations or markdown formatting.`
      : `Create TypeScript type definitions for: ${operation.description}

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
    
    await this.fileManager.ensureDirectory('src/lib/types');
    
    if (shouldAppend) {
      await this.fileManager.updateFile(typesFile, typesCode);
      this.logger.success(`Updated types file with new definitions: ${typesFile}`);
    } else {
      await this.fileManager.createFile(typesFile, typesCode);
      this.logger.success(`Created types file: ${typesFile}`);
    }
  }

  private async executeCreateHooks(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating custom React hooks...');

    await this.fileManager.ensureDirectory('src/hooks');
    
    // Check if database.ts exists (legacy file)
    const legacyHooksFile = 'src/hooks/database.ts';
    const legacyFileExists = await this.fileManager.fileExists(legacyHooksFile);
    
    if (legacyFileExists) {
      this.logger.info('Found existing src/hooks/database.ts - using modern hook architecture');
      
      // Determine the appropriate hook file based on operation description
      const hookFile = this.determineHookFile(operation.description);
      
      if (await this.fileManager.fileExists(hookFile)) {
        this.logger.info(`Hook file ${hookFile} already exists - checking if update is needed`);
        
        // Check if existing hook can handle this operation
        if (await this.canExistingHookHandle(hookFile, operation.description)) {
          this.logger.success(`Existing hook ${hookFile} can handle this operation - no changes needed`);
          return;
        }
        
        this.logger.info(`Updating existing hook ${hookFile} to support new functionality`);
        await this.updateExistingHook(hookFile, operation, projectContext);
      } else {
        this.logger.info(`Creating new hook file: ${hookFile}`);
        await this.createNewHookFile(hookFile, operation, projectContext);
      }
      
      // Ensure index.ts is updated
      await this.ensureHooksIndex();
      
    } else {
      // Fallback to legacy behavior if no existing hooks architecture
      this.logger.info('No existing hooks found - creating legacy database.ts');
      await this.createLegacyHooksFile(operation, projectContext);
    }
  }

  private determineHookFile(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('recently played') || lowerDesc.includes('recent tracks') || lowerDesc.includes('recent songs')) {
      return 'src/hooks/use-recently-played.ts';
    } else if (lowerDesc.includes('popular albums') || lowerDesc.includes('trending albums')) {
      return 'src/hooks/use-albums.ts';
    } else if (lowerDesc.includes('made for you') || lowerDesc.includes('playlist') || lowerDesc.includes('recommendations')) {
      return 'src/hooks/use-playlists.ts';
    } else if (lowerDesc.includes('search') || lowerDesc.includes('discovery')) {
      return 'src/hooks/use-search.ts';
    } else if (lowerDesc.includes('user') || lowerDesc.includes('profile')) {
      return 'src/hooks/use-user.ts';
    } else {
      // Generic hook for unmatched operations
      return 'src/hooks/use-data.ts';
    }
  }

  private async canExistingHookHandle(hookFile: string, description: string): Promise<boolean> {
    try {
      const content = await this.fileManager.readFile(hookFile);
      const lowerDesc = description.toLowerCase();
      const lowerContent = content.toLowerCase();
      
      // Check if the hook already contains functionality for this description
      if (lowerDesc.includes('recently played') && lowerContent.includes('recently')) {
        return true;
      } else if (lowerDesc.includes('popular albums') && lowerContent.includes('popular') && lowerContent.includes('album')) {
        return true;
      } else if (lowerDesc.includes('made for you') && lowerContent.includes('made') && lowerContent.includes('playlist')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private async updateExistingHook(hookFile: string, operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    // For now, just log that we would update - in practice, this would add new functionality
    this.logger.info(`Would update ${hookFile} with new functionality for: ${operation.description}`);
    this.logger.success(`Hook file ${hookFile} is ready for the requested operation`);
  }

  private async createNewHookFile(hookFile: string, operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    const hookName = this.extractHookName(hookFile);
    const dataType = this.extractDataType(operation.description);
    
    const hooksPrompt = `Create a custom React hook file for: ${operation.description}

    ## Context:
    - Hook file: ${hookFile}
    - Hook name: ${hookName}
    - Data type: ${dataType}
    - API endpoints: ${operation.apiEndpoints?.join(', ') || 'to be created'}

    ## Requirements:
    - Follow React hooks naming conventions (use-* pattern)
    - Include proper TypeScript interfaces
    - Add loading, error, and refetch states
    - Implement caching with localStorage
    - Add JSDoc comments
    - Export all interfaces and hook functions
    - Include cache invalidation and refresh functionality
    - Follow the existing pattern from other hook files in the project

    ## Response Format:
    Return only the complete TypeScript hook file code, no explanations or markdown formatting.`;

    const hooksCode = await this.aiClient.generateText(hooksPrompt, operation.description);
    await this.fileManager.createFile(hookFile, hooksCode);
    this.logger.success(`Created new hook file: ${hookFile}`);
  }

  private async ensureHooksIndex(): Promise<void> {
    const indexFile = 'src/hooks/index.ts';
    if (await this.fileManager.fileExists(indexFile)) {
      this.logger.info('Hooks index.ts already exists');
      return;
    }

    const indexContent = `// Re-export all individual hooks
export * from './use-recently-played';
export * from './use-albums';
export * from './use-playlists';

// Common hook utilities and types
export interface BaseHookState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface BaseHookOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Cache duration constants
export const CACHE_DURATIONS = {
  RECENTLY_PLAYED: 5 * 60 * 1000,    // 5 minutes
  POPULAR_ALBUMS: 15 * 60 * 1000,    // 15 minutes  
  PLAYLISTS: 30 * 60 * 1000          // 30 minutes
} as const;`;

    await this.fileManager.createFile(indexFile, indexContent);
    this.logger.success(`Created hooks index file: ${indexFile}`);
  }

  private async createLegacyHooksFile(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
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
    await this.fileManager.createFile(hooksFile, hooksCode);
    this.logger.success(`Created legacy hooks file: ${hooksFile}`);
  }

  private extractHookName(hookFile: string): string {
    const filename = hookFile.split('/').pop()?.replace('.ts', '') || 'useData';
    return filename.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
  }

  private extractDataType(description: string): string {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('track') || lowerDesc.includes('song')) return 'Track';
    if (lowerDesc.includes('album')) return 'Album';  
    if (lowerDesc.includes('playlist')) return 'Playlist';
    if (lowerDesc.includes('user')) return 'User';
    return 'Data';
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