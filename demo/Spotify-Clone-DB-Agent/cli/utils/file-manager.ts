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

  // Delete file
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    
    try {
      await fs.unlink(fullPath);
      this.logger.info(`Deleted file: ${relativePath}`);
      
      // Record deletion operation
      this.operationHistory.push({
        type: 'delete',
        path: relativePath
      });
    } catch (error) {
      throw new Error(`Failed to delete file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
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

/**
 * Extracts a hardcoded array from a TypeScript file by array variable name.
 * Enhanced implementation with better regex matching and error handling.
 * @param filePath Path to the TypeScript file
 * @param arrayName Name of the array variable to extract
 * @returns Parsed array as JavaScript objects, or null if not found/parseable
 */
export async function extractArrayFromFile(filePath: string, arrayName: string): Promise<any[] | null> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const fileContent = fs.readFileSync(absPath, 'utf8');
    
    // First, try to extract from backup files if this is a migrated component
    if (filePath.includes('spotify-main-content.tsx')) {
      const backupResult = await extractArrayFromBackupFile(filePath, arrayName);
      if (backupResult && backupResult.length > 0) {
        console.log(`Successfully extracted ${backupResult.length} items from backup file for ${arrayName}`);
        return backupResult;
      }
    }
    
    // Try multiple extraction patterns
    const patterns = [
      // Pattern 1: const arrayName = [ ... ]
      new RegExp(`const\\s+${arrayName}\\s*=\\s*(\\[[\\s\\S]*?\\])(?=\\s*(?:const|let|var|function|export|$))`, 'm'),
      // Pattern 2: set<ArrayName>([...]) within try-catch blocks
      new RegExp(`set${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}\\s*\\(\\s*(\\[[\\s\\S]*?\\])\\s*\\)`, 'm'),
      // Pattern 3: Fallback data within error handling
      new RegExp(`//\\s*Fallback.*?${arrayName}[\\s\\S]*?(\\[[\\s\\S]*?\\])`, 'i'),
      // Pattern 4: Assignment within catch blocks
      new RegExp(`${arrayName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*(?=\\}|$)`, 'm')
    ];
    
    for (const pattern of patterns) {
      const match = fileContent.match(pattern);
      if (match) {
        const arrayString = match[1];
        console.log(`Found array string for ${arrayName} using pattern: ${arrayString.substring(0, 200)}...`);
        
        const result = await parseArrayString(arrayString);
        if (result && result.length > 0) {
          return result;
        }
      }
    }
    
    console.log(`No match found for array: ${arrayName}`);
    return null;
  } catch (err) {
    console.error(`Error extracting array ${arrayName}:`, err);
    return null;
  }
}

/**
 * Extracts hardcoded arrays from backup files containing the original fallback data.
 * @param originalFilePath Path to the original component file
 * @param arrayName Name of the array variable to extract
 * @returns Parsed array as JavaScript objects, or null if not found
 */
export async function extractArrayFromBackupFile(originalFilePath: string, arrayName: string): Promise<any[] | null> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const dir = path.dirname(originalFilePath);
    const basename = path.basename(originalFilePath, '.tsx');
    
    // Find backup files with the original hardcoded data
    const backupFiles = fs.readdirSync(dir)
      .filter((file: string) => file.startsWith(`${basename}.tsx.backup.`))
      .sort((a: string, b: string) => {
        const aTime = parseInt(a.split('.backup.')[1]);
        const bTime = parseInt(b.split('.backup.')[1]);
        return bTime - aTime; // Most recent first
      });
    
    for (const backupFile of backupFiles) {
      const backupPath = path.join(dir, backupFile);
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      
      // Look for fallback data patterns in backup files
      const patterns = [
        // Pattern 1: set<ArrayName>([...]) calls
        new RegExp(`set${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}\\s*\\(\\s*(\\[[\\s\\S]*?\\])\\s*\\)`, 'm'),
        // Pattern 2: Fallback arrays within catch blocks
        new RegExp(`//\\s*Fallback.*?${arrayName}[\\s\\S]*?(\\[[\\s\\S]*?\\])`, 'i'),
        // Pattern 3: Direct assignment in error handling
        new RegExp(`${arrayName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*(?=\\}|setMadeForYou|setPopularAlbums|finally)`, 'm')
      ];
      
      for (const pattern of patterns) {
        const match = backupContent.match(pattern);
        if (match) {
          const arrayString = match[1];
          console.log(`Found array in backup file ${backupFile} for ${arrayName}`);
          
          const result = await parseArrayString(arrayString);
          if (result && result.length > 0) {
            return result;
          }
        }
      }
    }
    
    console.log(`No backup files found with data for ${arrayName}`);
    return null;
  } catch (err) {
    console.error(`Error extracting array from backup files for ${arrayName}:`, err);
    return null;
  }
}

/**
 * Parses an array string into JavaScript objects with proper error handling.
 * @param arrayString The array string to parse
 * @returns Parsed array or null if parsing fails
 */
async function parseArrayString(arrayString: string): Promise<any[] | null> {
  try {
    // Clean up the array string and handle multi-line formatting
    const cleanedArrayString = arrayString
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/,\s*\]/g, ']') // Remove trailing commas
      .trim();
    
    // Use Function constructor to safely parse the array
    // This handles object literals better than JSON.parse
    const arr = Function(`"use strict"; return (${cleanedArrayString})`)();
    
    if (Array.isArray(arr)) {
      console.log(`Successfully parsed ${arr.length} items`);
      return arr;
    }
    
    console.log(`Parsed data is not an array`);
    return null;
  } catch (err) {
    console.error(`Error parsing array string:`, err);
    return null;
  }
}