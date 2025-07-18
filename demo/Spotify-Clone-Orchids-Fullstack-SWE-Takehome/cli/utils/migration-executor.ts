import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger';
import { FileManager } from './file-manager';
import { StateAnalyzer } from './state-analyzer';
import { IdempotentSQLGenerator } from './idempotent-sql-generator';

export interface MigrationInfo {
  filename: string;
  filepath: string;
  timestamp: string;
  description: string;
  executed: boolean;
  executedAt?: string;
  rollbackSql?: string;
}

export interface MigrationResult {
  success: boolean;
  migration: MigrationInfo;
  error?: string;
  tablesCreated?: string[];
  rollbackInfo?: {
    canRollback: boolean;
    rollbackSql?: string;
  };
}

export class MigrationExecutor {
  private logger: Logger;
  private fileManager: FileManager;
  private supabase: SupabaseClient | null = null;
  private projectRoot: string;
  private migrationsTable = '_db_agent_migrations';
  private stateAnalyzer: StateAnalyzer;
  private sqlGenerator: IdempotentSQLGenerator;

  constructor(projectRoot: string = process.cwd()) {
    this.logger = new Logger();
    this.fileManager = new FileManager(projectRoot);
    this.projectRoot = projectRoot;
    this.stateAnalyzer = new StateAnalyzer(projectRoot);
    this.sqlGenerator = new IdempotentSQLGenerator(projectRoot);
  }

