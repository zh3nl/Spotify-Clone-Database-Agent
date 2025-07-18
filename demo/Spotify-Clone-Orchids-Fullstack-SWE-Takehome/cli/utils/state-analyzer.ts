import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger';
import { ProjectContext } from '../agents/project-analyzer';

export interface DatabaseState {
  tables: string[];
  indexes: string[];
  functions: string[];
  policies: string[];
  migrationsExecuted: string[];
  lastChecked: Date;
}

export interface APIState {
  routes: {
    path: string;
    methods: string[];
    exists: boolean;
    lastModified?: Date;
  }[];
  lastChecked: Date;
}

export interface ComponentState {
  components: {
    path: string;
    hasDatabase: boolean;
    lastModified?: Date;
    hardcodedDataRemoved: boolean;
  }[];
  lastChecked: Date;
}

export interface MigrationState {
  executedMigrations: {
    filename: string;
    description: string;
    executedAt: Date;
  }[];
  pendingMigrations: string[];
  lastChecked: Date;
}

export interface SystemState {
  database: DatabaseState;
  api: APIState;
  components: ComponentState;
  migrations: MigrationState;
  features: {
    [featureName: string]: {
      implemented: boolean;
      tables: string[];
      apis: string[];
      components: string[];
      implementedAt: Date;
    };
  };
}

export class StateAnalyzer {
  private logger: Logger;
  private projectRoot: string;
  private supabase: SupabaseClient | null = null;
  private cacheFile: string;
  private cacheValidityMinutes = 5; // Cache validity in minutes

  constructor(projectRoot: string = process.cwd()) {
    this.logger = new Logger();
    this.projectRoot = projectRoot;
    this.cacheFile = path.join(projectRoot, '.db-agent-state.json');
  }

