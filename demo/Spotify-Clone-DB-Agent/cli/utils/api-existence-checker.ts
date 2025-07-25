import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { APIConfiguration, HTTPMethod } from './api-config-resolver';

export interface ExistenceCheckResult {
  exists: boolean;
  isComplete: boolean;
  hasAllMethods: boolean;
  missingMethods: HTTPMethod[];
  fileSize: number;
  lastModified: Date | null;
  shouldSkip: boolean;
  shouldUpdate: boolean;
  analysisDetails: string;
}

export class APIExistenceChecker {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Performs comprehensive existence and completeness check
   */
  async checkAPIExistence(config: APIConfiguration): Promise<ExistenceCheckResult> {
    this.logger.info(` Checking existence for: ${config.filePath}`);

    const fullPath = path.resolve(process.cwd(), config.filePath);
    
    try {
      // Check if file exists
      const stats = await fs.stat(fullPath);
      
      if (!stats.isFile()) {
        return this.createNotExistsResult();
      }

      // File exists, analyze its content
      const content = await fs.readFile(fullPath, 'utf-8');
      const analysis = await this.analyzeAPIContent(content, config);

      const result: ExistenceCheckResult = {
        exists: true,
        isComplete: analysis.isComplete,
        hasAllMethods: analysis.hasAllMethods,
        missingMethods: analysis.missingMethods,
        fileSize: stats.size,
        lastModified: stats.mtime,
        shouldSkip: analysis.isComplete && analysis.hasAllMethods,
        shouldUpdate: !analysis.isComplete || !analysis.hasAllMethods,
        analysisDetails: analysis.details
      };

      this.logExistenceResult(config, result);
      return result;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist
        const result = this.createNotExistsResult();
        this.logger.info(` File does not exist: ${config.filePath}`);
        return result;
      }

      // Other error (permission, etc.)
      this.logger.error(` Error checking file existence: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Analyzes the content of an existing API file
   */
  private async analyzeAPIContent(content: string, config: APIConfiguration): Promise<{
    isComplete: boolean;
    hasAllMethods: boolean;
    missingMethods: HTTPMethod[];
    details: string;
  }> {
    const analysis = {
      hasImports: this.checkImports(content),
      hasSupabaseImport: this.checkSupabaseImport(content),
      methods: this.findHTTPMethods(content),
      hasErrorHandling: this.checkErrorHandling(content),
      hasValidTransforms: this.checkTransforms(content, config),
      hasProperStructure: this.checkAPIStructure(content)
    };

    const foundMethods = analysis.methods;
    const expectedMethods = config.methods;
    const missingMethods = expectedMethods.filter(method => !foundMethods.includes(method));
    const hasAllMethods = missingMethods.length === 0;

    const isComplete = (
      analysis.hasImports &&
      analysis.hasSupabaseImport &&
      hasAllMethods &&
      analysis.hasErrorHandling &&
      analysis.hasProperStructure
    );

    const details = this.generateAnalysisDetails(analysis, foundMethods, expectedMethods, missingMethods);

    return {
      isComplete,
      hasAllMethods,
      missingMethods,
      details
    };
  }

  /**
   * Checks for required imports
   */
  private checkImports(content: string): boolean {
    return (
      content.includes('NextRequest') &&
      content.includes('NextResponse') &&
      content.includes('from \'next/server\'')
    );
  }

  /**
   * Checks for Supabase import
   */
  private checkSupabaseImport(content: string): boolean {
    return content.includes('from \'@/lib/supabase\'') || content.includes('from "@/lib/supabase"');
  }

  /**
   * Finds HTTP methods defined in the file
   */
  private findHTTPMethods(content: string): HTTPMethod[] {
    const methods: HTTPMethod[] = [];
    
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');

    return methods;
  }

  /**
   * Checks for proper error handling
   */
  private checkErrorHandling(content: string): boolean {
    return (
      content.includes('try {') &&
      content.includes('} catch') &&
      content.includes('error.message') &&
      content.includes('status: 500')
    );
  }

  /**
   * Checks for proper data transforms based on API type
   */
  private checkTransforms(content: string, config: APIConfiguration): boolean {
    switch (config.transformPattern) {
      case 'album_transform':
        return (
          content.includes('albumArt') ||
          content.includes('popularityScore') ||
          content.includes('image_url')
        );
      case 'playlist_transform':
        return (
          content.includes('playlist_type') ||
          content.includes('playlistType') ||
          content.includes('personalized')
        );
      case 'track_transform':
        return (
          content.includes('played_at') ||
          content.includes('playedAt') ||
          content.includes('track_name')
        );
      default:
        return true; // Basic transform is always valid
    }
  }

  /**
   * Checks for proper API structure
   */
  private checkAPIStructure(content: string): boolean {
    return (
      content.includes('.from(') &&
      content.includes('.select(') &&
      content.includes('supabase') &&
      content.includes('NextResponse.json')
    );
  }

  /**
   * Creates result for non-existent file
   */
  private createNotExistsResult(): ExistenceCheckResult {
    return {
      exists: false,
      isComplete: false,
      hasAllMethods: false,
      missingMethods: [],
      fileSize: 0,
      lastModified: null,
      shouldSkip: false,
      shouldUpdate: false,
      analysisDetails: 'File does not exist'
    };
  }

  /**
   * Generates detailed analysis report
   */
  private generateAnalysisDetails(
    analysis: any,
    foundMethods: HTTPMethod[],
    expectedMethods: HTTPMethod[],
    missingMethods: HTTPMethod[]
  ): string {
    const details = [
      `✅ Imports: ${analysis.hasImports ? 'Present' : 'Missing'}`,
      `✅ Supabase: ${analysis.hasSupabaseImport ? 'Present' : 'Missing'}`,
      `✅ Methods: ${foundMethods.join(', ')} (Expected: ${expectedMethods.join(', ')})`,
      `✅ Error Handling: ${analysis.hasErrorHandling ? 'Present' : 'Missing'}`,
      `✅ Transforms: ${analysis.hasValidTransforms ? 'Valid' : 'Invalid/Missing'}`,
      `✅ Structure: ${analysis.hasProperStructure ? 'Valid' : 'Invalid'}`
    ];

    if (missingMethods.length > 0) {
      details.push(`⚠️ Missing Methods: ${missingMethods.join(', ')}`);
    }

    return details.join('\n');
  }

  /**
   * Logs the existence check result
   */
  private logExistenceResult(config: APIConfiguration, result: ExistenceCheckResult): void {
    if (!result.exists) {
      this.logger.info(` API file not found: ${config.filePath}`);
      this.logger.info(` Will create new API route`);
      return;
    }

    this.logger.info(` API file exists: ${config.filePath}`);
    this.logger.info(` File size: ${result.fileSize} bytes`);
    this.logger.info(` Last modified: ${result.lastModified?.toISOString()}`);

    if (result.shouldSkip) {
      this.logger.success(` API is complete and functional - will skip creation`);
    } else if (result.shouldUpdate) {
      this.logger.warn(` API exists but may need updates:`);
      if (result.missingMethods.length > 0) {
        this.logger.warn(` Missing methods: ${result.missingMethods.join(', ')}`);
      }
      if (!result.isComplete) {
        this.logger.warn(` Implementation appears incomplete`);
      }
    }

  }

  /**
   * Checks if directory exists and creates it if needed
   */
  async ensureAPIDirectory(filePath: string): Promise<void> {
    const dirPath = path.dirname(path.resolve(process.cwd(), filePath));
    
    try {
      await fs.access(dirPath);
      this.logger.info(` Directory exists: ${dirPath}`);
    } catch (error) {
      this.logger.info(` Creating directory: ${dirPath}`);
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.success(` Directory created successfully`);
    }
  }

  /**
   * Creates a backup of existing file before overwriting
   */
  async createBackup(filePath: string): Promise<string | null> {
    const fullPath = path.resolve(process.cwd(), filePath);
    
    try {
      await fs.access(fullPath);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${fullPath}.backup.${timestamp}`;
      
      await fs.copyFile(fullPath, backupPath);
      this.logger.success(` Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(` Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
      }
      return null;
    }
  }
}