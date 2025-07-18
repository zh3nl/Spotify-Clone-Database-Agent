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
    columns: any[],
    options: SQLGenerationOptions = {}
  ): Promise<string> {
    this.logger.analyzing(`Generating idempotent SQL for table: ${tableName}`);

    const {
      includeIndexes = true,
      includePolicies = true,
      includeSeedData = false,
      existingTables = [],
      existingIndexes = []
    } = options;

    // Check if table already exists
    const tableExists = existingTables.includes(tableName);
    
    let sql = `-- Idempotent SQL for table: ${tableName}\n`;
    sql += `-- Description: ${description}\n\n`;

    // Add UUID extension if needed
    sql += `-- Create extension for UUID generation if not exists\n`;
    sql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

    // Create table with IF NOT EXISTS
    sql += `-- Create table: ${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
    
    const columnDefinitions = columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      
      // Add constraints
      if (col.constraints) {
        def += ` ${col.constraints}`;
      }
      
      // Add default value
      if (col.default) {
        def += ` DEFAULT ${col.default}`;
      }
      
      return def;
    });
    
    sql += columnDefinitions.join(',\n');
    sql += '\n);\n\n';

    // Add indexes if requested
    if (includeIndexes && !tableExists) {
      sql += await this.generateIndexes(tableName, columns);
    }

    // Add RLS policies if requested
    if (includePolicies && !tableExists) {
      sql += await this.generateRLSPolicies(tableName, columns);
    }

    // Add triggers for updated_at if the column exists
    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
    if (hasUpdatedAt) {
      sql += await this.generateUpdatedAtTrigger(tableName);
    }

    return sql;
  }

  // Generate indexes for a table
  private async generateIndexes(tableName: string, columns: any[]): Promise<string> {
    let sql = `-- Create indexes for ${tableName}\n`;
    
    // Common index patterns
    const indexableColumns = columns.filter(col => 
      col.name.includes('id') || 
      col.name.includes('_at') || 
      col.name === 'user_id' ||
      col.name === 'created_at' ||
      col.name === 'updated_at'
    );

    for (const col of indexableColumns) {
      if (col.name !== 'id') { // Skip primary key
        sql += `CREATE INDEX IF NOT EXISTS idx_${tableName}_${col.name} ON public.${tableName}(${col.name});\n`;
      }
    }

    // Add composite indexes for common query patterns
    const hasUserId = columns.some(col => col.name === 'user_id');
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    
    if (hasUserId && hasCreatedAt) {
      sql += `CREATE INDEX IF NOT EXISTS idx_${tableName}_user_created ON public.${tableName}(user_id, created_at DESC);\n`;
    }

    sql += '\n';
    return sql;
  }

  // Generate RLS policies for a table
  private async generateRLSPolicies(tableName: string, columns: any[]): Promise<string> {
    let sql = `-- Enable Row Level Security for ${tableName}\n`;
    sql += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;

    // Check if table has user_id column for user-based policies
    const hasUserId = columns.some(col => col.name === 'user_id');

    if (hasUserId) {
      sql += `-- Create RLS policies for ${tableName} (idempotent)\n`;
      
      // Policy for users to read their own data
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_read_own') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_read_own" ON public.${tableName}\n`;
      sql += `      FOR SELECT USING (auth.uid() = user_id);\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
      
      // Policy for users to insert their own data
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_insert_own') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_insert_own" ON public.${tableName}\n`;
      sql += `      FOR INSERT WITH CHECK (auth.uid() = user_id);\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
      
      // Policy for users to update their own data
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_update_own') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_update_own" ON public.${tableName}\n`;
      sql += `      FOR UPDATE USING (auth.uid() = user_id);\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
      
      // Policy for users to delete their own data
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_delete_own') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_delete_own" ON public.${tableName}\n`;
      sql += `      FOR DELETE USING (auth.uid() = user_id);\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
    } else {
      // General policies for tables without user_id
      sql += `-- Create general RLS policies for ${tableName} (idempotent)\n`;
      
      // Allow authenticated users to read
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_read_authenticated') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_read_authenticated" ON public.${tableName}\n`;
      sql += `      FOR SELECT USING (auth.role() = 'authenticated');\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
      
      // Allow authenticated users to insert
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND policyname = '${tableName}_insert_authenticated') THEN\n`;
      sql += `    CREATE POLICY "${tableName}_insert_authenticated" ON public.${tableName}\n`;
      sql += `      FOR INSERT WITH CHECK (auth.role() = 'authenticated');\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
    }

    return sql;
  }

  // Generate updated_at trigger for a table
  private async generateUpdatedAtTrigger(tableName: string): Promise<string> {
    let sql = `-- Create or replace function for updating updated_at column\n`;
    sql += `CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n`;
    sql += `RETURNS TRIGGER AS $$\n`;
    sql += `BEGIN\n`;
    sql += `  NEW.updated_at = NOW();\n`;
    sql += `  RETURN NEW;\n`;
    sql += `END;\n`;
    sql += `$$ LANGUAGE plpgsql;\n\n`;

    sql += `-- Create trigger for ${tableName}\n`;
    sql += `DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON public.${tableName};\n`;
    sql += `CREATE TRIGGER update_${tableName}_updated_at\n`;
    sql += `  BEFORE UPDATE ON public.${tableName}\n`;
    sql += `  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();\n\n`;

    return sql;
  }

  // Generate seed data insertion (idempotent)
  async generateIdempotentSeedData(tableName: string, data: any[]): Promise<string> {
    if (!data || data.length === 0) return '';

    this.logger.analyzing(`Generating idempotent seed data for ${tableName} (${data.length} records)`);

    let sql = `-- 🎵 Idempotent seed data insertion for ${tableName}\n`;
    sql += `-- Records: ${data.length}\n\n`;
    
    // Generate a function to safely insert seed data
    sql += `-- Function to safely insert seed data\n`;
    sql += `CREATE OR REPLACE FUNCTION insert_seed_data_${tableName}()\n`;
    sql += `RETURNS void AS $$\n`;
    sql += `BEGIN\n`;
    sql += `  -- Only insert if table is empty or specific records don't exist\n`;
    
    for (const [index, row] of data.entries()) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      
      // Create the column list
      const columnList = columns.join(', ');
      
      // Create the values list with proper escaping
      const valueList = values.map(val => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`; // Escape single quotes
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');
      
      // Find a unique column to check for existence (prefer id, then track_id, then first column)
      const uniqueColumn = columns.find(col => col === 'id') || 
                          columns.find(col => col.includes('_id')) || 
                          columns[0];
      const uniqueValue = row[uniqueColumn];
      const escapedUniqueValue = typeof uniqueValue === 'string' ? 
        `'${uniqueValue.replace(/'/g, "''")}'` : 
        String(uniqueValue);

      sql += `  -- Insert record ${index + 1}\n`;
      sql += `  INSERT INTO public.${tableName} (${columnList})\n`;
      sql += `  SELECT ${valueList}\n`;
      sql += `  WHERE NOT EXISTS (\n`;
      sql += `    SELECT 1 FROM public.${tableName}\n`;
      sql += `    WHERE ${uniqueColumn} = ${escapedUniqueValue}\n`;
      sql += `  );\n\n`;
    }

    sql += `END;\n`;
    sql += `$$ LANGUAGE plpgsql;\n\n`;

    // Execute the function
    sql += `-- Execute the seed data insertion\n`;
    sql += `SELECT insert_seed_data_${tableName}();\n\n`;

    // Clean up the function
    sql += `-- Clean up the function\n`;
    sql += `DROP FUNCTION IF EXISTS insert_seed_data_${tableName}();\n\n`;

    this.logger.success(`Generated idempotent seed data SQL for ${data.length} records`);
    return sql;
  }

  // Generate comprehensive migration with all components
  async generateCompleteMigration(
    description: string,
    tableName: string,
    columns: any[],
    seedData: any[] = [],
    options: SQLGenerationOptions = {}
  ): Promise<string> {
    let sql = `-- Complete migration: ${description}\n`;
    sql += `-- Table: ${tableName}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    // Generate table SQL
    const tableSQL = await this.generateIdempotentTableSQL(description, tableName, columns, options);
    sql += tableSQL;

    // Generate seed data SQL if provided
    if (seedData.length > 0) {
      const seedSQL = await this.generateIdempotentSeedData(tableName, seedData);
      sql += seedSQL;
    }

    // Add verification query
    sql += `-- Verify table creation\n`;
    sql += `SELECT 'Table ${tableName} created successfully' as status\n`;
    sql += `WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${tableName}');\n\n`;

    // Add record count query if seed data was provided
    if (seedData.length > 0) {
      sql += `-- Verify seed data insertion\n`;
      sql += `SELECT COUNT(*) as record_count FROM public.${tableName};\n\n`;
    }

    return sql;
  }

  // Validate that SQL is idempotent
  validateIdempotency(sql: string): { isIdempotent: boolean; issues: string[] } {
    const issues: string[] = [];
    const sqlUpper = sql.toUpperCase();

    // Check for CREATE TABLE without IF NOT EXISTS
    if (sqlUpper.includes('CREATE TABLE ') && !sqlUpper.includes('IF NOT EXISTS')) {
      // Allow if it's inside a function or conditional block
      if (!sqlUpper.includes('CREATE OR REPLACE FUNCTION') && !sqlUpper.includes('WHERE NOT EXISTS')) {
        issues.push('CREATE TABLE statements should use IF NOT EXISTS');
      }
    }

    // Check for CREATE INDEX without IF NOT EXISTS
    if (sqlUpper.includes('CREATE INDEX ') && !sqlUpper.includes('IF NOT EXISTS')) {
      issues.push('CREATE INDEX statements should use IF NOT EXISTS');
    }

    // Check for INSERT without duplicate handling
    if (sqlUpper.includes('INSERT INTO') && !sqlUpper.includes('WHERE NOT EXISTS') && !sqlUpper.includes('ON CONFLICT')) {
      issues.push('INSERT statements should handle duplicates with WHERE NOT EXISTS or ON CONFLICT');
    }

    // Check for DROP statements without IF EXISTS
    if (sqlUpper.includes('DROP ') && !sqlUpper.includes('IF EXISTS')) {
      // Allow DROP TRIGGER as it's commonly used without IF EXISTS
      if (!sqlUpper.includes('DROP TRIGGER')) {
        issues.push('DROP statements should use IF EXISTS');
      }
    }

    // Check for ALTER TABLE without proper guards
    if (sqlUpper.includes('ALTER TABLE') && !sqlUpper.includes('IF NOT EXISTS')) {
      issues.push('ALTER TABLE statements should be guarded or use IF NOT EXISTS where possible');
    }

    const isIdempotent = issues.length === 0;
    return { isIdempotent, issues };
  }

  // Helper method to transform component data for database insertion
  transformComponentDataForDatabase(data: any[], tableName: string): any[] {
    return data.map((item, index) => {
      const transformed: any = {
        id: item.id || `${tableName}_${index + 1}`,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Map common fields based on table type
      if (tableName === 'recently_played') {
        transformed.title = item.title || item.name || 'Unknown Track';
        transformed.artist = item.artist || 'Unknown Artist';
        transformed.album = item.album || 'Unknown Album';
        transformed.image = item.image || item.imageUrl || '';
        transformed.duration = item.duration || 0;
      } else if (tableName === 'made_for_you') {
        transformed.user_id = '00000000-0000-0000-0000-000000000000'; // Placeholder user ID
        transformed.playlist_id = item.id || `playlist_${index + 1}`;
        transformed.title = item.title || item.name || 'Unknown Playlist';
        transformed.description = item.description || 'Personalized playlist';
        transformed.image = item.image || item.imageUrl || '';
        transformed.playlist_type = item.type || 'made_for_you';
        transformed.duration = item.duration || 0;
      } else if (tableName === 'popular_albums') {
        transformed.album_id = item.id || `album_${index + 1}`;
        transformed.title = item.title || item.name || 'Unknown Album';
        transformed.artist = item.artist || 'Unknown Artist';
        transformed.image = item.image || item.imageUrl || '';
        transformed.duration = item.duration || 0;
        transformed.popularity_score = item.popularity || (100 - index * 5); // Decreasing popularity
      } else {
        // Generic transformation for other tables
        Object.keys(item).forEach(key => {
          if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
            transformed[key] = item[key];
          }
        });
      }

      return transformed;
    });
  }

  // Generate SQL for specific component data types
  async generateComponentDataSQL(
    tableName: string,
    componentData: any[],
    options: SQLGenerationOptions = {}
  ): Promise<string> {
    this.logger.analyzing(`Generating component data SQL for ${tableName}`);

    // Transform the data for database insertion
    const transformedData = this.transformComponentDataForDatabase(componentData, tableName);

    // Generate the seed data SQL
    const seedSQL = await this.generateIdempotentSeedData(tableName, transformedData);

    let sql = `-- Component data migration for ${tableName}\n`;
    sql += `-- Source: React component data\n`;
    sql += `-- Records: ${transformedData.length}\n\n`;

    sql += seedSQL;

    return sql;
  }

  // Analyze SQL impact - what tables, indexes, etc. would be created
  async analyzeImpact(sql: string): Promise<{
    tablesCreated: string[];
    indexesCreated: string[];
    policiesCreated: string[];
    functionsCreated: string[];
  }> {
    const result = {
      tablesCreated: [] as string[],
      indexesCreated: [] as string[],
      policiesCreated: [] as string[],
      functionsCreated: [] as string[]
    };

    const sqlUpper = sql.toUpperCase();

    // Extract tables from CREATE TABLE statements
    const tableMatches = sql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?(\w+)/gi);
    for (const match of tableMatches) {
      result.tablesCreated.push(match[1]);
    }

    // Extract indexes from CREATE INDEX statements
    const indexMatches = sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/gi);
    for (const match of indexMatches) {
      result.indexesCreated.push(match[1]);
    }

    // Extract policies from CREATE POLICY statements
    const policyMatches = sql.matchAll(/CREATE\s+POLICY(?:\s+IF\s+NOT\s+EXISTS)?\s+"?(\w+)"?/gi);
    for (const match of policyMatches) {
      result.policiesCreated.push(match[1]);
    }

    // Extract functions from CREATE FUNCTION statements
    const functionMatches = sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)/gi);
    for (const match of functionMatches) {
      result.functionsCreated.push(match[1]);
    }

    return result;
  }
} 