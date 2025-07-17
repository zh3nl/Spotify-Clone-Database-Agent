import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'page' | 'component' | 'layout' | 'api';
  imports: string[];
  exports: string[];
  dataStructures: DataStructure[];
  usesDatabase: boolean;
  hardcodedData: HardcodedData[];
}

export interface DataStructure {
  name: string;
  type: 'interface' | 'type' | 'class' | 'enum';
  properties: PropertyInfo[];
  location: string;
  isForDatabase?: boolean;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface HardcodedData {
  variableName: string;
  dataType: string;
  sampleData: any;
  suggestedTableName?: string;
}

export interface APIRoute {
  path: string;
  methods: string[];
  handler: string;
  hasDatabase: boolean;
  tableOperations: string[];
}

export interface Table {
  name: string;
  columns: TableColumn[];
  exists: boolean;
  suggestedByData?: boolean;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: string;
  defaultValue?: string;
}

export interface ProjectContext {
  components: ComponentInfo[];
  currentDataStructures: DataStructure[];
  existingAPIs: APIRoute[];
  databaseSchema: Table[];
  hardcodedDataAnalysis: HardcodedData[];
  supabaseConfigured: boolean;
  packageJson: any;
  nextConfig: any;
  dependencies: string[];
  projectRoot: string;
  databaseTables: string[];
  aiProvider: string;
  migrationFiles: string[];
}

export class ProjectAnalyzer {
  private logger: Logger;
  private fileManager: FileManager;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.logger = new Logger();
    this.fileManager = new FileManager(projectRoot);
    this.projectRoot = projectRoot;
  }

  async analyzeProject(): Promise<ProjectContext> {
    this.logger.analyzing('Starting comprehensive project analysis...');
    
    const context: ProjectContext = {
      components: [],
      currentDataStructures: [],
      existingAPIs: [],
      databaseSchema: [],
      hardcodedDataAnalysis: [],
      supabaseConfigured: false,
      packageJson: {},
      nextConfig: {},
      dependencies: [],
      projectRoot: this.projectRoot,
      databaseTables: [],
      aiProvider: process.env.DB_AGENT_DEFAULT_PROVIDER || 'anthropic',
      migrationFiles: []
    };

    try {
      // Analyze package.json
      this.logger.analyzing('Analyzing package.json...');
      context.packageJson = await this.analyzePackageJson();
      context.dependencies = Object.keys(context.packageJson.dependencies || {});

      // Check for Supabase configuration
      this.logger.analyzing('Checking Supabase configuration...');
      context.supabaseConfigured = await this.checkSupabaseConfig();

      // Analyze Next.js configuration
      this.logger.analyzing('Analyzing Next.js configuration...');
      context.nextConfig = await this.analyzeNextConfig();

      // Analyze components
      this.logger.analyzing('Analyzing React components...');
      context.components = await this.analyzeComponents();

      // Extract data structures from components
      this.logger.analyzing('Extracting data structures...');
      context.currentDataStructures = await this.extractDataStructures(context.components);

      // Analyze hardcoded data
      this.logger.analyzing('Analyzing hardcoded data patterns...');
      context.hardcodedDataAnalysis = await this.analyzeHardcodedData(context.components);

      // Analyze existing API routes
      this.logger.analyzing('Analyzing API routes...');
      context.existingAPIs = await this.analyzeAPIRoutes();

      // Analyze database schema (if Supabase is configured)
      if (context.supabaseConfigured) {
        this.logger.analyzing('Analyzing database schema...');
        context.databaseSchema = await this.analyzeDatabaseSchema();
        context.databaseTables = context.databaseSchema.map(table => table.name);
      }

      // Find existing migration files
      this.logger.analyzing('Finding migration files...');
      context.migrationFiles = await this.findMigrationFiles();

      this.logger.success('Project analysis completed successfully');
      return context;
    } catch (error) {
      this.logger.error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async analyzePackageJson(): Promise<any> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn('package.json not found or invalid');
      return {};
    }
  }

