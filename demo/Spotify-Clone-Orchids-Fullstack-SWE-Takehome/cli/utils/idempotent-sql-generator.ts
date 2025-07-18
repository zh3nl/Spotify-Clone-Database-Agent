import { Logger } from './logger';
import { AIClient } from './ai-client';
import { StateAnalyzer, SystemState } from './state-analyzer';

export interface TableColumn {
  name: string;
  type: string;
  constraints?: string;
  nullable?: boolean;
  default?: string;
}

export interface TableDefinition {
  name: string;
  columns: TableColumn[];
  primaryKey?: string;
  indexes?: string[];
  policies?: string[];
  seedData?: any[];
}

export interface SQLGenerationOptions {
  includeIndexes?: boolean;
  includePolicies?: boolean;
  includeSeedData?: boolean;
  forceRecreate?: boolean;
  existingTables?: string[];
  existingIndexes?: string[];
  seedData?: any[]; // <-- add this line
}

export class IdempotentSQLGenerator {
  private logger: Logger;
  private aiClient: AIClient;
  private stateAnalyzer: StateAnalyzer;

  constructor(projectRoot: string = process.cwd()) {
    this.logger = new Logger();
    this.aiClient = new AIClient();
    this.stateAnalyzer = new StateAnalyzer(projectRoot);
  }

  // Initialize the generator
  async initialize(): Promise<void> {
    await this.stateAnalyzer.initialize();
  }

  // Generate idempotent SQL for a table creation request
  async generateIdempotentTableSQL(
    description: string,
    tableName: string,
    columns: TableColumn[],
    options: SQLGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`Generating idempotent SQL for table: ${tableName}`);

    // Check current system state
    const systemState = await this.stateAnalyzer.getSystemState();
    const tableExists = systemState.database.tables.includes(tableName);

    if (tableExists && !options.forceRecreate) {
      this.logger.info(`Table ${tableName} already exists, generating update SQL instead`);
      return this.generateTableUpdateSQL(tableName, columns, systemState);
    }

    // Generate comprehensive idempotent SQL
    const sql = await this.generateComprehensiveTableSQL(
      description,
      tableName,
      columns,
      options,
      systemState
    );