  // Initialize the state analyzer
  async initialize(): Promise<void> {
    this.logger.info('Initializing state analyzer...');
    
    try {
      // Initialize Supabase client if available
      await this.initializeSupabase();
      this.logger.success('State analyzer initialized successfully');
    } catch (error) {
      this.logger.warn(`State analyzer initialization warning: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get comprehensive system state
  async getSystemState(forceRefresh: boolean = false): Promise<SystemState> {
    this.logger.analyzing('Analyzing system state...');

    // Try to load from cache first
    if (!forceRefresh) {
      const cachedState = await this.loadCachedState();
      if (cachedState) {
        this.logger.success('Loaded state from cache');
        return cachedState;
      }
    }

    // Analyze fresh state
    const state: SystemState = {
      database: await this.analyzeDatabaseState(),
      api: await this.analyzeAPIState(),
      components: await this.analyzeComponentState(),
      migrations: await this.analyzeMigrationState(),
      features: await this.analyzeFeatureState()
    };

    // Cache the state
    await this.cacheState(state);
    
    this.logger.success('System state analysis completed');
    return state;
  }

  // Analyze current database state
  private async analyzeDatabaseState(): Promise<DatabaseState> {
    this.logger.analyzing('Analyzing database state...');

    const state: DatabaseState = {
      tables: [],
      indexes: [],
      functions: [],
      policies: [],
      migrationsExecuted: [],
      lastChecked: new Date()
    };

    if (!this.supabase) {
      this.logger.warn('Supabase not available, skipping database state analysis');
      return state;
    }

    try {
      // Get all tables in public schema
      const { data: tables, error: tablesError } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (!tablesError && tables) {
        state.tables = tables.map(t => t.table_name);
      }

      // Get all indexes
      const { data: indexes, error: indexError } = await this.supabase
        .from('information_schema.statistics')
        .select('index_name')
        .eq('table_schema', 'public');

      if (!indexError && indexes) {
        state.indexes = indexes.map(i => i.index_name).filter(Boolean);
      }

      // Get executed migrations
      const { data: migrations, error: migrationError } = await this.supabase
        .from('_db_agent_migrations')
        .select('filename');

      if (!migrationError && migrations) {
        state.migrationsExecuted = migrations.map(m => m.filename);
      }

      this.logger.success(`Database state: ${state.tables.length} tables, ${state.indexes.length} indexes, ${state.migrationsExecuted.length} migrations executed`);
    } catch (error) {
      this.logger.warn(`Database state analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return state;
  }

  // Analyze API routes state
  private async analyzeAPIState(): Promise<APIState> {
    this.logger.analyzing('Analyzing API routes state...');

    const state: APIState = {
      routes: [],
      lastChecked: new Date()
    };

    try {
      // Find all API route files
      const apiDirs = [
        path.join(this.projectRoot, 'src/app/api'),
        path.join(this.projectRoot, 'pages/api')
      ];

      for (const apiDir of apiDirs) {
        try {
          await this.scanAPIDirectory(apiDir, state);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      this.logger.success(`API state: ${state.routes.length} routes found`);
    } catch (error) {
      this.logger.warn(`API state analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return state;
  }

  // Analyze component state
  private async analyzeComponentState(): Promise<ComponentState> {
    this.logger.analyzing('Analyzing component state...');

    const state: ComponentState = {
      components: [],
      lastChecked: new Date()
    };

    try {
      // Find all component files
      const componentDirs = [
        path.join(this.projectRoot, 'src/components'),
        path.join(this.projectRoot, 'components')
      ];

      for (const componentDir of componentDirs) {
        try {
          await this.scanComponentDirectory(componentDir, state);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      this.logger.success(`Component state: ${state.components.length} components analyzed`);
    } catch (error) {
      this.logger.warn(`Component state analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return state;
  }

  // Analyze migration state
  private async analyzeMigrationState(): Promise<MigrationState> {
    this.logger.analyzing('Analyzing migration state...');

    const state: MigrationState = {
      executedMigrations: [],
      pendingMigrations: [],
      lastChecked: new Date()
    };

    try {
      // Get executed migrations from database
      if (this.supabase) {
        const { data: migrations, error } = await this.supabase
          .from('_db_agent_migrations')
          .select('filename, description, executed_at')
          .order('executed_at', { ascending: false });

        if (!error && migrations) {
          state.executedMigrations = migrations.map(m => ({
            filename: m.filename,
            description: m.description || '',
            executedAt: new Date(m.executed_at)
          }));
        }
      }

      // Find pending migrations
      const migrationDirs = [
        path.join(this.projectRoot, 'src/lib/migrations'),
        path.join(this.projectRoot, 'supabase/migrations'),
        path.join(this.projectRoot, 'migrations')
      ];

      for (const migrationDir of migrationDirs) {
        try {
          const files = await fs.readdir(migrationDir);
          const sqlFiles = files.filter(file => file.endsWith('.sql'));
          const executedFilenames = state.executedMigrations.map(m => m.filename);
          const pending = sqlFiles.filter(file => !executedFilenames.includes(file));
          state.pendingMigrations.push(...pending);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      this.logger.success(`Migration state: ${state.executedMigrations.length} executed, ${state.pendingMigrations.length} pending`);
    } catch (error) {
      this.logger.warn(`Migration state analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return state;
  }

  // Analyze implemented features
  private async analyzeFeatureState(): Promise<SystemState['features']> {
    this.logger.analyzing('Analyzing implemented features...');

    const features: SystemState['features'] = {};

    try {
      // Load feature history from cache or analyze current state
      const featurePatterns = [
        { name: 'recently_played', table: 'recently_played', api: '/api/recently-played' },
        { name: 'made_for_you', table: 'made_for_you', api: '/api/made-for-you' },
        { name: 'popular_albums', table: 'popular_albums', api: '/api/popular-albums' },
        { name: 'user_playlists', table: 'user_playlists', api: '/api/playlists' },
        { name: 'search_functionality', table: 'search_history', api: '/api/search' }
      ];

      for (const pattern of featurePatterns) {
        const implemented = await this.isFeatureImplemented(pattern);
        features[pattern.name] = {
          implemented,
          tables: implemented ? [pattern.table] : [],
          apis: implemented ? [pattern.api] : [],
          components: [], // Will be populated by component analysis
          implementedAt: new Date() // This would be tracked in a real implementation
        };
      }

    } catch (error) {
      this.logger.warn(`Feature state analysis error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return features;
  }

  // Check if a specific feature is already implemented
  private async isFeatureImplemented(pattern: { name: string; table: string; api: string }): Promise<boolean> {
    try {
      // Check if table exists
      const tableExists = this.supabase ? await this.checkTableExists(pattern.table) : false;
      
      // Check if API exists
      const apiExists = await this.checkAPIExists(pattern.api);
      
      return tableExists && apiExists;
    } catch (error) {
      return false;
    }
  }

  // Check if a table exists in the database
  private async checkTableExists(tableName: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1);

      return !error || !error.message.includes('does not exist');
    } catch (error) {
      return false;
    }
  }

  // Check if an API route exists
  private async checkAPIExists(apiPath: string): Promise<boolean> {
    try {
      // Convert API path to file path
      const filePath = this.apiPathToFilePath(apiPath);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper methods
  private async initializeSupabase(): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    } catch (error) {
      this.logger.warn('Could not initialize Supabase client');
    }
  }

  private async scanAPIDirectory(dir: string, state: APIState): Promise<void> {
    const scan = async (currentDir: string, basePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath, relativePath);
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
          // Next.js 13+ app directory API route
          const content = await fs.readFile(fullPath, 'utf8');
          const methods = this.extractHTTPMethods(content);
          const stats = await fs.stat(fullPath);
          
          state.routes.push({
            path: `/api/${basePath}`,
            methods,
            exists: true,
            lastModified: stats.mtime
          });
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
          // Pages API route
          const content = await fs.readFile(fullPath, 'utf8');
          const methods = this.extractHTTPMethods(content);
          const stats = await fs.stat(fullPath);
          
          state.routes.push({
            path: `/api/${relativePath.replace(/\.(ts|js)$/, '')}`,
            methods,
            exists: true,
            lastModified: stats.mtime
          });
        }
      }
    };

    await scan(dir);
  }

  private async scanComponentDirectory(dir: string, state: ComponentState): Promise<void> {
    const scan = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
          const content = await fs.readFile(fullPath, 'utf8');
          const hasDatabase = this.checkDatabaseUsage(content);
          const hardcodedDataRemoved = this.checkHardcodedDataRemoved(content);
          const stats = await fs.stat(fullPath);
          
          state.components.push({
            path: path.relative(this.projectRoot, fullPath),
            hasDatabase,
            lastModified: stats.mtime,
            hardcodedDataRemoved
          });
        }
      }
    };

    await scan(dir);
  }

  private extractHTTPMethods(content: string): string[] {
    const methodPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g;
    const methods: string[] = [];
    let match;
    
    while ((match = methodPattern.exec(content)) !== null) {
      methods.push(match[1]);
    }
    
    return methods;
  }

  private checkDatabaseUsage(content: string): boolean {
    return content.includes('supabase') || 
           content.includes('from(') || 
           content.includes('select(') ||
           content.includes('insert(') ||
           content.includes('update(') ||
           content.includes('delete(');
  }

  private checkHardcodedDataRemoved(content: string): boolean {
    // Check for patterns that indicate hardcoded data has been removed
    const hardcodedPatterns = [
      /const\s+\w+\s*=\s*\[[\s\S]*?\]/g, // Array declarations
      /const\s+\w+\s*=\s*\{[\s\S]*?\}/g, // Object declarations
    ];
    
    // If we find database usage but no hardcoded patterns, data likely removed
    const hasDatabase = this.checkDatabaseUsage(content);
    const hasHardcodedPatterns = hardcodedPatterns.some(pattern => pattern.test(content));
    
    return hasDatabase && !hasHardcodedPatterns;
  }

  private apiPathToFilePath(apiPath: string): string {
    // Convert /api/route to possible file paths
    const pathWithoutApi = apiPath.replace(/^\/api\//, '');
    
    // Try Next.js 13+ app directory structure first
    const appRouteFile = path.join(this.projectRoot, 'src/app/api', pathWithoutApi, 'route.ts');
    
    return appRouteFile;
  }

  private async loadCachedState(): Promise<SystemState | null> {
    try {
      const cacheData = await fs.readFile(this.cacheFile, 'utf8');
      const cached = JSON.parse(cacheData);
      
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      const maxAge = this.cacheValidityMinutes * 60 * 1000;
      
      if (cacheAge < maxAge) {
        return cached.state;
      }
    } catch (error) {
      // Cache file doesn't exist or is corrupted
    }
    
    return null;
  }

  private async cacheState(state: SystemState): Promise<void> {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        state
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      this.logger.warn(`Could not cache state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Public utility methods
  async isTableImplemented(tableName: string): Promise<boolean> {
    const state = await this.getSystemState();
    return state.database.tables.includes(tableName);
  }

  async isAPIImplemented(apiPath: string): Promise<boolean> {
    const state = await this.getSystemState();
    return state.api.routes.some(route => route.path === apiPath && route.exists);
  }

  async isFeatureFullyImplemented(featureName: string): Promise<boolean> {
    const state = await this.getSystemState();
    return state.features[featureName]?.implemented || false;
  }

  async getImplementedTables(): Promise<string[]> {
    const state = await this.getSystemState();
    return state.database.tables;
  }

  async getImplementedAPIs(): Promise<string[]> {
    const state = await this.getSystemState();
    return state.api.routes.filter(route => route.exists).map(route => route.path);
  }
} 