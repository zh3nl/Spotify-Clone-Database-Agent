import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { APIConfigResolver, APIConfiguration } from './api-config-resolver';
import { APITemplateEngine } from './api-template-engine';
import { APIExistenceChecker, ExistenceCheckResult } from './api-existence-checker';

export interface APICreationResult {
  success: boolean;
  config: APIConfiguration | null;
  existenceCheck: ExistenceCheckResult | null;
  filePath: string | null;
  backupPath: string | null;
  generated: boolean;
  skipped: boolean;
  error: string | null;
  details: string;
}

export interface APICreationOptions {
  forceOverwrite?: boolean;
  createBackup?: boolean;
  dryRun?: boolean;
}

export class APIRouteOrchestrator {
  private logger: Logger;
  private configResolver: APIConfigResolver;
  private templateEngine: APITemplateEngine;
  private existenceChecker: APIExistenceChecker;

  constructor() {
    this.logger = new Logger();
    this.configResolver = new APIConfigResolver();
    this.templateEngine = new APITemplateEngine();
    this.existenceChecker = new APIExistenceChecker();
  }

  /**
   * Main orchestration method - creates API route if needed
   */
  async createAPIRouteIfNeeded(
    operationDescription: string,
    tableName: string,
    options: APICreationOptions = {}
  ): Promise<APICreationResult> {
    this.logger.section(' API Route Auto-Generation');
    this.logger.info(` Table: ${tableName}`);

    try {
      // Phase 1: Resolve API Configuration
      const config = this.configResolver.resolveAPIConfig(operationDescription, tableName);
      
      if (!config) {
        return this.createNoConfigResult(operationDescription);
      }

      this.logger.info(` Resolved API configuration:`);
      this.logger.info(this.configResolver.getConfigInfo(config));

      // Phase 2: Check Existence
      const existenceCheck = await this.existenceChecker.checkAPIExistence(config);

      // Phase 3: Decide Action
      const action = this.decideAction(existenceCheck, options);

      switch (action) {
        case 'skip':
          return this.createSkippedResult(config, existenceCheck);
        
        case 'create':
          return await this.createNewAPI(config, existenceCheck, options);
        
        case 'update':
          return await this.updateExistingAPI(config, existenceCheck, options);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      this.logger.error(` API creation failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createErrorResult(operationDescription, error);
    }
  }

  /**
   * Decides what action to take based on existence check
   */
  private decideAction(
    existenceCheck: ExistenceCheckResult,
    options: APICreationOptions
  ): 'skip' | 'create' | 'update' {
    if (!existenceCheck.exists) {
      return 'create';
    }

    if (options.forceOverwrite) {
      return 'update';
    }

    if (existenceCheck.shouldSkip) {
      return 'skip';
    }

    if (existenceCheck.shouldUpdate) {
      return 'update';
    }

    return 'skip'; 
  }

  /**
   * Creates a new API route
   */
  private async createNewAPI(
    config: APIConfiguration,
    existenceCheck: ExistenceCheckResult,
    options: APICreationOptions
  ): Promise<APICreationResult> {
    this.logger.info(` Creating new API route: ${config.endpoint}`);

    if (options.dryRun) {
      return this.createDryRunResult(config, 'create');
    }

    try {
      // Ensure directory exists
      await this.existenceChecker.ensureAPIDirectory(config.filePath);

      // Generate API code
      const apiCode = this.templateEngine.generateAPICode(config);

      // Write file
      const fullPath = path.resolve(process.cwd(), config.filePath);
      await fs.writeFile(fullPath, apiCode, 'utf-8');

      this.logger.success(` API route created successfully: ${config.filePath}`);
      
      return {
        success: true,
        config,
        existenceCheck,
        filePath: config.filePath,
        backupPath: null,
        generated: true,
        skipped: false,
        error: null,
        details: `New API route created with ${config.methods.join(', ')} methods`
      };

    } catch (error) {
      this.logger.error(` Failed to create API file: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Updates an existing API route
   */
  private async updateExistingAPI(
    config: APIConfiguration,
    existenceCheck: ExistenceCheckResult,
    options: APICreationOptions
  ): Promise<APICreationResult> {
    this.logger.warn(` Updating existing API route: ${config.endpoint}`);
    this.logger.warn(` Reason: ${existenceCheck.analysisDetails.split('\n')[0]}`);

    if (options.dryRun) {
      return this.createDryRunResult(config, 'update');
    }

    try {
      let backupPath: string | null = null;

      // Create backup if requested
      if (options.createBackup !== false) { // Default to true
        backupPath = await this.existenceChecker.createBackup(config.filePath);
      }

      // Generate new API code
      const apiCode = this.templateEngine.generateAPICode(config);

      // Write updated file
      const fullPath = path.resolve(process.cwd(), config.filePath);
      await fs.writeFile(fullPath, apiCode, 'utf-8');

      this.logger.success(` API route updated successfully: ${config.filePath}`);
      
      return {
        success: true,
        config,
        existenceCheck,
        filePath: config.filePath,
        backupPath,
        generated: true,
        skipped: false,
        error: null,
        details: `Existing API route updated. Missing methods: ${existenceCheck.missingMethods.join(', ') || 'none'}`
      };

    } catch (error) {
      this.logger.error(` Failed to update API file: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Creates result objects for different scenarios
   */
  private createNoConfigResult(operationDescription: string): APICreationResult {
    this.logger.info(` No API configuration found for: "${operationDescription}"`);
    this.logger.info(` This operation doesn't require an API route`);

    return {
      success: true,
      config: null,
      existenceCheck: null,
      filePath: null,
      backupPath: null,
      generated: false,
      skipped: true,
      error: null,
      details: 'No API configuration found - operation does not require API route'
    };
  }

  private createSkippedResult(
    config: APIConfiguration,
    existenceCheck: ExistenceCheckResult
  ): APICreationResult {
    this.logger.success(` API route already exists and is complete: ${config.endpoint}`);
    this.logger.info(` File: ${config.filePath}`);
    this.logger.info(` Size: ${existenceCheck.fileSize} bytes, Modified: ${existenceCheck.lastModified?.toISOString()}`);

    return {
      success: true,
      config,
      existenceCheck,
      filePath: config.filePath,
      backupPath: null,
      generated: false,
      skipped: true,
      error: null,
      details: 'API route already exists and is complete - skipped creation'
    };
  }

  private createDryRunResult(config: APIConfiguration, action: 'create' | 'update'): APICreationResult {
    this.logger.info(` DRY RUN: Would ${action} API route: ${config.endpoint}`);
    
    return {
      success: true,
      config,
      existenceCheck: null,
      filePath: config.filePath,
      backupPath: null,
      generated: false,
      skipped: false,
      error: null,
      details: `DRY RUN: Would ${action} API route at ${config.filePath}`
    };
  }

  private createErrorResult(operationDescription: string, error: any): APICreationResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      config: null,
      existenceCheck: null,
      filePath: null,
      backupPath: null,
      generated: false,
      skipped: false,
      error: errorMessage,
      details: `Failed to create API route for: "${operationDescription}". Error: ${errorMessage}`
    };
  }

  /**
   * Validates the complete system setup
   */
  async validateSystemSetup(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if all utility classes are working
      const testConfig = this.configResolver.resolveAPIConfig('test albums table', 'albums');
      if (!testConfig) {
        issues.push('APIConfigResolver: Cannot resolve test configuration');
      }

      // Check if we can generate code
      if (testConfig) {
        const testCode = this.templateEngine.generateAPICode(testConfig);
        if (!testCode || testCode.length < 100) {
          issues.push('APITemplateEngine: Generated code appears invalid');
        }
      }

      // Check if filesystem operations work
      const testPath = 'test-api-check.tmp';
      try {
        await fs.writeFile(testPath, 'test', 'utf-8');
        await fs.unlink(testPath);
      } catch (fsError) {
        issues.push(`Filesystem: Cannot write test files (${fsError})`);
      }

    } catch (error) {
      issues.push(`General: System validation failed (${error})`);
    }

    const isValid = issues.length === 0;
    
    if (isValid) {
      this.logger.success(' API Route Orchestrator system validation passed');
    } else {
      this.logger.error(' API Route Orchestrator system validation failed:');
      issues.forEach(issue => this.logger.error(`  • ${issue}`));
    }

    return { isValid, issues };
  }

  /**
   * Gets information about all supported API configurations
   */
  getSupportedConfigurations(): APIConfiguration[] {
    return this.configResolver.getAllSupportedConfigs();
  }

  /**
   * Preview what would be generated for a given operation
   */
  async previewAPIGeneration(operationDescription: string, tableName: string): Promise<{
    config: APIConfiguration | null;
    wouldCreate: boolean;
    reason: string;
    previewCode?: string;
  }> {
    const config = this.configResolver.resolveAPIConfig(operationDescription, tableName);
    
    if (!config) {
      return {
        config: null,
        wouldCreate: false,
        reason: 'No API configuration found for this operation'
      };
    }

    const existenceCheck = await this.existenceChecker.checkAPIExistence(config);
    const wouldCreate = !existenceCheck.shouldSkip;
    
    let reason: string;
    if (existenceCheck.shouldSkip) {
      reason = 'API already exists and is complete';
    } else if (!existenceCheck.exists) {
      reason = 'API does not exist - would create new';
    } else {
      reason = `API exists but incomplete - would update (missing: ${existenceCheck.missingMethods.join(', ')})`;
    }

    const previewCode = wouldCreate ? this.templateEngine.generateAPICode(config) : undefined;

    return {
      config,
      wouldCreate,
      reason,
      previewCode
    };
  }
}