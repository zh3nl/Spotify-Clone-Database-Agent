import { Logger } from './logger';
import { ExtractedDataItem, MultiTableDataResult } from './hardcoded-data-extractor';

// CRITICAL FIX: Default user UUID for development/demo purposes
// This ensures consistent UUID format for all user_id fields that expect UUID type
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000001';

export interface SQLFunction {
  __sqlFunction: true;
  expression: string;
}

export interface DatabaseRecord {
  [key: string]: any;
}

export interface MappingResult {
  tableName: string;
  records: DatabaseRecord[];
  insertSql: string;
}

export interface MultiTableMappingResult {
  recentlyPlayed?: MappingResult;
  playlists?: MappingResult;
  albums?: MappingResult;
  allMappings: MappingResult[];
}

export class SchemaDataMapper {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Maps multi-table extracted data to database records (FIXED: Multi-table support)
   */
  mapMultiTableDataToSchema(
    multiTableData: MultiTableDataResult,
    operationDescription: string
  ): MultiTableMappingResult {
    this.logger.info(`🗃️ Multi-table mapping for: "${operationDescription}"`);
    
    const result: MultiTableMappingResult = {
      allMappings: []
    };

    // Map recently played data if present
    if (multiTableData.hasRecentlyPlayed && multiTableData.recentlyPlayed.length > 0) {
      this.logger.info(`🎵 Mapping ${multiTableData.recentlyPlayed.length} recently played items`);
      result.recentlyPlayed = this.mapToRecentlyPlayedSchema(multiTableData.recentlyPlayed, 'recently_played');
      result.allMappings.push(result.recentlyPlayed);
    }

    // Map playlist data if present
    if (multiTableData.hasMadeForYou && multiTableData.madeForYou.length > 0) {
      this.logger.info(`🎧 Mapping ${multiTableData.madeForYou.length} made for you items`);
      result.playlists = this.mapToPlaylistSchema(multiTableData.madeForYou, 'playlists');
      result.allMappings.push(result.playlists);
    }

    // Map album data if present
    if (multiTableData.hasPopularAlbums && multiTableData.popularAlbums.length > 0) {
      this.logger.info(`💿 Mapping ${multiTableData.popularAlbums.length} popular album items`);
      result.albums = this.mapToAlbumsSchema(multiTableData.popularAlbums, 'albums');
      result.allMappings.push(result.albums);
    }

    this.logger.success(`✅ Multi-table mapping complete: ${result.allMappings.length} table(s) mapped`);
    return result;
  }

  /**
   * Maps extracted data to database records based on operation context (Legacy single-table method)
   * @deprecated Use mapMultiTableDataToSchema for new implementations
   */
  mapDataToSchema(
    data: ExtractedDataItem[], 
    operationDescription: string,
    tableName: string
  ): MappingResult {
    this.logger.info(`🗃️ Mapping ${data.length} items to ${tableName} schema`);
    
    const description = operationDescription.toLowerCase();
    
    if (description.includes('recently played')) {
      return this.mapToRecentlyPlayedSchema(data, tableName);
    } else if (description.includes('made for you') || description.includes('playlist')) {
      return this.mapToPlaylistSchema(data, tableName);
    } else if (description.includes('albums') || description.includes('popular')) {
      return this.mapToAlbumsSchema(data, tableName);
    }

    this.logger.warn(`⚠️ Unknown schema mapping for: ${operationDescription}`);
    return {
      tableName,
      records: [],
      insertSql: ''
    };
  }

  /**
   * Maps data to recently_played table schema (FIXED: Use actual database fields)
   */
  private mapToRecentlyPlayedSchema(data: ExtractedDataItem[], tableName: string): MappingResult {
    this.logger.info('🎵 Mapping to recently_played schema');
    
    const records = data.map((item, index) => ({
      id: item.id || `track_${index + 1}`,
      user_id: DEFAULT_USER_UUID,
      title: item.title,
      artist: item.artist,
      album: item.album || item.title,
      image_url: item.albumArt || item.image || '',
      played_at: this.generateRecentTimestamp(index),
      duration: item.duration || 180, // Duration in seconds (not milliseconds)
      created_at: { __sqlFunction: true, expression: 'NOW()' }
    }));

    const insertSql = this.generateInsertSQL(tableName, records);

    return {
      tableName,
      records,
      insertSql
    };
  }

  /**
   * Maps data to playlists table schema (for made for you)
   */
  private mapToPlaylistSchema(data: ExtractedDataItem[], tableName: string): MappingResult {
    this.logger.info('🎧 Mapping to playlists schema');
    
    const records = data.map(item => ({
      id: this.generateUUID(item.id),
      user_id: DEFAULT_USER_UUID,
      title: item.title,
      description: item.artist, // Artist field becomes description for playlists
      image_url: item.albumArt || item.image || '',
      type: 'personalized',
      recommendation_score: this.generateRecommendationScore(),
      created_at: { __sqlFunction: true, expression: 'NOW()' },
      updated_at: { __sqlFunction: true, expression: 'NOW()' }
    }));

    const insertSql = this.generateInsertSQL(tableName, records);

    return {
      tableName,
      records,
      insertSql
    };
  }