  private async checkSupabaseConfig(): Promise<boolean> {
    try {
      // Check for Supabase environment variables
      const envFiles = ['.env.local', '.env', '.env.development'];
      
      for (const envFile of envFiles) {
        const envPath = path.join(this.projectRoot, envFile);
        
        try {
          const content = await fs.readFile(envPath, 'utf8');
          if (content.includes('SUPABASE_URL') || content.includes('SUPABASE_ANON_KEY')) {
            this.logger.info(`Found Supabase configuration in ${envFile}`);
            return true;
          }
        } catch {
          // File doesn't exist, continue checking
        }
      }

      // Check for Supabase client file
      const supabaseClientPath = path.join(this.projectRoot, 'src/lib/supabase.ts');
      try {
        await fs.access(supabaseClientPath);
        this.logger.info('Found Supabase client file');
        return true;
      } catch {
        // File doesn't exist
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async analyzeNextConfig(): Promise<any> {
    try {
      const nextConfigPath = path.join(this.projectRoot, 'next.config.ts');
      const content = await fs.readFile(nextConfigPath, 'utf8');
      
      // Simple extraction - in a real implementation, you'd want to parse the TypeScript
      return { content, hasImageOptimization: content.includes('images:') };
    } catch (error) {
      this.logger.warn('next.config.ts not found');
      return {};
    }
  }

  private async analyzeComponents(): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];

    try {
      // Analyze src/app directory
      const appDir = path.join(this.projectRoot, 'src/app');
      const appComponents = await this.analyzeDirectory(appDir, 'page');
      components.push(...appComponents);

      // Analyze src/components directory
      const componentsDir = path.join(this.projectRoot, 'src/components');
      const componentComponents = await this.analyzeDirectory(componentsDir, 'component');
      components.push(...componentComponents);

      // Analyze API routes
      const apiDir = path.join(this.projectRoot, 'src/app/api');
      const apiComponents = await this.analyzeDirectory(apiDir, 'api');
      components.push(...apiComponents);

      return components;
    } catch (error) {
      this.logger.warn('Error analyzing components directory');
      return [];
    }
  }

  private async analyzeDirectory(dirPath: string, type: ComponentInfo['type']): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          // Recursively analyze subdirectories
          const subComponents = await this.analyzeDirectory(filePath, type);
          components.push(...subComponents);
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
          // Analyze TypeScript/React files
          const component = await this.analyzeFile(filePath, type);
          if (component) {
            components.push(component);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return components;
  }

  private async analyzeFile(filePath: string, type: ComponentInfo['type']): Promise<ComponentInfo | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);
      const name = path.basename(filePath, path.extname(filePath));

