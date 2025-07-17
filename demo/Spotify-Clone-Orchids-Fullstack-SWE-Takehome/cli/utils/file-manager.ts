import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger';

export interface FileOperation {
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  backup?: string;
}

export class FileManager {
  private logger: Logger;
  private operationHistory: FileOperation[] = [];
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.logger = new Logger();
    this.projectRoot = projectRoot;
  }

  // Create a new file
  async createFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    const dir = path.dirname(fullPath);

    try {
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Check if file already exists
      const exists = await this.fileExists(fullPath);
      if (exists) {
        throw new Error(`File already exists: ${relativePath}`);
      }

      // Write file
      await fs.writeFile(fullPath, content, 'utf8');
      
      // Log operation
      this.logger.writing(relativePath);
      this.operationHistory.push({
        type: 'create',
        path: relativePath,
        content
      });
    } catch (error) {
      throw new Error(`Failed to create file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update an existing file
  async updateFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, relativePath);

    try {
      // Create backup of existing file
      const backup = await this.createBackup(fullPath);
      
      // Write new content
      await fs.writeFile(fullPath, content, 'utf8');
      
      // Log operation
      this.logger.writing(relativePath);
      this.operationHistory.push({
        type: 'update',
        path: relativePath,
        content,
        backup
      });
    } catch (error) {
      throw new Error(`Failed to update file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Read file content
  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    
    try {
      return await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Check if file exists
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Create backup of file
  private async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, content, 'utf8');
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Delete file
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, relativePath);

    try {
      // Create backup before deletion
      const backup = await this.createBackup(fullPath);
      
      // Delete file
      await fs.unlink(fullPath);
      
      // Log operation
      this.logger.info(`Deleted file: ${relativePath}`);
      this.operationHistory.push({
        type: 'delete',
        path: relativePath,
        backup
      });
    } catch (error) {
      throw new Error(`Failed to delete file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // List files in directory
  async listFiles(relativePath: string): Promise<string[]> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    
    try {
      const files = await fs.readdir(fullPath);
      return files;
    } catch (error) {
      throw new Error(`Failed to list files in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Ensure directory exists
  async ensureDirectory(relativePath: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get file stats
  async getFileStats(relativePath: string): Promise<any> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    
    try {
      return await fs.stat(fullPath);
    } catch (error) {
      throw new Error(`Failed to get stats for ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Rollback operations
  async rollbackOperations(): Promise<void> {
    this.logger.info('Starting rollback of operations...');
    
    // Reverse the operations
    const reversedOperations = [...this.operationHistory].reverse();
    
    for (const operation of reversedOperations) {
      try {
        switch (operation.type) {
          case 'create':
            // Delete the created file
            await fs.unlink(path.resolve(this.projectRoot, operation.path));
            this.logger.info(`Rolled back creation of ${operation.path}`);
            break;
            
          case 'update':
            // Restore from backup
            if (operation.backup) {
              const originalPath = path.resolve(this.projectRoot, operation.path);
              const content = await fs.readFile(operation.backup, 'utf8');
              await fs.writeFile(originalPath, content, 'utf8');
              await fs.unlink(operation.backup); // Clean up backup
              this.logger.info(`Rolled back update of ${operation.path}`);
            }
            break;
            
          case 'delete':
            // Restore from backup
            if (operation.backup) {
              const originalPath = path.resolve(this.projectRoot, operation.path);
              const content = await fs.readFile(operation.backup, 'utf8');
              await fs.writeFile(originalPath, content, 'utf8');
              await fs.unlink(operation.backup); // Clean up backup
              this.logger.info(`Rolled back deletion of ${operation.path}`);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to rollback operation for ${operation.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Clear operation history
    this.operationHistory = [];
    this.logger.success('Rollback completed');
  }

  // Clear operation history
  clearHistory(): void {
    this.operationHistory = [];
  }

  // Get operation history
  getHistory(): FileOperation[] {
    return [...this.operationHistory];
  }

  // Clean up backup files
  async cleanupBackups(): Promise<void> {
    for (const operation of this.operationHistory) {
      if (operation.backup) {
        try {
          await fs.unlink(operation.backup);
        } catch (error) {
          // Ignore errors when cleaning up backups
        }
      }
    }
  }
} 