  /**
   * Maps data to albums table schema
   */
  private mapToAlbumsSchema(data: ExtractedDataItem[], tableName: string): MappingResult {
    this.logger.info('💿 Mapping to albums schema');
    
    const records = data.map(item => ({
      id: this.generateUUID(item.id),
      album_id: item.id,
      title: item.title,
      artist: item.artist,
      image_url: item.albumArt || item.image || '',
      release_date: this.generateRecentReleaseDate(),
      popularity_score: this.generatePopularityScore(),
      genre: this.generateGenre(item.artist),
      created_at: { __sqlFunction: true, expression: 'NOW()' },
      updated_at: { __sqlFunction: true, expression: 'NOW()' }
    }));

    const insertSql = this.generateInsertSQL(tableName, records);

    return {
      tableName,
      records,
      insertSql
    };
  }

  /**
   * Generates SQL INSERT statement for the mapped records
   */
  private generateInsertSQL(tableName: string, records: DatabaseRecord[]): string {
    if (records.length === 0) {
      return '';
    }

    const columns = Object.keys(records[0]);
    const columnsList = columns.join(', ');
    
    const valuesList = records.map(record => {
      const values = columns.map(col => {
        const value = record[col];
        return this.formatSQLValue(value);
      });
      return `(${values.join(', ')})`;
    }).join(',\n  ');

    return `-- Insert data for ${tableName}
INSERT INTO ${tableName} (${columnsList}) VALUES
  ${valuesList};`;
  }

  /**
   * Formats a value for SQL insertion, handling SQL functions properly
   */
  private formatSQLValue(value: any): string {
    // Handle SQL functions (like gen_random_uuid(), NOW(), etc.)
    if (value && typeof value === 'object' && value.__sqlFunction === true) {
      return value.expression;
    }
    // Handle legacy string-based SQL functions for backward compatibility
    if (value === 'NOW()') {
      return 'NOW()';
    }
    // Handle strings
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    // Handle numbers
    if (typeof value === 'number') {
      return value.toString();
    }
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'NULL';
    }
    // Handle other types as strings
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Generates a UUID for database primary keys
   */
  private generateUUID(fallbackId?: string): SQLFunction {
    return {
      __sqlFunction: true,
      expression: 'gen_random_uuid()'
    };
  }

  /**
   * Generates recent timestamps for recently played items
   */
  private generateRecentTimestamp(index: number): SQLFunction {
    return {
      __sqlFunction: true,
      expression: `NOW() - INTERVAL '${index + 1} hour'`
    };
  }

  /**
   * Generates a recommendation score for playlists
   */
  private generateRecommendationScore(): number {
    return Math.round((Math.random() * 0.3 + 0.7) * 100) / 100; // 0.70-1.00 range
  }

  /**
   * Generates a popularity score for albums
   */
  private generatePopularityScore(): number {
    return Math.floor(Math.random() * 20 + 80); // 80-99 range
  }

  /**
   * Generates a recent release date
   */
  private generateRecentReleaseDate(): string {
    const years = ['2020', '2021', '2022', '2023', '2024'];
    const months = ['01', '03', '05', '07', '09', '11'];
    const days = ['15', '20', '25'];
    
    const year = years[Math.floor(Math.random() * years.length)];
    const month = months[Math.floor(Math.random() * months.length)];
    const day = days[Math.floor(Math.random() * days.length)];
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates a genre based on artist name
   */
  private generateGenre(artist: string): string {
    const genres = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Indie', 'Alternative'];
    
    // Simple mapping based on artist name
    if (artist.toLowerCase().includes('taylor')) return 'Pop';
    if (artist.toLowerCase().includes('harry')) return 'Pop';
    if (artist.toLowerCase().includes('bunny')) return 'Hip-Hop';
    if (artist.toLowerCase().includes('beyoncé')) return 'R&B';
    if (artist.toLowerCase().includes('weeknd')) return 'R&B';
    
    return genres[Math.floor(Math.random() * genres.length)];
  }

  /**
   * Creates a complete population script
   */
  createPopulationScript(mappingResults: MappingResult[]): string {
    const scripts = mappingResults
      .filter(result => result.insertSql)
      .map(result => result.insertSql);

    if (scripts.length === 0) {
      return '-- No data to populate';
    }

    return `-- Automatic Data Population Script
-- Generated by Database Agent Data Population System
-- Run this script in your Supabase SQL Editor

${scripts.join('\n\n')}

-- Verify the data was inserted correctly
${mappingResults.map(result => 
  `SELECT '${result.tableName}' as table_name, COUNT(*) as record_count FROM ${result.tableName}`
).join('\nUNION ALL\n')};`;
  }
}