      // Extract imports (enhanced regex)
      const importMatches = content.match(/import\s+.*?\s+from\s+['"](.+?)['"];?/g) || [];
      const imports = importMatches.map(match => {
        const importMatch = match.match(/from\s+['"](.+?)['"];?/);
        return importMatch ? importMatch[1] : '';
      }).filter(Boolean);

      // Extract exports (enhanced regex)
      const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|class|const|interface|type)\s+(\w+)/g) || [];
      const exports = exportMatches.map(match => {
        const exportMatch = match.match(/(?:function|class|const|interface|type)\s+(\w+)/);
        return exportMatch ? exportMatch[1] : '';
      }).filter(Boolean);

      // Check if component uses database
      const usesDatabase = this.checkDatabaseUsage(content);

      // Extract data structures
      const dataStructures = this.extractDataStructuresFromContent(content, relativePath);

      // Extract hardcoded data
      const hardcodedData = this.extractHardcodedDataFromContent(content, relativePath);

      return {
        name,
        path: relativePath,
        type,
        imports,
        exports,
        dataStructures,
        usesDatabase,
        hardcodedData
      };
    } catch (error) {
      this.logger.warn(`Error analyzing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private checkDatabaseUsage(content: string): boolean {
    const databaseIndicators = [
      'supabase',
      'from(',
      'insert(',
      'update(',
      'delete(',
      'select(',
      'useQuery',
      'useMutation',
      'fetch(',
      '/api/'
    ];

    return databaseIndicators.some(indicator => content.includes(indicator));
  }

  private extractDataStructuresFromContent(content: string, location: string): DataStructure[] {
    const structures: DataStructure[] = [];

    // Extract interfaces
    const interfaceMatches = content.match(/interface\s+(\w+)\s*\{([^}]+)\}/g) || [];
    for (const match of interfaceMatches) {
      const nameMatch = match.match(/interface\s+(\w+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        const properties = this.extractProperties(match);
        const isForDatabase = this.isDatabaseInterface(name, properties);
        
        structures.push({
          name,
          type: 'interface',
          properties,
          location,
          isForDatabase
        });
      }
    }

    // Extract types
    const typeMatches = content.match(/type\s+(\w+)\s*=\s*\{([^}]+)\}/g) || [];
    for (const match of typeMatches) {
      const nameMatch = match.match(/type\s+(\w+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        const properties = this.extractProperties(match);
        const isForDatabase = this.isDatabaseInterface(name, properties);
        
        structures.push({
          name,
          type: 'type',
          properties,
          location,
          isForDatabase
        });
      }
    }

    return structures;
  }

  private isDatabaseInterface(name: string, properties: PropertyInfo[]): boolean {
    // Check if interface name suggests database usage
    const databaseNamePatterns = ['Track', 'Song', 'Album', 'Playlist', 'User', 'Artist'];
    const nameMatchesDatabase = databaseNamePatterns.some(pattern => 
      name.toLowerCase().includes(pattern.toLowerCase())
    );

    // Check if properties suggest database fields
    const hasIdField = properties.some(prop => prop.name === 'id');
    const hasTimestampFields = properties.some(prop => 
      prop.name.includes('created') || prop.name.includes('updated')
    );

    return nameMatchesDatabase || hasIdField || hasTimestampFields;
  }

  private extractProperties(structureContent: string): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    
    // Extract property lines (enhanced)
    const propertyMatches = structureContent.match(/(\w+)(\??):\s*([^;,}]+)/g) || [];
    
    for (const match of propertyMatches) {
      const propertyMatch = match.match(/(\w+)(\??):\s*([^;,}]+)/);
      if (propertyMatch) {
        const name = propertyMatch[1];
        const optional = propertyMatch[2] === '?';
        const type = propertyMatch[3].trim();
        
        properties.push({
          name,
          type,
          optional,
          description: this.generatePropertyDescription(name, type)
        });
      }
    }

    return properties;
  }

  private generatePropertyDescription(name: string, type: string): string {
    const descriptions: Record<string, string> = {
      'id': 'Unique identifier',
      'title': 'Title or name',
      'name': 'Name',
      'artist': 'Artist name',
      'album': 'Album name',
      'duration': 'Duration in seconds',
      'image': 'Image URL',
      'imageUrl': 'Image URL',
      'created_at': 'Creation timestamp',
      'updated_at': 'Last update timestamp',
      'user_id': 'User identifier'
    };

    return descriptions[name] || `${name} field`;
  }

  private extractHardcodedDataFromContent(content: string, location: string): HardcodedData[] {
    const hardcodedData: HardcodedData[] = [];

    // Look for array declarations with sample data
    const arrayMatches = content.match(/const\s+(\w+)\s*=\s*\[([\s\S]*?)\]/g) || [];
    
    for (const match of arrayMatches) {
      const nameMatch = match.match(/const\s+(\w+)\s*=/);
      if (nameMatch) {
        const variableName = nameMatch[1];
        
        // Skip if it's likely a style or configuration array
        if (variableName.includes('style') || variableName.includes('config') || variableName.includes('option')) {
          continue;
        }

        try {
          // Try to extract the array content
          const arrayContent = match.match(/\[([\s\S]*?)\]/);
          if (arrayContent) {
            const suggestedTableName = this.suggestTableName(variableName);
            
            hardcodedData.push({
              variableName,
              dataType: 'array',
              sampleData: arrayContent[1].slice(0, 200), // First 200 chars
              suggestedTableName
            });
          }
        } catch (error) {
          // Skip if we can't parse the array
        }
      }
    }

    return hardcodedData;
  }

  private suggestTableName(variableName: string): string {
    // Convert camelCase to snake_case and pluralize
    const snakeCase = variableName.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Common mappings
    const mappings: Record<string, string> = {
      'recently_played': 'recently_played',
      'made_for_you': 'made_for_you',
      'popular_albums': 'popular_albums',
      'tracks': 'tracks',
      'songs': 'songs',
      'playlists': 'playlists',
      'artists': 'artists',
      'albums': 'albums'
    };

    return mappings[snakeCase] || snakeCase;
  }

  private async analyzeHardcodedData(components: ComponentInfo[]): Promise<HardcodedData[]> {
    const allHardcodedData: HardcodedData[] = [];

    for (const component of components) {
      allHardcodedData.push(...component.hardcodedData);
    }

    return allHardcodedData;
  }

  private async extractDataStructures(components: ComponentInfo[]): Promise<DataStructure[]> {
    const allStructures: DataStructure[] = [];

    for (const component of components) {
      allStructures.push(...component.dataStructures);
    }

    return allStructures;
  }

  private async analyzeAPIRoutes(): Promise<APIRoute[]> {
    const routes: APIRoute[] = [];

    try {
      const apiDir = path.join(this.projectRoot, 'src/app/api');
      const apiRoutes = await this.findAPIRoutes(apiDir);
      routes.push(...apiRoutes);
    } catch (error) {
      // API directory doesn't exist
    }

    return routes;
  }

  private async findAPIRoutes(dirPath: string, basePath: string = ''): Promise<APIRoute[]> {
    const routes: APIRoute[] = [];

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          // Recursively find API routes in subdirectories
          const subRoutes = await this.findAPIRoutes(filePath, `${basePath}/${file.name}`);
          routes.push(...subRoutes);
        } else if (file.name === 'route.ts' || file.name === 'route.js') {
          // Analyze route file
          const route = await this.analyzeAPIRoute(filePath, basePath);
          if (route) {
            routes.push(route);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return routes;
  }

  private async analyzeAPIRoute(filePath: string, routePath: string): Promise<APIRoute | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract HTTP methods
      const methodMatches = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g) || [];
      const methods = methodMatches.map(match => {
        const methodMatch = match.match(/(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/);
        return methodMatch ? methodMatch[1] : '';
      }).filter(Boolean);

      // Check for database usage
      const hasDatabase = this.checkDatabaseUsage(content);

      // Extract table operations
      const tableOperations = this.extractTableOperations(content);

      return {
        path: routePath || '/',
        methods,
        handler: path.relative(this.projectRoot, filePath),
        hasDatabase,
        tableOperations
      };
    } catch (error) {
      return null;
    }
  }

  private extractTableOperations(content: string): string[] {
    const operations: string[] = [];
    
    // Look for Supabase operations
    const supabaseMatches = content.match(/\.from\(['"](\w+)['"]\)/g) || [];
    for (const match of supabaseMatches) {
      const tableMatch = match.match(/\.from\(['"](\w+)['"]\)/);
      if (tableMatch) {
        operations.push(tableMatch[1]);
      }
    }

    return [...new Set(operations)]; // Remove duplicates
  }

  private async analyzeDatabaseSchema(): Promise<Table[]> {
    try {
      // Check if Supabase types file exists
      const supabaseTypesPath = path.join(this.projectRoot, 'src/lib/supabase.ts');
      const content = await fs.readFile(supabaseTypesPath, 'utf8');
      
      // Extract table definitions from the types
      const tables: Table[] = [];
      
      // Look for table definitions in the Database type
      const tableMatches = content.match(/(\w+):\s*\{[\s\S]*?Row:\s*\{[\s\S]*?\}/g) || [];
      
      for (const match of tableMatches) {
        const nameMatch = match.match(/(\w+):\s*\{/);
        if (nameMatch) {
          const tableName = nameMatch[1];
          const columns = this.extractColumnsFromTypeDefinition(match);
          
          tables.push({
            name: tableName,
            columns,
            exists: true // Assume exists if defined in types
          });
        }
      }

      return tables;
    } catch (error) {
      // Supabase types file doesn't exist or can't be read
      return [];
    }
  }

  private extractColumnsFromTypeDefinition(typeDefinition: string): TableColumn[] {
    const columns: TableColumn[] = [];
    
    // Extract Row type properties
    const rowMatch = typeDefinition.match(/Row:\s*\{([\s\S]*?)\}/);
    if (rowMatch) {
      const properties = rowMatch[1];
      const propertyMatches = properties.match(/(\w+):\s*([^;,}]+)/g) || [];
      
      for (const match of propertyMatches) {
        const propertyMatch = match.match(/(\w+):\s*([^;,}]+)/);
        if (propertyMatch) {
          const name = propertyMatch[1];
          const type = propertyMatch[2].trim();
          
          columns.push({
            name,
            type: this.convertTypeScriptToSQLType(type),
            nullable: type.includes('null'),
            primaryKey: name === 'id',
            defaultValue: this.getDefaultValue(name, type)
          });
        }
      }
    }

    return columns;
  }

  private convertTypeScriptToSQLType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'TEXT',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'Date': 'TIMESTAMP',
      'string | null': 'TEXT',
      'number | null': 'INTEGER',
      'boolean | null': 'BOOLEAN'
    };

    return typeMap[tsType] || 'TEXT';
  }

  private getDefaultValue(name: string, type: string): string | undefined {
    if (name === 'id') return 'gen_random_uuid()';
    if (name.includes('created_at') || name.includes('updated_at')) return 'NOW()';
    return undefined;
  }

  private async findMigrationFiles(): Promise<string[]> {
    const migrationFiles: string[] = [];
    
    const migrationDirs = [
      'src/lib/migrations',
      'supabase/migrations',
      'migrations'
    ];

    for (const dir of migrationDirs) {
      const fullPath = path.join(this.projectRoot, dir);
      
      try {
        const files = await fs.readdir(fullPath);
        const sqlFiles = files.filter(file => file.endsWith('.sql'));
        migrationFiles.push(...sqlFiles.map(file => path.join(dir, file)));
      } catch (error) {
        // Directory doesn't exist
      }
    }

    return migrationFiles;
  }
} 