    this.logger.success(`Generated idempotent SQL for table: ${tableName}`);
    return sql;
  }

  // Generate SQL that safely updates existing tables
  private async generateTableUpdateSQL(
    tableName: string,
    columns: TableColumn[],
    systemState: SystemState
  ): Promise<string> {
    const updateStatements: string[] = [];

    // Add header comment
    updateStatements.push(`-- Idempotent update for table: ${tableName}`);
    updateStatements.push(`-- Generated at: ${new Date().toISOString()}`);
    updateStatements.push('');

    // Add columns that might not exist
    for (const column of columns) {
      updateStatements.push(
        `-- Add column ${column.name} if it doesn't exist`,
        `DO $$`,
        `BEGIN`,
        `    IF NOT EXISTS (`,
        `        SELECT 1`,
        `        FROM information_schema.columns`,
        `        WHERE table_schema = 'public'`,
        `          AND table_name = '${tableName}'`,
        `          AND column_name = '${column.name}'`,
        `    ) THEN`,
        `        ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}${column.constraints ? ' ' + column.constraints : ''};`,
        `    END IF;`,
        `END $$;`,
        ''
      );
    }

    return updateStatements.join('\n');
  }

  // Generate comprehensive idempotent SQL
  private async generateComprehensiveTableSQL(
    description: string,
    tableName: string,
    columns: TableColumn[],
    options: SQLGenerationOptions,
    systemState: SystemState
  ): Promise<string> {
    const prompt = `Generate comprehensive idempotent SQL for: ${description}

    ## Table Details:
    - Table name: ${tableName}
    - Columns: ${columns.map(c => `${c.name} (${c.type}${c.constraints ? ', ' + c.constraints : ''})`).join(', ')}
    
    ## Current System State:
    - Existing tables: ${systemState.database.tables.join(', ') || 'none'}
    - Existing indexes: ${systemState.database.indexes.join(', ') || 'none'}
    - Executed migrations: ${systemState.database.migrationsExecuted.length} migrations

    ## Requirements:
    - Use PostgreSQL syntax (for Supabase)
    - ALL operations must be idempotent (use IF NOT EXISTS, IF EXISTS, etc.)
    - Start with comprehensive header comment explaining the migration
    - Create table with proper column types and constraints
    - Add primary key (UUID with gen_random_uuid() as default)
    - Include created_at and updated_at timestamps with automatic updates
    - Create indexes for performance (only if they don't exist)
    - Add Row Level Security (RLS) policies (only if they don't exist)
    - Include comprehensive error handling
    - Add helpful comments explaining each section
    - Use proper PostgreSQL best practices
    - Handle edge cases and potential conflicts
    - DO NOT include transaction commands (BEGIN, COMMIT, ROLLBACK, START TRANSACTION)
    - Each statement should be independent and executable separately

    ## Idempotent Patterns to Use:
    - CREATE TABLE IF NOT EXISTS
    - CREATE INDEX IF NOT EXISTS
    - CREATE POLICY IF NOT EXISTS (use DO blocks for policies)
    - ALTER TABLE IF EXISTS (use DO blocks for conditional alters)
    - DROP statements should use IF EXISTS
    - Use DO blocks for complex conditional operations

    ## Structure:
    1. Header comment with migration details
    2. Table creation (idempotent)
    3. Index creation (idempotent)
    4. RLS policies (idempotent)
    5. Trigger creation for updated_at (idempotent)
    6. Comments and documentation

    ## Response Format:
    Return only the SQL migration code, no explanations or markdown formatting.
    The SQL should be production-ready and thoroughly tested for idempotency.`;

    const sqlCode = await this.aiClient.generateText(prompt, `Generate idempotent SQL for ${tableName} table`);
    
    // Post-process the generated SQL to ensure idempotency
    return this.postProcessSQL(sqlCode, tableName, systemState);
  }

  // Post-process SQL to ensure idempotency
  private postProcessSQL(sql: string, tableName: string, systemState: SystemState): string {
    let processedSQL = sql;

    // Remove transaction commands (BEGIN, COMMIT, ROLLBACK, START TRANSACTION) - more robust
    processedSQL = processedSQL.replace(/^[ \t]*BEGIN\b.*$/gim, '');
    processedSQL = processedSQL.replace(/^[ \t]*COMMIT\b.*$/gim, '');
    processedSQL = processedSQL.replace(/^[ \t]*ROLLBACK\b.*$/gim, '');
    processedSQL = processedSQL.replace(/^[ \t]*START[ \t]+TRANSACTION\b.*$/gim, '');

    // Remove transaction-related comments
    processedSQL = processedSQL.replace(/^[\s]*--[\s]*Begin transaction.*$/gmi, '');
    processedSQL = processedSQL.replace(/^[\s]*--[\s]*Commit.*transaction.*$/gmi, '');
    processedSQL = processedSQL.replace(/^[\s]*--[\s]*End transaction.*$/gmi, '');

    // Ensure all CREATE TABLE statements use IF NOT EXISTS
    processedSQL = processedSQL.replace(
      /CREATE TABLE\s+(?!IF NOT EXISTS)(\w+)/gi,
      'CREATE TABLE IF NOT EXISTS $1'
    );

    // Ensure all CREATE INDEX statements use IF NOT EXISTS
    processedSQL = processedSQL.replace(
      /CREATE INDEX\s+(?!IF NOT EXISTS)(\w+)/gi,
      'CREATE INDEX IF NOT EXISTS $1'
    );

    // Ensure all CREATE UNIQUE INDEX statements use IF NOT EXISTS
    processedSQL = processedSQL.replace(
      /CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)(\w+)/gi,
      'CREATE UNIQUE INDEX IF NOT EXISTS $1'
    );

    // Add safety checks for DROP operations
    processedSQL = processedSQL.replace(
      /DROP TABLE\s+(?!IF EXISTS)(\w+)/gi,
      'DROP TABLE IF EXISTS $1'
    );

    processedSQL = processedSQL.replace(
      /DROP INDEX\s+(?!IF EXISTS)(\w+)/gi,
      'DROP INDEX IF EXISTS $1'
    );

    // Clean up multiple empty lines
    processedSQL = processedSQL.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Add header if not present
    if (!processedSQL.includes('-- Idempotent Migration')) {
      const header = `-- Idempotent Migration: ${tableName}
-- Generated at: ${new Date().toISOString()}
-- This migration can be run multiple times safely

`;
      processedSQL = header + processedSQL;
    }

    return processedSQL;
  }

  // Generate idempotent SQL for specific operations
  async generateIdempotentCreateTable(tableName: string, columns: TableColumn[]): Promise<string> {
    const columnDefinitions = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.constraints) def += ` ${col.constraints}`;
      if (col.default) def += ` DEFAULT ${col.default}`;
      if (col.nullable === false) def += ' NOT NULL';
      return def;
    }).join(',\n    ');

    return `-- Create table ${tableName} (idempotent)
CREATE TABLE IF NOT EXISTS ${tableName} (
    ${columnDefinitions}
);`;
  }

  async generateIdempotentCreateIndex(tableName: string, indexName: string, columns: string[], unique: boolean = false): Promise<string> {
    const uniqueKeyword = unique ? 'UNIQUE ' : '';
    const columnList = columns.join(', ');
    
    return `-- Create index ${indexName} (idempotent)
CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnList});`;
  }

  async generateIdempotentRLSPolicy(tableName: string, policyName: string, operation: string, condition: string): Promise<string> {
    return `-- Create RLS policy ${policyName} (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = '${tableName}' 
        AND policyname = '${policyName}'
    ) THEN
        CREATE POLICY ${policyName} ON ${tableName}
        FOR ${operation} USING (${condition});
    END IF;
END $$;`;
  }

  async generateIdempotentTrigger(tableName: string, triggerName: string, triggerFunction: string): Promise<string> {
    return `-- Create trigger ${triggerName} (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = '${triggerName}'
    ) THEN
        CREATE TRIGGER ${triggerName}
            BEFORE UPDATE ON ${tableName}
            FOR EACH ROW
            EXECUTE FUNCTION ${triggerFunction}();
    END IF;
END $$;`;
  }

  // Generate updated_at trigger function (idempotent)
  async generateUpdatedAtTriggerFunction(): Promise<string> {
    return `-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';`;
  }

  // Generate seed data insertion (idempotent)
  async generateIdempotentSeedData(tableName: string, data: any[]): Promise<string> {
    if (!data || data.length === 0) return '';

    const insertStatements: string[] = [];
    
    insertStatements.push(`-- Insert seed data for ${tableName} (idempotent)`);
    insertStatements.push(`-- ${data.length} records to insert`);
    insertStatements.push('');
    
    for (const row of data) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(val => {
        if (val === null || val === undefined) {
          return 'NULL';
        }
        if (typeof val === 'string') {
          // Escape single quotes and handle special characters
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === 'boolean') {
          return val ? 'TRUE' : 'FALSE';
        }
        if (val instanceof Date) {
          return `'${val.toISOString()}'`;
        }
        return val;
      }).join(', ');

      // Use 'id' as the primary key for existence check (standard in our schema)
      const primaryColumn = 'id';
      const primaryValue = typeof row[primaryColumn] === 'string' ? `'${row[primaryColumn]}'` : row[primaryColumn];

      insertStatements.push(`INSERT INTO ${tableName} (${columns})
SELECT ${values}
WHERE NOT EXISTS (
    SELECT 1 FROM ${tableName} 
    WHERE ${primaryColumn} = ${primaryValue}
);`);
      insertStatements.push('');
    }

    return insertStatements.join('\n');
  }

  // Generate comprehensive migration with all components
  async generateCompleteMigration(
    description: string,
    tableName: string,
    columns: TableColumn[],
    options: SQLGenerationOptions = {}
  ): Promise<string> {
    const sections: string[] = [];

    // Header
    sections.push(`-- =====================================================`);
    sections.push(`-- IDEMPOTENT MIGRATION: ${tableName}`);
    sections.push(`-- Description: ${description}`);
    sections.push(`-- Generated: ${new Date().toISOString()}`);
    sections.push(`-- Safe to run multiple times`);
    sections.push(`-- =====================================================`);
    sections.push('');

    // Table creation
    sections.push(await this.generateIdempotentCreateTable(tableName, columns));
    sections.push('');

    // Indexes
    if (options.includeIndexes !== false) {
      sections.push(await this.generateIdempotentCreateIndex(tableName, `idx_${tableName}_created_at`, ['created_at']));
      sections.push(await this.generateIdempotentCreateIndex(tableName, `idx_${tableName}_updated_at`, ['updated_at']));
      sections.push('');
    }

    // Updated at trigger
    sections.push(await this.generateUpdatedAtTriggerFunction());
    sections.push('');
    sections.push(await this.generateIdempotentTrigger(tableName, `${tableName}_updated_at`, 'update_updated_at_column'));
    sections.push('');

    // RLS policies
    if (options.includePolicies !== false) {
      sections.push(`-- Enable RLS on ${tableName}`);
      sections.push(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
      sections.push('');
      
      sections.push(await this.generateIdempotentRLSPolicy(
        tableName,
        `${tableName}_select_policy`,
        'SELECT',
        'true'
      ));
      sections.push('');
    }

    // Seed data
    if (options.includeSeedData && options.seedData && options.seedData.length > 0) {
      sections.push(await this.generateIdempotentSeedData(tableName, options.seedData));
      sections.push('');
    }

    // Footer
    sections.push(`-- Migration for ${tableName} completed`);
    sections.push(`-- All operations are idempotent and safe to rerun`);

    return sections.join('\n');
  }

  // Validate that SQL is idempotent
  validateIdempotency(sql: string): { isIdempotent: boolean; issues: string[] } {
    const issues: string[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      
      // Check for non-idempotent CREATE TABLE
      if (line.includes('create table') && !line.includes('if not exists')) {
        issues.push(`Line ${i + 1}: CREATE TABLE without IF NOT EXISTS`);
      }

      // Check for non-idempotent CREATE INDEX
      if (line.includes('create index') && !line.includes('if not exists')) {
        issues.push(`Line ${i + 1}: CREATE INDEX without IF NOT EXISTS`);
      }

      // Check for non-idempotent DROP statements
      if (line.includes('drop table') && !line.includes('if exists')) {
        issues.push(`Line ${i + 1}: DROP TABLE without IF EXISTS`);
      }

      if (line.includes('drop index') && !line.includes('if exists')) {
        issues.push(`Line ${i + 1}: DROP INDEX without IF EXISTS`);
      }

      // Check for INSERT without existence check
      if (line.includes('insert into') && !sql.includes('WHERE NOT EXISTS')) {
        issues.push(`Line ${i + 1}: INSERT without existence check (may cause duplicates)`);
      }
    }

    return {
      isIdempotent: issues.length === 0,
      issues
    };
  }

  // Check what tables would be affected by the SQL
  async analyzeImpact(sql: string): Promise<{
    tablesCreated: string[];
    tablesModified: string[];
    indexesCreated: string[];
    policiesCreated: string[];
    potentialConflicts: string[];
  }> {
    const impact = {
      tablesCreated: [] as string[],
      tablesModified: [] as string[],
      indexesCreated: [] as string[],
      policiesCreated: [] as string[],
      potentialConflicts: [] as string[]
    };

    const systemState = await this.stateAnalyzer.getSystemState();

    // Extract table names from CREATE TABLE statements
    const createTableMatches = sql.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi);
    if (createTableMatches) {
      createTableMatches.forEach(match => {
        const tableMatch = match.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (systemState.database.tables.includes(tableName)) {
            impact.tablesModified.push(tableName);
          } else {
            impact.tablesCreated.push(tableName);
          }
        }
      });
    }

    // Extract index names from CREATE INDEX statements
    const createIndexMatches = sql.match(/CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/gi);
    if (createIndexMatches) {
      createIndexMatches.forEach(match => {
        const indexMatch = match.match(/CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
        if (indexMatch) {
          impact.indexesCreated.push(indexMatch[1]);
        }
      });
    }

    // Extract policy names from CREATE POLICY statements
    const createPolicyMatches = sql.match(/CREATE POLICY\s+(\w+)/gi);
    if (createPolicyMatches) {
      createPolicyMatches.forEach(match => {
        const policyMatch = match.match(/CREATE POLICY\s+(\w+)/i);
        if (policyMatch) {
          impact.policiesCreated.push(policyMatch[1]);
        }
      });
    }

    return impact;
  }

  /**
   * Generates idempotent seed data insertion SQL
   * @param tableName Name of the table to insert data into
   * @param seedData Array of data objects to insert
   * @returns SQL string with idempotent INSERT statements
   */
  async generateIdempotentSeedData(tableName: string, seedData: any[]): Promise<string> {
    if (!seedData || seedData.length === 0) {
      return `-- No seed data provided for table: ${tableName}`;
    }

    const sections: string[] = [];
    
    // Header
    sections.push(`-- Idempotent seed data for table: ${tableName}`);
    sections.push(`-- Generated at: ${new Date().toISOString()}`);
    sections.push(`-- Records: ${seedData.length}`);
    sections.push('');

    // Get column names from first data object
    const firstItem = seedData[0];
    const columns = Object.keys(firstItem);
    
    // Validate that all objects have the same structure
    const inconsistentItems = seedData.filter(item => {
      const itemKeys = Object.keys(item);
      return itemKeys.length !== columns.length || 
             !columns.every(col => itemKeys.includes(col));
    });

    if (inconsistentItems.length > 0) {
      this.logger.warn(`Found ${inconsistentItems.length} items with inconsistent structure in seed data for ${tableName}`);
    }

    // Generate batch insert with conflict resolution
    const batchSize = 50; // Insert in batches to avoid query size limits
    const batches = this.chunkArray(seedData, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      sections.push(`-- Batch ${batchIndex + 1} of ${batches.length}`);
      sections.push(`INSERT INTO ${tableName} (${columns.map(col => `"${col}"`).join(', ')})`);
      sections.push('VALUES');
      
      const valueRows = batch.map(item => {
        const values = columns.map(col => {
          const value = item[col];
          return this.formatSQLValue(value);
        });
        return `  (${values.join(', ')})`;
      });
      
      sections.push(valueRows.join(',\n'));
      
      // Add conflict resolution strategy
      const conflictStrategy = this.getConflictResolutionStrategy(tableName, columns);
      sections.push(conflictStrategy);
      sections.push('');
    }

    // Add verification query
    sections.push(`-- Verification: Check inserted records`);
    sections.push(`-- SELECT COUNT(*) FROM ${tableName} WHERE id IN (${seedData.map(item => this.formatSQLValue(item.id)).join(', ')});`);
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Formats a JavaScript value for SQL insertion
   * @param value The value to format
   * @returns SQL-formatted string
   */
  private formatSQLValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      // Escape single quotes and wrap in quotes
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    
    if (typeof value === 'object') {
      // Handle JSON objects
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    
    // Default: convert to string and escape
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Gets the appropriate conflict resolution strategy for a table
   * @param tableName Name of the table
   * @param columns Array of column names
   * @returns SQL ON CONFLICT clause
   */
  private getConflictResolutionStrategy(tableName: string, columns: string[]): string {
    // Default: use ID as conflict resolution key
    const idColumn = columns.find(col => col === 'id') || columns[0];
    const updateColumns = columns.filter(col => col !== 'id' && col !== 'created_at');
    
    if (updateColumns.length === 0) {
      // If no columns to update, just ignore conflicts
      return `ON CONFLICT ("${idColumn}") DO NOTHING;`;
    }
    
    // Generate UPDATE SET clause for non-ID columns
    const updateSet = updateColumns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');
    
    return `ON CONFLICT ("${idColumn}") DO UPDATE SET ${updateSet};`;
  }

  /**
   * Chunks an array into smaller arrays of specified size
   * @param array Array to chunk
   * @param size Size of each chunk
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Validates seed data structure and provides warnings
   * @param seedData Array of data objects to validate
   * @param tableName Name of the table for context
   * @returns Validation result with warnings
   */
  validateSeedData(seedData: any[], tableName: string): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const result = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[]
    };

    if (!seedData || seedData.length === 0) {
      result.errors.push('No seed data provided');
      result.isValid = false;
      return result;
    }

    // Check for required fields
    const requiredFields = ['id'];
    const firstItem = seedData[0];
    
    for (const field of requiredFields) {
      if (!(field in firstItem)) {
        result.errors.push(`Missing required field: ${field}`);
        result.isValid = false;
      }
    }

    // Check for data consistency
    const columns = Object.keys(firstItem);
    const inconsistentItems = seedData.filter((item, index) => {
      const itemKeys = Object.keys(item);
      return itemKeys.length !== columns.length || 
             !columns.every(col => itemKeys.includes(col));
    });

    if (inconsistentItems.length > 0) {
      result.warnings.push(`${inconsistentItems.length} items have inconsistent structure`);
    }

    // Check for duplicate IDs
    const ids = seedData.map(item => item.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      result.errors.push('Duplicate IDs found in seed data');
      result.isValid = false;
    }

    // Check for null/undefined required values
    const nullIdItems = seedData.filter(item => !item.id);
    if (nullIdItems.length > 0) {
      result.errors.push(`${nullIdItems.length} items have null/undefined IDs`);
      result.isValid = false;
    }

    return result;
  }
} 