import { Logger } from '../utils/logger';
import { AIClient } from '../utils/ai-client';
import { ProjectContext } from './project-analyzer';

export interface CodeGenerationOptions {
  template?: string;
  variables?: Record<string, string>;
  outputPath?: string;
  language?: 'typescript' | 'javascript' | 'sql' | 'json';
}

export class CodeGenerator {
  private logger: Logger;
  private aiClient: AIClient;

  constructor() {
    this.logger = new Logger();
    this.aiClient = new AIClient();
  }

  // Generate API route code
  async generateAPIRoute(
    routeName: string,
    methods: string[],
    tableSchema: any,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`API route for ${routeName}`);

    const prompt = `Generate a Next.js API route file for ${routeName} with the following methods: ${methods.join(', ')}.

    Table schema: ${JSON.stringify(tableSchema, null, 2)}

    Requirements:
    - Use TypeScript
    - Include proper error handling
    - Use Supabase client for database operations
    - Include input validation
    - Follow Next.js 13+ app directory structure
    - Include JSDoc comments

    Return only the TypeScript code for the route file.`;

    return await this.aiClient.generateText(
      'You are an expert Next.js developer creating API routes for a Spotify clone.',
      prompt
    );
  }

  // Generate React component code
  async generateReactComponent(
    componentName: string,
    props: any,
    functionality: string,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`React component: ${componentName}`);

    const prompt = `Generate a React component named ${componentName} with the following functionality: ${functionality}.

    Props interface: ${JSON.stringify(props, null, 2)}

    Requirements:
    - Use TypeScript with React 18+
    - Use modern React hooks (useState, useEffect, etc.)
    - Include proper TypeScript types
    - Use Tailwind CSS for styling
    - Include error handling and loading states
    - Follow React best practices
    - Include JSDoc comments

    Return only the TypeScript React component code.`;

    return await this.aiClient.generateText(
      'You are an expert React developer creating components for a Spotify clone.',
      prompt
    );
  }

  // Generate SQL migration
  async generateSQLMigration(
    tableName: string,
    columns: any[],
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`SQL migration for ${tableName}`);

    const prompt = `Generate a SQL migration to create a table named ${tableName} with the following columns:
    ${columns.map(col => `- ${col.name}: ${col.type} ${col.constraints || ''}`).join('\n')}

    Requirements:
    - Use PostgreSQL syntax (for Supabase)
    - Include proper primary keys and constraints
    - Add indexes for performance
    - Include Row Level Security (RLS) policies
    - Add sample seed data
    - Include helpful comments

    Return only the SQL migration code.`;

    return await this.aiClient.generateText(
      'You are an expert database developer creating PostgreSQL migrations for a Spotify clone.',
      prompt
    );
  }

  // Generate TypeScript types
  async generateTypeDefinitions(
    interfaceName: string,
    properties: any[],
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`TypeScript types for ${interfaceName}`);

    const prompt = `Generate TypeScript interface definitions for ${interfaceName} with the following properties:
    ${properties.map(prop => `- ${prop.name}: ${prop.type} ${prop.optional ? '(optional)' : ''}`).join('\n')}

    Requirements:
    - Use proper TypeScript syntax
    - Include JSDoc comments
    - Add utility types if needed
    - Include proper export statements
    - Follow TypeScript best practices

    Return only the TypeScript type definitions.`;

    return await this.aiClient.generateText(
      'You are an expert TypeScript developer creating type definitions for a Spotify clone.',
      prompt
    );
  }

  // Generate Supabase client configuration
  async generateSupabaseClient(options: CodeGenerationOptions = {}): Promise<string> {
    this.logger.generating('Supabase client configuration');

    const code = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types - will be generated based on your schema
export type Database = {
  public: {
    Tables: {
      // Tables will be defined here
    };
    Views: {
      // Views will be defined here
    };
    Functions: {
      // Functions will be defined here
    };
  };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
`;

    return code;
  }

  // Generate environment variables file
  async generateEnvFile(options: CodeGenerationOptions = {}): Promise<string> {
    this.logger.generating('Environment variables file');

    const code = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Provider Configuration (choose one or more)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key

# Database Agent Configuration
DB_AGENT_DEFAULT_PROVIDER=openai
DB_AGENT_LOG_LEVEL=info
`;

    return code;
  }

  // Generate custom hook for data fetching
  async generateCustomHook(
    hookName: string,
    apiEndpoint: string,
    returnType: string,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`Custom hook: ${hookName}`);

    const prompt = `Generate a custom React hook named ${hookName} that fetches data from ${apiEndpoint}.

    Return type: ${returnType}

    Requirements:
    - Use TypeScript
    - Include loading and error states
    - Use proper React hooks (useState, useEffect, useCallback)
    - Include error handling
    - Support refetch functionality
    - Include JSDoc comments
    - Follow React hooks best practices

    Return only the TypeScript hook code.`;

    return await this.aiClient.generateText(
      'You are an expert React developer creating custom hooks for a Spotify clone.',
      prompt
    );
  }

  // Generate utility functions
  async generateUtilities(
    utilityName: string,
    functionality: string,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating(`Utility functions: ${utilityName}`);

    const prompt = `Generate utility functions for ${utilityName} with the following functionality: ${functionality}.

    Requirements:
    - Use TypeScript
    - Include proper error handling
    - Add unit test examples
    - Include JSDoc comments
    - Follow functional programming principles where appropriate
    - Include proper export statements

    Return only the TypeScript utility code.`;

    return await this.aiClient.generateText(
      'You are an expert TypeScript developer creating utility functions for a Spotify clone.',
      prompt
    );
  }

  // Generate package.json updates
  async generatePackageJsonUpdates(
    newDependencies: string[],
    currentPackageJson: any,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating('Package.json updates');

    const updatedPackageJson = {
      ...currentPackageJson,
      dependencies: {
        ...currentPackageJson.dependencies,
        ...newDependencies.reduce((acc, dep) => {
          acc[dep] = 'latest';
          return acc;
        }, {} as Record<string, string>)
      }
    };

    return JSON.stringify(updatedPackageJson, null, 2);
  }

  // Generate README documentation
  async generateReadme(
    projectContext: ProjectContext,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    this.logger.generating('README documentation');

    const prompt = `Generate a comprehensive README.md file for a Spotify clone project with the following context:
    - Components: ${projectContext.components.length}
    - API routes: ${projectContext.existingAPIs.length}
    - Database tables: ${projectContext.databaseSchema.length}
    - Dependencies: ${projectContext.dependencies.join(', ')}

    Include:
    - Project description
    - Setup instructions
    - Database setup with Supabase
    - CLI tool usage
    - API documentation
    - Development workflow
    - Contributing guidelines

    Return only the Markdown content.`;

    return await this.aiClient.generateText(
      'You are a technical writer creating documentation for a Spotify clone project.',
      prompt
    );
  }

  // Helper method to format code with proper indentation
  private formatCode(code: string, language: string): string {
    // Simple code formatting - in a real implementation, you'd use a proper formatter
    return code.trim();
  }

  // Helper method to validate generated code
  private validateCode(code: string, language: string): boolean {
    // Basic validation - in a real implementation, you'd use proper linting
    return code.length > 0 && !code.includes('undefined');
  }
} 