  // Initialize Supabase connection
  async initialize(): Promise<void> {
    this.logger.info('Initializing migration executor...');
    
    try {
      await this.validateEnvironment();
      await this.createSupabaseClient();
      await this.ensureMigrationsTable();
      
      // Initialize state analyzer and SQL generator
      this.logger.info('Initializing state-aware components...');
      await this.stateAnalyzer.initialize();
      await this.sqlGenerator.initialize();
      
      this.logger.success('Migration executor initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize migration executor: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Validate environment variables and connection
  private async validateEnvironment(): Promise<void> {
    this.logger.analyzing('Validating environment configuration...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing required Supabase environment variables.\n' +
        'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        'Optional (for advanced operations): SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    // Test connection
    const testClient = createClient(supabaseUrl, supabaseAnonKey);
    try {
      const { error } = await testClient.from('_test_connection').select('*').limit(1);
      // We expect this to fail, but it should fail with a specific error about table not existing
      // If it fails with auth or network issues, we'll catch those
      if (error && !error.message.includes('does not exist') && !error.message.includes('relation') && !error.message.includes('table')) {
        if (error.message.includes('Invalid API key') || error.message.includes('unauthorized')) {
          throw new Error('Invalid Supabase credentials. Please check your API keys.');
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Cannot connect to Supabase. Please check your URL and network connection.');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to validate Supabase connection');
    }

    this.logger.success('Environment validation completed');
  }

  // Create Supabase client with appropriate permissions
  private async createSupabaseClient(): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Use service role key if available for DDL operations, otherwise use anon key
    const apiKey = supabaseServiceKey || supabaseAnonKey;
    
    if (!supabaseServiceKey) {
      this.logger.warn('Using anon key for migrations. Some operations may be restricted.');
      this.logger.info('For full functionality, set SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    this.supabase = createClient(supabaseUrl, apiKey);
    this.logger.success('Supabase client created');
  }

  // Ensure migrations tracking table exists
  private async ensureMigrationsTable(): Promise<void> {
    if (!this.supabase) throw new Error('Supabase client not initialized');

    this.logger.analyzing('Ensuring migrations table exists...');

    const migrationTableSql = `
      -- Create migrations tracking table if it doesn't exist
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rollback_sql TEXT,
        checksum TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_migrations_filename ON ${this.migrationsTable}(filename);
      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON ${this.migrationsTable}(executed_at);

      -- Add comment
      COMMENT ON TABLE ${this.migrationsTable} IS 'Database Agent migrations tracking table';
    `;

    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql: migrationTableSql });
      if (error) {
        // If RPC doesn't exist, try direct SQL execution (less reliable but may work)
        this.logger.warn('RPC exec_sql not available, attempting alternative method...');
        
        // Try to check if table exists first
        const { error: checkError } = await this.supabase
          .from(this.migrationsTable)
          .select('id')
          .limit(1);
        
        if (checkError && checkError.message.includes('does not exist')) {
          this.logger.warn(
            'Cannot automatically create migrations table. Please run this SQL in your Supabase dashboard:\n' +
            migrationTableSql
          );
        }
      } else {
        this.logger.success('Migrations table is ready');
      }
    } catch (error) {
      this.logger.warn('Could not verify migrations table. Proceeding with caution...');
    }
  }

  // Execute a single migration file
  async executeMigration(migrationPath: string): Promise<MigrationResult> {
    if (!this.supabase) {
      throw new Error('Migration executor not initialized. Call initialize() first.');
    }

    this.logger.executing(`Executing migration: ${path.basename(migrationPath)}`);

    try {
      // Read migration file
      const migrationSql = await fs.readFile(migrationPath, 'utf8');
      const filename = path.basename(migrationPath);
      const migrationInfo = this.parseMigrationInfo(filename, migrationPath);

      // Check if already executed
      const isExecuted = await this.isMigrationExecuted(filename);
      if (isExecuted) {
        this.logger.warn(`Migration ${filename} already executed, skipping...`);
        return {
          success: true,
          migration: { ...migrationInfo, executed: true },
          tablesCreated: []
        };
      }

      // Enhanced idempotency check using state analyzer
      const systemState = await this.stateAnalyzer.getSystemState();
      const impactAnalysis = await this.sqlGenerator.analyzeImpact(migrationSql);
      
      // Check if tables that would be created already exist
      const existingTables = impactAnalysis.tablesCreated.filter(table => 
        systemState.database.tables.includes(table)
      );
      
      if (existingTables.length > 0) {
        this.logger.info(`Tables already exist: ${existingTables.join(', ')}`);
        this.logger.info('Validating SQL for idempotency...');
        
        // Validate SQL is idempotent
        const validation = this.sqlGenerator.validateIdempotency(migrationSql);
        if (!validation.isIdempotent) {
          this.logger.warn('SQL may not be idempotent. Issues found:');
          validation.issues.forEach(issue => this.logger.warn(`  - ${issue}`));
          this.logger.warn('Proceeding with caution...');
        } else {
          this.logger.success('SQL is idempotent, safe to execute');
        }
      }

      // Parse and validate SQL
      const { statements, tablesCreated, rollbackSql } = await this.parseMigrationSql(migrationSql);

      // Execute migration in transaction
      const result = await this.executeMigrationTransaction(statements, migrationInfo, rollbackSql);

      if (result.success) {
        // Record successful migration
        await this.recordMigration(migrationInfo, rollbackSql);
        this.logger.success(`Migration ${filename} executed successfully`);
        
        // Verify tables were created
        await this.verifyTablesCreated(tablesCreated);
      }

      return {
        ...result,
        tablesCreated,
        rollbackInfo: {
          canRollback: !!rollbackSql,
          rollbackSql
        }
      };

    } catch (error) {
      this.logger.error(`Migration execution failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        migration: this.parseMigrationInfo(path.basename(migrationPath), migrationPath),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Execute multiple migrations in order
  async executeMigrations(migrationPaths: string[]): Promise<MigrationResult[]> {
    this.logger.section('Executing Database Migrations');
    
    const results: MigrationResult[] = [];
    
    for (let i = 0; i < migrationPaths.length; i++) {
      const migrationPath = migrationPaths[i];
      this.logger.progress(i + 1, migrationPaths.length, `Processing ${path.basename(migrationPath)}`);
      
      const result = await this.executeMigration(migrationPath);
      results.push(result);
      
      if (!result.success) {
        this.logger.error(`Migration failed: ${result.error}`);
        this.logger.warn('Stopping migration execution due to failure');
        break;
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    this.logger.subsection('Migration Summary');
    this.logger.info(`Successful: ${successful}`);
    if (failed > 0) {
      this.logger.error(`Failed: ${failed}`);
    }
    
    return results;
  }

  // Rollback a specific migration
  async rollbackMigration(filename: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Migration executor not initialized');
    }

    this.logger.executing(`Rolling back migration: ${filename}`);

    try {
      // Get migration record
      const { data: migration, error } = await this.supabase
        .from(this.migrationsTable)
        .select('*')
        .eq('filename', filename)
        .single();

      if (error || !migration) {
        throw new Error(`Migration ${filename} not found in records`);
      }

      if (!migration.rollback_sql) {
        throw new Error(`No rollback SQL available for migration ${filename}`);
      }

      // Execute rollback
      const { error: rollbackError } = await this.supabase.rpc('exec_sql', { 
        sql: migration.rollback_sql 
      });

      if (rollbackError) {
        throw new Error(`Rollback execution failed: ${rollbackError.message}`);
      }

      // Remove migration record
      const { error: deleteError } = await this.supabase
        .from(this.migrationsTable)
        .delete()
        .eq('filename', filename);

      if (deleteError) {
        this.logger.warn(`Could not remove migration record: ${deleteError.message}`);
      }

      this.logger.success(`Migration ${filename} rolled back successfully`);
      return true;

    } catch (error) {
      this.logger.error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Verify database schema matches expected state
  async verifyDatabaseSchema(expectedTables: string[]): Promise<{ valid: boolean; missing: string[]; extra: string[] }> {
    if (!this.supabase) {
      throw new Error('Migration executor not initialized');
    }

    this.logger.analyzing('Verifying database schema...');

    try {
      // Get all tables in public schema
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .neq('table_name', this.migrationsTable); // Exclude our migrations table

      if (error) {
        this.logger.warn('Could not query information_schema, trying alternative method...');
        // Alternative: try to query each expected table individually
        const missing: string[] = [];
        for (const tableName of expectedTables) {
          const { error: tableError } = await this.supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (tableError && tableError.message.includes('does not exist')) {
            missing.push(tableName);
          }
        }
        
        return {
          valid: missing.length === 0,
          missing,
          extra: [] // Can't determine extra tables with this method
        };
      }

      const existingTables = tables?.map(t => t.table_name) || [];
      const missing = expectedTables.filter(table => !existingTables.includes(table));
      const extra = existingTables.filter(table => 
        !expectedTables.includes(table) && 
        !table.startsWith('_') && // Exclude system tables
        table !== this.migrationsTable
      );

      this.logger.success('Schema verification completed');
      
      return {
        valid: missing.length === 0,
        missing,
        extra
      };

    } catch (error) {
      this.logger.error(`Schema verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        missing: expectedTables,
        extra: []
      };
    }
  }

  // Get migration status
  async getMigrationStatus(): Promise<{ executed: MigrationInfo[]; pending: string[] }> {
    if (!this.supabase) {
      throw new Error('Migration executor not initialized');
    }

    this.logger.analyzing('Getting migration status...');

    try {
      // Get executed migrations
      const { data: executedMigrations, error } = await this.supabase
        .from(this.migrationsTable)
        .select('*')
        .order('executed_at', { ascending: true });

      const executed: MigrationInfo[] = (executedMigrations || []).map(m => ({
        filename: m.filename,
        filepath: '', // We don't store full path
        timestamp: m.filename.split('_')[0] || '',
        description: m.description || '',
        executed: true,
        executedAt: m.executed_at,
        rollbackSql: m.rollback_sql
      }));

      // Find pending migrations
      const migrationDirs = ['src/lib/migrations', 'supabase/migrations', 'migrations'];
      const allMigrationFiles: string[] = [];
      
      for (const dir of migrationDirs) {
        const fullPath = path.join(this.projectRoot, dir);
        try {
          const files = await fs.readdir(fullPath);
          const sqlFiles = files.filter(file => file.endsWith('.sql'));
          allMigrationFiles.push(...sqlFiles);
        } catch {
          // Directory doesn't exist
        }
      }

      const executedFilenames = executed.map(m => m.filename);
      const pending = allMigrationFiles.filter(file => !executedFilenames.includes(file));

      return { executed, pending };

    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error instanceof Error ? error.message : String(error)}`);
      return { executed: [], pending: [] };
    }
  }

  // Private helper methods

  private parseMigrationInfo(filename: string, filepath: string): MigrationInfo {
    const timestamp = filename.split('_')[0] || '';
    const description = filename.replace(timestamp + '_', '').replace('.sql', '').replace(/_/g, ' ');
    
    return {
      filename,
      filepath,
      timestamp,
      description,
      executed: false
    };
  }

  private async isMigrationExecuted(filename: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { data, error } = await this.supabase
        .from(this.migrationsTable)
        .select('filename')
        .eq('filename', filename)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  private async parseMigrationSql(sql: string): Promise<{
    statements: string[];
    tablesCreated: string[];
    rollbackSql?: string;
  }> {
    this.logger.analyzing('Parsing SQL migration file...');
    
    // Parse SQL into statements using PostgreSQL-aware parser
    const statements = this.parsePostgreSQLStatements(sql);
    
    this.logger.info(`Parsed ${statements.length} SQL statements`);
    
    // Debug: Log parsed statements
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      this.logger.info(`Statement ${i + 1}: ${preview}${statement.length > 60 ? '...' : ''}`);
    }

    // Extract table names from CREATE TABLE statements
    const tablesCreated: string[] = [];
    const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?(\w+)/gi;
    
    for (const statement of statements) {
      const matches = statement.matchAll(createTableRegex);
      for (const match of matches) {
        tablesCreated.push(match[1]);
      }
    }
    
    this.logger.info(`Tables to be created: ${tablesCreated.join(', ') || 'none'}`);

    // Generate comprehensive rollback SQL
    const rollbackSql = this.generateRollbackSQL(statements, tablesCreated);

    return {
      statements,
      tablesCreated,
      rollbackSql
    };
  }

  private parsePostgreSQLStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inFunctionBody = false;
    let inStringLiteral = false;
    let inComment = false;
    let functionDelimiter = '';
    let i = 0;

    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine === '') continue;
      
      // Skip single-line comments
      if (trimmedLine.startsWith('--')) continue;
      
      // Check for function delimiter patterns ($$, $tag$, etc.)
      const delimiterMatch = trimmedLine.match(/\$([^$]*)\$/);
      if (delimiterMatch) {
        const delimiter = delimiterMatch[0];
        if (!inFunctionBody && trimmedLine.includes(delimiter)) {
          inFunctionBody = true;
          functionDelimiter = delimiter;
        } else if (inFunctionBody && functionDelimiter === delimiter) {
          inFunctionBody = false;
          functionDelimiter = '';
        }
      }
      
      // Add line to current statement
      if (currentStatement) {
        currentStatement += '\n' + line;
      } else {
        currentStatement = line;
      }
      
      // Check for statement termination
      if (!inFunctionBody && !inStringLiteral && trimmedLine.endsWith(';')) {
        // Clean up the statement
        const cleanStatement = currentStatement.trim();
        if (cleanStatement && !cleanStatement.startsWith('--')) {
          // Filter out transaction control statements
          const statementUpper = cleanStatement.toUpperCase();
          const isTransactionCommand = statementUpper.startsWith('BEGIN') || 
                                     statementUpper.startsWith('COMMIT') || 
                                     statementUpper.startsWith('ROLLBACK') ||
                                     statementUpper.startsWith('START TRANSACTION');
          
          if (!isTransactionCommand) {
            statements.push(cleanStatement);
          } else {
            this.logger.info(`Skipping transaction command: ${cleanStatement.substring(0, 50)}...`);
          }
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement (with transaction filtering)
    if (currentStatement.trim() && !currentStatement.trim().startsWith('--')) {
      const cleanStatement = currentStatement.trim();
      const statementUpper = cleanStatement.toUpperCase();
      const isTransactionCommand = statementUpper.startsWith('BEGIN') || 
                                 statementUpper.startsWith('COMMIT') || 
                                 statementUpper.startsWith('ROLLBACK') ||
                                 statementUpper.startsWith('START TRANSACTION');
      
      if (!isTransactionCommand) {
        statements.push(cleanStatement);
      } else {
        this.logger.info(`Skipping transaction command: ${cleanStatement.substring(0, 50)}...`);
      }
    }
    
    return statements;
  }

  private generateRollbackSQL(statements: string[], tablesCreated: string[]): string | undefined {
    const rollbackStatements: string[] = [];
    
    // Reverse order for proper rollback
    for (let i = statements.length - 1; i >= 0; i--) {
      const statement = statements[i].trim().toLowerCase();
      
      // Handle different types of statements
      if (statement.includes('create table')) {
        // Extract table name and add DROP statement
        const tableMatch = statement.match(/create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?(\w+)/i);
        if (tableMatch) {
          rollbackStatements.push(`DROP TABLE IF EXISTS ${tableMatch[1]} CASCADE;`);
        }
      } else if (statement.includes('create index')) {
        // Extract index name and add DROP statement
        const indexMatch = statement.match(/create\s+index(?:\s+if\s+not\s+exists)?\s+(\w+)/i);
        if (indexMatch) {
          rollbackStatements.push(`DROP INDEX IF EXISTS ${indexMatch[1]};`);
        }
      } else if (statement.includes('create policy')) {
        // Extract policy name and add DROP statement
        const policyMatch = statement.match(/create\s+policy\s+"([^"]+)"/i);
        if (policyMatch) {
          // Find the table name
          const tableMatch = statement.match(/on\s+(?:public\.)?(\w+)/i);
          if (tableMatch) {
            rollbackStatements.push(`DROP POLICY IF EXISTS "${policyMatch[1]}" ON ${tableMatch[1]};`);
          }
        }
      } else if (statement.includes('create trigger')) {
        // Extract trigger name and add DROP statement
        const triggerMatch = statement.match(/create\s+trigger\s+(\w+)/i);
        if (triggerMatch) {
          const tableMatch = statement.match(/on\s+(?:public\.)?(\w+)/i);
          if (tableMatch) {
            rollbackStatements.push(`DROP TRIGGER IF EXISTS ${triggerMatch[1]} ON ${tableMatch[1]};`);
          }
        }
      } else if (statement.includes('create function')) {
        // Extract function name and add DROP statement
        const funcMatch = statement.match(/create(?:\s+or\s+replace)?\s+function\s+(\w+)/i);
        if (funcMatch) {
          rollbackStatements.push(`DROP FUNCTION IF EXISTS ${funcMatch[1]}();`);
        }
      } else if (statement.includes('create extension')) {
        // Extract extension name and add DROP statement
        const extMatch = statement.match(/create\s+extension(?:\s+if\s+not\s+exists)?\s+"?([^";\s]+)"?/i);
        if (extMatch) {
          rollbackStatements.push(`DROP EXTENSION IF EXISTS "${extMatch[1]}";`);
        }
      }
    }
    
    return rollbackStatements.length > 0 ? rollbackStatements.join('\n') : undefined;
  }

  private async executeMigrationTransaction(
    statements: string[],
    migrationInfo: MigrationInfo,
    rollbackSql?: string
  ): Promise<MigrationResult> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    this.logger.info(`Executing ${statements.length} SQL statements...`);

    try {
      // Execute each statement with detailed logging
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement) {
          this.logger.info(`Executing statement ${i + 1}/${statements.length}:`);
          this.logger.info(`${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
          
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            this.logger.error(`Statement ${i + 1} failed: ${error.message}`);
            this.logger.error(`Full statement: ${statement}`);
            throw new Error(`SQL execution failed: ${error.message}\nStatement: ${statement}`);
          }
          
          this.logger.success(`Statement ${i + 1} executed successfully`);
        }
      }

      return {
        success: true,
        migration: migrationInfo
      };

    } catch (error) {
      this.logger.error(`Migration transaction failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        migration: migrationInfo,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async recordMigration(migrationInfo: MigrationInfo, rollbackSql?: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from(this.migrationsTable)
        .insert({
          filename: migrationInfo.filename,
          description: migrationInfo.description,
          rollback_sql: rollbackSql,
          checksum: this.generateChecksum(migrationInfo.filename)
        });

      if (error) {
        this.logger.warn(`Could not record migration: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(`Could not record migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async verifyTablesCreated(tableNames: string[]): Promise<void> {
    if (!this.supabase || tableNames.length === 0) return;

    this.logger.analyzing('Verifying created tables...');

    for (const tableName of tableNames) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.message.includes('does not exist')) {
          this.logger.error(`Table ${tableName} was not created successfully`);
        } else {
          this.logger.success(`Table ${tableName} verified`);
        }
      } catch (error) {
        this.logger.warn(`Could not verify table ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private generateChecksum(filename: string): string {
    // Simple checksum for migration tracking
    return Buffer.from(filename).toString('base64').substring(0, 8);
  }
} 