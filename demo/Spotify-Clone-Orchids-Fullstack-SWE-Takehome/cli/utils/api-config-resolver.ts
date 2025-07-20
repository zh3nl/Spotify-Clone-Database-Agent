import { Logger } from './logger';

export interface APIConfiguration {
  endpoint: string;           // "/api/albums/popular"
  filePath: string;          // "src/app/api/albums/popular/route.ts"
  tableName: string;         // "albums"
  queryStrategy: QueryStrategy;
  transformPattern: TransformPattern;
  methods: HTTPMethod[];
  description: string;       // Human-readable description
}

export type QueryStrategy = 
  | 'popularity_order'     // ORDER BY popularity_score DESC
  | 'recent_order'         // ORDER BY played_at/created_at DESC
  | 'filtered_personalized' // WHERE playlist_type = 'personalized'
  | 'simple_select';       // Basic SELECT with limit

export type TransformPattern = 
  | 'album_transform'      // Albums-specific field mapping
  | 'playlist_transform'   // Playlists-specific field mapping  
  | 'track_transform'      // Track history field mapping
  | 'basic_transform';     // Minimal field mapping

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class APIConfigResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Resolves operation description to API configuration
   */
  resolveAPIConfig(operationDescription: string, tableName: string): APIConfiguration | null {
    this.logger.info(`🔍 Resolving API config for: "${operationDescription}" (table: ${tableName})`);
    
    const description = operationDescription.toLowerCase();
    
    // Recently Played Pattern
    if (this.isRecentlyPlayedContext(description)) {
      const config: APIConfiguration = {
        endpoint: '/api/recently-played',
        filePath: 'src/app/api/recently-played/route.ts',
        tableName: 'recently_played',
        queryStrategy: 'recent_order',
        transformPattern: 'track_transform',
        methods: ['GET', 'POST'],
        description: 'Recently played tracks API with track history functionality'
      };
      this.logger.success(`🎵 Resolved to Recently Played API configuration`);
      return config;
    }

    // Made For You / Playlists Pattern
    if (this.isMadeForYouContext(description)) {
      const config: APIConfiguration = {
        endpoint: '/api/playlists/made-for-you',
        filePath: 'src/app/api/playlists/made-for-you/route.ts',
        tableName: 'playlists',
        queryStrategy: 'filtered_personalized',
        transformPattern: 'playlist_transform',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Made for you playlists API with playlist management functionality'
      };
      this.logger.success(`🎧 Resolved to Made For You Playlists API configuration`);
      return config;
    }

    // Popular Albums Pattern
    if (this.isPopularAlbumsContext(description)) {
      const config: APIConfiguration = {
        endpoint: '/api/albums/popular',
        filePath: 'src/app/api/albums/popular/route.ts',
        tableName: 'albums',
        queryStrategy: 'popularity_order',
        transformPattern: 'album_transform',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Popular albums API with album management functionality'
      };
      this.logger.success(`💿 Resolved to Popular Albums API configuration`);
      return config;
    }

    this.logger.warn(`⚠️ No API configuration found for: "${operationDescription}"`);
    this.logger.info(`💡 Supported patterns: recently played, made for you/playlists, popular albums`);
    return null;
  }

  /**
   * Checks if description matches recently played context
   */
  private isRecentlyPlayedContext(description: string): boolean {
    const patterns = [
      'recently played',
      'recent tracks',
      'listening history', 
      'play history',
      'track history',
      'recently_played'
    ];
    
    return patterns.some(pattern => description.includes(pattern));
  }

  /**
   * Checks if description matches made for you/playlists context
   */
  private isMadeForYouContext(description: string): boolean {
    const patterns = [
      'made for you',
      'personalized playlist',
      'custom playlist',
      'user playlist',
      'recommended playlist',
      'playlist',
      'made_for_you'
    ];
    
    return patterns.some(pattern => description.includes(pattern));
  }

  /**
   * Checks if description matches popular albums context
   */
  private isPopularAlbumsContext(description: string): boolean {
    const patterns = [
      'popular albums',
      'trending albums',
      'top albums',
      'album',
      'popular music',
      'chart albums'
    ];
    
    return patterns.some(pattern => description.includes(pattern));
  }

  /**
   * Gets all supported API configurations for reference
   */
  getAllSupportedConfigs(): APIConfiguration[] {
    return [
      {
        endpoint: '/api/recently-played',
        filePath: 'src/app/api/recently-played/route.ts',
        tableName: 'recently_played',
        queryStrategy: 'recent_order',
        transformPattern: 'track_transform',
        methods: ['GET', 'POST'],
        description: 'Recently played tracks API'
      },
      {
        endpoint: '/api/playlists/made-for-you',
        filePath: 'src/app/api/playlists/made-for-you/route.ts',
        tableName: 'playlists',
        queryStrategy: 'filtered_personalized',
        transformPattern: 'playlist_transform',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Made for you playlists API'
      },
      {
        endpoint: '/api/albums/popular',
        filePath: 'src/app/api/albums/popular/route.ts',
        tableName: 'albums',
        queryStrategy: 'popularity_order',
        transformPattern: 'album_transform',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Popular albums API'
      }
    ];
  }

  /**
   * Validates if an API configuration is complete and valid
   */
  validateConfig(config: APIConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.endpoint || !config.endpoint.startsWith('/api/')) {
      errors.push('Invalid endpoint: must start with /api/');
    }

    if (!config.filePath || !config.filePath.endsWith('/route.ts')) {
      errors.push('Invalid filePath: must end with /route.ts');
    }

    if (!config.tableName || config.tableName.trim().length === 0) {
      errors.push('Invalid tableName: cannot be empty');
    }

    if (!config.methods || config.methods.length === 0) {
      errors.push('Invalid methods: must have at least one HTTP method');
    }

    const validMethods: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
    const invalidMethods = config.methods.filter(method => !validMethods.includes(method));
    if (invalidMethods.length > 0) {
      errors.push(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets detailed information about a resolved configuration
   */
  getConfigInfo(config: APIConfiguration): string {
    return `API Configuration:
  • Endpoint: ${config.endpoint}
  • File: ${config.filePath}
  • Table: ${config.tableName}
  • Query Strategy: ${config.queryStrategy}
  • Transform Pattern: ${config.transformPattern}
  • HTTP Methods: ${config.methods.join(', ')}
  • Description: ${config.description}`;
  }
}