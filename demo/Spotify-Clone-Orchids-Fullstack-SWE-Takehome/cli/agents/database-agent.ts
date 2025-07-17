import { Logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';
import { ProjectContext } from './project-analyzer';
import { AIClient } from '../utils/ai-client';
import { CodeGenerator } from './code-generator';

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

  constructor() {
    this.logger = new Logger();
    this.fileManager = new FileManager();
    this.aiClient = new AIClient();
    this.codeGenerator = new CodeGenerator();
  }

  async executeQuery(query: string, projectContext: ProjectContext): Promise<void> {
    this.logger.section('Database Agent Execution');
    this.logger.info(`Query: "${query}"`);

    try {
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

  private async analyzeQuery(query: string, projectContext: ProjectContext): Promise<QueryPlan> {
    this.logger.thinking('Analyzing query and creating execution plan...');

    const systemPrompt = `You are an expert database agent for a Spotify clone built with Next.js and Supabase. You specialize in analyzing user requests and creating precise execution plans.

    ## Current Project Context:
    - Components: ${projectContext.components.length} (${projectContext.components.filter(c => c.usesDatabase).length} use database)
    - Data structures: ${projectContext.currentDataStructures.length} (${projectContext.currentDataStructures.filter(ds => ds.isForDatabase).length} database-related)
    - Existing APIs: ${projectContext.existingAPIs.length} (${projectContext.existingAPIs.filter(api => api.hasDatabase).length} use database)
    - Supabase configured: ${projectContext.supabaseConfigured}
    - Current database tables: ${projectContext.databaseTables.join(', ') || 'none'}
    - AI Provider: ${projectContext.aiProvider}
    - Dependencies: ${projectContext.dependencies.join(', ')}

    ## Hardcoded Data Analysis:
    ${projectContext.hardcodedDataAnalysis.map(hd => `- ${hd.variableName} (${hd.dataType}) → suggested table: ${hd.suggestedTableName}`).join('\n')}

    ## Current Data Structures:
    ${projectContext.currentDataStructures.map(ds => `- ${ds.name} (${ds.type}${ds.isForDatabase ? ' - database related' : ''}): ${ds.properties.map(p => `${p.name}: ${p.type}${p.optional ? '?' : ''}`).join(', ')}`).join('\n')}

    ## Existing API Routes:
    ${projectContext.existingAPIs.map(api => `- ${api.path} [${api.methods.join(', ')}]${api.hasDatabase ? ' (uses database)' : ''}`).join('\n')}

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
    const totalOperations = operations.length;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      this.logger.progress(i + 1, totalOperations, operation.description);

      switch (operation.type) {
        case 'create_table':
          await this.executeCreateTable(operation, projectContext);
          break;
        case 'create_api':
          await this.executeCreateAPI(operation, projectContext);
          break;
        case 'update_component':
          await this.executeUpdateComponent(operation, projectContext);
          break;
        case 'install_dependency':
          await this.executeInstallDependency(operation, projectContext);
          break;
        case 'run_migration':
          await this.executeRunMigration(operation, projectContext);
          break;
        case 'create_types':
          await this.executeCreateTypes(operation, projectContext);
          break;
        case 'create_hooks':
          await this.executeCreateHooks(operation, projectContext);
          break;
        default:
          this.logger.warn(`Unknown operation type: ${operation.type}`);
      }
    }
  }

  private async executeCreateTable(operation: DatabaseOperation, projectContext: ProjectContext): Promise<void> {
    this.logger.generating('Creating database table schema...');

    const tablePrompt = `Create a comprehensive Supabase SQL migration for: ${operation.description}

    ## Context:
    - Existing tables: ${projectContext.databaseTables.join(', ') || 'none'}
    - Hardcoded data patterns: ${projectContext.hardcodedDataAnalysis.map(hd => `${hd.variableName} → ${hd.suggestedTableName}`).join(', ')}
    - Current data structures: ${projectContext.currentDataStructures.filter(ds => ds.isForDatabase).map(ds => `${ds.name}: ${ds.properties.map(p => `${p.name}: ${p.type}`).join(', ')}`).join('\n')}

    ## Requirements:
    - Use PostgreSQL syntax (for Supabase)
    - Include proper column types and constraints
    - Add primary keys (UUID with gen_random_uuid())
    - Include created_at and updated_at timestamps
    - Add indexes for performance
    - Include Row Level Security (RLS) policies
    - Add sample seed data that matches the existing hardcoded data structure
    - Include helpful comments

    ## Response Format:
    Return only the SQL migration code, no explanations or markdown formatting.`;

    const sqlCode = await this.aiClient.generateText(tablePrompt, operation.description);
    
    // Create migration file
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const operationName = operation.description.replace(/\s+/g, '_').toLowerCase();
    const migrationFile = `src/lib/migrations/${timestamp}_${operationName}.sql`;
    
    // Ensure migrations directory exists
    await this.fileManager.ensureDirectory('src/lib/migrations');
    
    await this.fileManager.createFile(migrationFile, sqlCode);
    
    this.logger.success(`Created migration file: ${migrationFile}`);
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

    // In a real implementation, this would run the migration against Supabase
    // For now, just create a setup script
    const setupScript = `-- Migration: ${operation.description}
-- This should be run against your Supabase database
-- You can run this in your Supabase SQL editor or using the Supabase CLI

-- Instructions:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to the SQL editor
-- 3. Run the migration files in order
-- 4. Verify the tables were created successfully

-- Migration files to run:
${operation.files.map(file => `-- ${file}`).join('\n')}

-- Alternative: Use Supabase CLI
-- supabase db reset
-- supabase db push`;

    await this.fileManager.createFile('database-setup.sql', setupScript);
    this.logger.success('Created database setup script');
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