import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from './logger';

export interface ExtractedDataItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  image?: string;
  duration: number;
  [key: string]: any;
}

export interface ExtractedDataSet {
  recentlyPlayed: ExtractedDataItem[];
  madeForYou: ExtractedDataItem[];
  popularAlbums: ExtractedDataItem[];
}

export class HardcodedDataExtractor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Extracts hardcoded data arrays from component files
   */
  async extractFromComponents(projectRoot: string): Promise<ExtractedDataSet> {
    this.logger.info('🔍 Extracting hardcoded data from components...');
    
    const mainContentPath = path.join(projectRoot, 'src/components/spotify-main-content.tsx');
    
    try {
      const content = await fs.readFile(mainContentPath, 'utf-8');
      
      const extracted = {
        recentlyPlayed: this.extractRecentlyPlayedData(content),
        madeForYou: this.extractMadeForYouData(content),
        popularAlbums: this.extractPopularAlbumsData(content)
      };

      this.logger.success(`📊 Extracted data: ${extracted.recentlyPlayed.length} recently played, ${extracted.madeForYou.length} made for you, ${extracted.popularAlbums.length} popular albums`);
      
      return extracted;
    } catch (error) {
      this.logger.error(`Failed to extract data from components: ${error instanceof Error ? error.message : String(error)}`);
      return this.getDefaultData();
    }
  }

  /**
   * Extracts recently played data from component content
   */
  private extractRecentlyPlayedData(content: string): ExtractedDataItem[] {
    const recentlyPlayedMatch = content.match(/const FALLBACK_RECENTLY_PLAYED[^=]*=\s*\[([\s\S]*?)\];/);
    if (!recentlyPlayedMatch) {
      this.logger.warn('No FALLBACK_RECENTLY_PLAYED found in component');
      return [];
    }

    return this.parseDataArray(recentlyPlayedMatch[1]);
  }

  /**
   * Extracts made for you data from component content
   */
  private extractMadeForYouData(content: string): ExtractedDataItem[] {
    const madeForYouMatch = content.match(/const FALLBACK_MADE_FOR_YOU[^=]*=\s*\[([\s\S]*?)\];/);
    if (!madeForYouMatch) {
      this.logger.warn('No FALLBACK_MADE_FOR_YOU found in component');
      return [];
    }

    return this.parseDataArray(madeForYouMatch[1]);
  }

  /**
   * Extracts popular albums data from component content
   */
  private extractPopularAlbumsData(content: string): ExtractedDataItem[] {
    const popularAlbumsMatch = content.match(/const FALLBACK_POPULAR_ALBUMS[^=]*=\s*\[([\s\S]*?)\];/);
    if (!popularAlbumsMatch) {
      this.logger.warn('No FALLBACK_POPULAR_ALBUMS found in component');
      return [];
    }

    return this.parseDataArray(popularAlbumsMatch[1]);
  }

  /**
   * Parses a JavaScript array string into structured data
   */
  private parseDataArray(arrayContent: string): ExtractedDataItem[] {
    try {
      // Clean up the array content and extract individual objects
      const objectMatches = arrayContent.match(/\{[^}]*\}/g);
      if (!objectMatches) {
        return [];
      }

      const parsedItems: ExtractedDataItem[] = [];

      for (const objectStr of objectMatches) {
        try {
          // Extract key-value pairs from object string
          const item: ExtractedDataItem = {
            id: '',
            title: '',
            artist: '',
            duration: 0
          };

          // Extract id
          const idMatch = objectStr.match(/id:\s*["']([^"']+)["']/);
          if (idMatch) item.id = idMatch[1];

          // Extract title
          const titleMatch = objectStr.match(/title:\s*["']([^"']+)["']/);
          if (titleMatch) item.title = titleMatch[1];

          // Extract artist
          const artistMatch = objectStr.match(/artist:\s*["']([^"']+)["']/);
          if (artistMatch) item.artist = artistMatch[1];

          // Extract album
          const albumMatch = objectStr.match(/album:\s*["']([^"']+)["']/);
          if (albumMatch) item.album = albumMatch[1];

          // Extract albumArt or image
          const albumArtMatch = objectStr.match(/albumArt:\s*["']([^"']+)["']/);
          if (albumArtMatch) {
            item.albumArt = albumArtMatch[1];
            item.image = albumArtMatch[1]; // Also set as image for compatibility
          }

          // Extract duration
          const durationMatch = objectStr.match(/duration:\s*(\d+)/);
          if (durationMatch) item.duration = parseInt(durationMatch[1]);

          // Only add if we have essential fields
          if (item.id && item.title && item.artist) {
            parsedItems.push(item);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse object: ${objectStr.substring(0, 50)}...`);
        }
      }

      return parsedItems;
    } catch (error) {
      this.logger.error(`Failed to parse data array: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Returns default data if extraction fails
   */
  private getDefaultData(): ExtractedDataSet {
    this.logger.info('🔄 Using default fallback data');
    
    return {
      recentlyPlayed: [
        {
          id: '1',
          title: 'Liked Songs',
          artist: '320 songs',
          album: 'Your Music',
          albumArt: 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png',
          duration: 180
        },
        {
          id: '2',
          title: 'Discover Weekly',
          artist: 'Spotify',
          album: 'Weekly Mix',
          albumArt: 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png',
          duration: 210
        }
      ],
      madeForYou: [
        {
          id: '7',
          title: 'Discover Weekly',
          artist: 'Your weekly mixtape of fresh music',
          album: 'Weekly Discovery',
          albumArt: 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png',
          duration: 210
        },
        {
          id: '8',
          title: 'Release Radar',
          artist: 'Catch all the latest music from artists you follow',
          album: 'New Music Friday',
          albumArt: 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png',
          duration: 195
        }
      ],
      popularAlbums: [
        {
          id: '13',
          title: 'Midnights',
          artist: 'Taylor Swift',
          album: 'Midnights',
          albumArt: 'https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png',
          duration: 275
        },
        {
          id: '14',
          title: "Harry's House",
          artist: 'Harry Styles',
          album: "Harry's House",
          albumArt: 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png',
          duration: 245
        }
      ]
    };
  }

  /**
   * Gets data for a specific context based on operation description
   */
  async getDataForContext(projectRoot: string, operationDescription: string): Promise<ExtractedDataItem[]> {
    const allData = await this.extractFromComponents(projectRoot);
    const description = operationDescription.toLowerCase();

    if (description.includes('recently played')) {
      this.logger.info(`🎵 Selected recently played data (${allData.recentlyPlayed.length} items)`);
      return allData.recentlyPlayed;
    } else if (description.includes('made for you') || description.includes('playlist')) {
      this.logger.info(`🎧 Selected made for you data (${allData.madeForYou.length} items)`);
      return allData.madeForYou;
    } else if (description.includes('albums') || description.includes('popular')) {
      this.logger.info(`💿 Selected popular albums data (${allData.popularAlbums.length} items)`);
      return allData.popularAlbums;
    }

    this.logger.warn(`⚠️ No matching data found for description: "${operationDescription}"`);
    return [];
  }
}