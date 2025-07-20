#!/usr/bin/env node

/**
 * Recently Played Data Population Script
 * 
 * This script extracts hardcoded recently played data from the React component
 * and generates an idempotent SQL population script following the same pattern
 * as albums and playlists implementation.
 * 
 * Usage: node populate-recently-played-data.js
 */

const fs = require('fs').promises;
const path = require('path');

// Default user UUID for development/demo purposes
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000001';

class RecentlyPlayedDataPopulator {
  constructor() {
    this.projectRoot = __dirname;
  }

  /**
   * Extract hardcoded recently played data from React component
   */
  async extractRecentlyPlayedData() {
    try {
      const mainContentPath = path.join(this.projectRoot, 'src/components/spotify-main-content.tsx');
      const content = await fs.readFile(mainContentPath, 'utf-8');
      
      const recentlyPlayedMatch = content.match(/const FALLBACK_RECENTLY_PLAYED[^=]*=\s*\[([\s\S]*?)\];/);
      
      if (!recentlyPlayedMatch) {
        console.log('No FALLBACK_RECENTLY_PLAYED found in component');
        return [];
      }

      // Parse individual objects
      const objectMatches = recentlyPlayedMatch[1].match(/\{\s*[\s\S]*?\}/g);
      
      if (!objectMatches) {
        console.log('No objects found in array');
        return [];
      }

      const extractedData = [];
      objectMatches.forEach((objStr, index) => {
        try {
          const id = objStr.match(/id:\s*["']([^"']+)["']/)?.[1];
          const title = objStr.match(/title:\s*["']([^"']+)["']/)?.[1];
          const artist = objStr.match(/artist:\s*["']([^"']+)["']/)?.[1];
          const album = objStr.match(/album:\s*["']([^"']+)["']/)?.[1];
          const albumArt = objStr.match(/albumArt:\s*["']([^"']+)["']/)?.[1];
          const duration = objStr.match(/duration:\s*(\d+)/)?.[1];

          if (id && title && artist) {
            extractedData.push({
              id,
              title,
              artist,
              album: album || title,
              albumArt: albumArt || '',
              duration: parseInt(duration) || 180
            });
          }
        } catch (err) {
          console.log(`Error parsing item ${index + 1}:`, err.message);
        }
      });

      console.log(`✅ Extracted ${extractedData.length} recently played items from component`);
      return extractedData;
    } catch (error) {
      console.error('Error extracting data:', error.message);
      return [];
    }
  }

  /**
   * Format SQL value with proper handling of SQL functions
   */
  formatSQLValue(value) {
    // Handle SQL functions (like gen_random_uuid(), NOW(), etc.)
    if (value && typeof value === 'object' && value.__sqlFunction === true) {
      return value.expression;
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
   * Generate recent timestamp SQL function
   */
  generateRecentTimestamp(index) {
    return {
      __sqlFunction: true,
      expression: `NOW() - INTERVAL '${index + 1} hour'`
    };
  }

  /**
   * Map extracted data to recently_played database schema (FIXED: Use track_id instead of primary key)
   */
  mapToRecentlyPlayedSchema(extractedData) {
    console.log('🗃️ Mapping to recently_played database schema...');
    
    const records = extractedData.map((item, index) => ({
      // Do NOT include 'id' field - it will be auto-generated as UUID by database
      track_id: item.id, // Use component ID as business identifier
      user_id: DEFAULT_USER_UUID,
      title: item.title,
      artist: item.artist,
      album: item.album,
      image_url: item.albumArt,
      played_at: this.generateRecentTimestamp(index),
      duration: item.duration,
      created_at: { __sqlFunction: true, expression: 'NOW()' },
      updated_at: { __sqlFunction: true, expression: 'NOW()' }
    }));

    console.log(`✅ Mapped ${records.length} items to database schema`);
    return records;
  }

  /**
   * Generate idempotent INSERT SQL statement
   */
  generateIdempotentInsert(tableName, records) {
    if (records.length === 0) return '';

    const columns = Object.keys(records[0]);
    const columnsList = columns.map(col => `"${col}"`).join(', ');
    
    const valuesList = records.map(record => {
      const values = columns.map(col => {
        const value = record[col];
        return this.formatSQLValue(value);
      });
      return `  (${values.join(', ')})`;
    }).join(',\n');

    // Generate conflict resolution columns (exclude created_at, use track_id for conflicts)
    const conflictColumns = columns
      .filter(col => !['created_at'].includes(col))
      .map(col => `"${col}" = EXCLUDED."${col}"`)
      .join(', ');

    return `INSERT INTO ${tableName} (${columnsList})
VALUES
${valuesList}
ON CONFLICT ("user_id", "track_id") DO UPDATE SET ${conflictColumns};`;
  }

  /**
   * Generate complete population script
   */
  generatePopulationScript(records) {
    const insertSQL = this.generateIdempotentInsert('recently_played', records);
    const timestamp = new Date().toISOString();
    
    return `-- Population script for recently_played
-- Generated: ${timestamp}
-- Use this script to populate your recently_played table with seed data

${insertSQL}

-- Script completed for recently_played`;
  }

  /**
   * Save population script to file
   */
  async savePopulationScript(script) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    const filename = `${timestamp}_populate_recently_played.sql`;
    const filepath = path.join(this.projectRoot, filename);
    
    await fs.writeFile(filepath, script, 'utf-8');
    console.log(`💾 Saved population script: ${filename}`);
    
    return { filename, filepath };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🚀 Starting Recently Played Data Population');
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Extract data from component
      const extractedData = await this.extractRecentlyPlayedData();
      
      if (extractedData.length === 0) {
        console.log('❌ No data extracted, aborting');
        return;
      }

      // Step 2: Map to database schema
      const mappedRecords = this.mapToRecentlyPlayedSchema(extractedData);

      // Step 3: Generate SQL script
      const populationScript = this.generatePopulationScript(mappedRecords);

      // Step 4: Save to file
      const { filename } = await this.savePopulationScript(populationScript);

      console.log('=' .repeat(60));
      console.log('✅ Successfully completed recently played data population');
      console.log(`📁 Script file: ${filename}`);
      console.log(`📊 Records: ${mappedRecords.length} recently played tracks`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Run the generated SQL script in your Supabase SQL Editor');
      console.log('2. Verify data was inserted correctly');
      console.log('3. Test the API endpoints and React components');
      
    } catch (error) {
      console.error('❌ Error during population:', error.message);
      process.exit(1);
    }
  }
}

// Run the populator if this file is executed directly
if (require.main === module) {
  const populator = new RecentlyPlayedDataPopulator();
  populator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RecentlyPlayedDataPopulator;