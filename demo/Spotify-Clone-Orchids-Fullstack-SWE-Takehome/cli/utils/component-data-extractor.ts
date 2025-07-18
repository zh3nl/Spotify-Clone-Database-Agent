import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger';

export interface DataArray {
  name: string;
  filePath: string;
  data: any[];
  schema: Record<string, string>;
  totalRecords: number;
}

export interface ExtractedData {
  arrayName: string;
  sourceFile: string;
  records: any[];
  schema: Record<string, string>;
}

export class ComponentDataExtractor {
  private logger = new Logger();
  private projectRoot: string;
  
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Extract all data arrays from a React component file
   */
  async extractDataArrays(componentPath: string): Promise<DataArray[]> {
    this.logger.analyzing(`Extracting data arrays from ${componentPath}`);
    
    try {
      const fullPath = path.resolve(this.projectRoot, componentPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const arrays: DataArray[] = [];
      
      // Parse recentlyPlayed array
      const recentlyPlayedMatch = this.extractArrayFromContent(content, 'recentlyPlayed');
      if (recentlyPlayedMatch) {
        arrays.push({
          name: 'recentlyPlayed',
          filePath: componentPath,
          data: recentlyPlayedMatch.data,
          schema: recentlyPlayedMatch.schema,
          totalRecords: recentlyPlayedMatch.data.length
        });
      }
      
      // Parse madeForYou array
      const madeForYouMatch = this.extractArrayFromContent(content, 'madeForYou');
      if (madeForYouMatch) {
        arrays.push({
          name: 'madeForYou',
          filePath: componentPath,
          data: madeForYouMatch.data,
          schema: madeForYouMatch.schema,
          totalRecords: madeForYouMatch.data.length
        });
      }
      
      // Parse popularAlbums array
      const popularAlbumsMatch = this.extractArrayFromContent(content, 'popularAlbums');
      if (popularAlbumsMatch) {
        arrays.push({
          name: 'popularAlbums',
          filePath: componentPath,
          data: popularAlbumsMatch.data,
          schema: popularAlbumsMatch.schema,
          totalRecords: popularAlbumsMatch.data.length
        });
      }
      
      this.logger.success(`Found ${arrays.length} data arrays with ${arrays.reduce((sum, arr) => sum + arr.totalRecords, 0)} total records`);
      return arrays;
      
    } catch (error) {
      this.logger.error(`Failed to extract data arrays: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Match a user query to the appropriate data array
   */
  async matchQueryToDataArray(query: string): Promise<DataArray | null> {
    const componentPath = 'src/components/spotify-main-content.tsx';
    const arrays = await this.extractDataArrays(componentPath);
    
    const queryLower = query.toLowerCase();
    
    // Query pattern matching
    if (queryLower.includes('recently played') || queryLower.includes('recent')) {
      const array = arrays.find(arr => arr.name === 'recentlyPlayed');
      if (array) {
        this.logger.info(`Matched query to recentlyPlayed array (${array.totalRecords} records)`);
        return array;
      }
    }
    
    if (queryLower.includes('made for you') || queryLower.includes('made for') || queryLower.includes('recommendations')) {
      const array = arrays.find(arr => arr.name === 'madeForYou');
      if (array) {
        this.logger.info(`Matched query to madeForYou array (${array.totalRecords} records)`);
        return array;
      }
    }
    
    if (queryLower.includes('popular albums') || queryLower.includes('popular') || queryLower.includes('albums')) {
      const array = arrays.find(arr => arr.name === 'popularAlbums');
      if (array) {
        this.logger.info(`Matched query to popularAlbums array (${array.totalRecords} records)`);
        return array;
      }
    }
    
    this.logger.info('No matching data array found for query');
    return null;
  }

  /**
   * Transform data array to match database schema
   */
  async transformDataForDatabase(dataArray: DataArray, tableName: string): Promise<any[]> {
    this.logger.info(`Transforming ${dataArray.totalRecords} records for table: ${tableName}`);
    
    return dataArray.data.map((item, index) => {
      const baseRecord = {
        id: item.id || `${tableName}_${index + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Transform based on data array type
      if (dataArray.name === 'recentlyPlayed') {
        return {
          ...baseRecord,
          title: item.title,
          artist: item.artist,
          album: item.album,
          image: item.image,
          duration: item.duration
        };
      }

      if (dataArray.name === 'madeForYou') {
        return {
          ...baseRecord,
          title: item.title,
          description: item.description || 'Made for you playlist',
          image: item.image,
          duration: item.duration
        };
      }

      if (dataArray.name === 'popularAlbums') {
        return {
          ...baseRecord,
          title: item.title,
          artist: item.artist,
          image: item.image,
          duration: item.duration
        };
      }

      // Generic transformation for other arrays
      return {
        ...baseRecord,
        ...item
      };
    });
  }

  /**
   * Get all available data arrays for a component
   */
  async getAvailableDataArrays(componentPath: string): Promise<string[]> {
    const arrays = await this.extractDataArrays(componentPath);
    return arrays.map(arr => arr.name);
  }

  /**
   * Get detailed information about a specific data array
   */
  async getDataArrayInfo(arrayName: string, componentPath: string): Promise<DataArray | null> {
    const arrays = await this.extractDataArrays(componentPath);
    return arrays.find(arr => arr.name === arrayName) || null;
  }

  /**
   * Extract a specific array from component content
   */
  private extractArrayFromContent(content: string, arrayName: string): { data: any[], schema: Record<string, string> } | null {
    // Create a regex pattern to match the array declaration
    const arrayPattern = new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\](?=\\s*(?:const|function|export|\\}|$))`, 'i');
    const match = content.match(arrayPattern);
    
    if (!match) {
      return null;
    }

    try {
      const arrayContent = match[1];
      const data = this.parseArrayData(arrayContent);
      const schema = this.inferSchema(data);
      
      return { data, schema };
    } catch (error) {
      this.logger.warn(`Failed to parse ${arrayName} array: ${error}`);
      return null;
    }
  }

  /**
   * Parse JavaScript array string into actual objects
   */
  private parseArrayData(arrayString: string): any[] {
    try {
      // Clean up the array string
      let cleanedString = arrayString.trim();
      
      // Handle object array parsing
      const objects: any[] = [];
      
      // Split by object boundaries (looking for { ... },)
      const objectMatches = cleanedString.match(/\{[^}]*\}/g);
      
      if (objectMatches) {
        for (const objectMatch of objectMatches) {
          try {
            // Convert JavaScript object notation to JSON
            let jsonString = objectMatch
              .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Add quotes to property names
              .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double quotes
              .replace(/:\s*([^",}\s]+)(?=\s*[,}])/g, (match, value) => {
                // Handle non-quoted values
                if (value === 'true' || value === 'false' || value === 'null' || /^\d+$/.test(value)) {
                  return `: ${value}`;
                }
                return `: "${value}"`;
              });
            
            const parsedObject = JSON.parse(jsonString);
            objects.push(parsedObject);
          } catch (objError) {
            this.logger.warn(`Failed to parse object: ${objectMatch}`);
          }
        }
      }
      
      return objects;
    } catch (error) {
      this.logger.warn(`Failed to parse array data: ${error}`);
      return [];
    }
  }

  /**
   * Infer schema from parsed data
   */
  private inferSchema(data: any[]): Record<string, string> {
    if (!data || data.length === 0) {
      return {};
    }

    const schema: Record<string, string> = {};
    const firstItem = data[0];
    
    for (const [key, value] of Object.entries(firstItem)) {
      if (typeof value === 'string') {
        schema[key] = 'TEXT';
      } else if (typeof value === 'number') {
        schema[key] = 'INTEGER';
      } else if (typeof value === 'boolean') {
        schema[key] = 'BOOLEAN';
      } else if (value instanceof Date) {
        schema[key] = 'TIMESTAMP WITH TIME ZONE';
      } else {
        schema[key] = 'TEXT'; // Default fallback
      }
    }
    
    return schema;
  }

  /**
   * Generate a summary of extracted data
   */
  async generateDataSummary(componentPath: string): Promise<string> {
    const arrays = await this.extractDataArrays(componentPath);
    
    if (arrays.length === 0) {
      return 'No data arrays found in component';
    }

    const summary = arrays.map(arr => {
      const sampleRecord = arr.data[0];
      const fields = Object.keys(sampleRecord).join(', ');
      
      return `📊 ${arr.name}:
  - Records: ${arr.totalRecords}
  - Fields: ${fields}
  - Sample: ${sampleRecord.title || sampleRecord.name || 'N/A'}`;
    }).join('\n\n');

    return `🎵 Data Arrays Summary for ${componentPath}:\n\n${summary}`;
  }
} 