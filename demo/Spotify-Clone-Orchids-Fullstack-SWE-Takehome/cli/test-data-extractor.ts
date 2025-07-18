#!/usr/bin/env node

import { ComponentDataExtractor } from './utils/component-data-extractor';
import { Logger } from './utils/logger';

async function testDataExtractor() {
  const logger = new Logger();
  const extractor = new ComponentDataExtractor();
  
  logger.section('🧪 Testing Component Data Extractor');
  
  try {
    // Test 1: Extract all data arrays
    logger.subsection('Test 1: Extract All Data Arrays');
    const arrays = await extractor.extractDataArrays('src/components/spotify-main-content.tsx');
    
    arrays.forEach(array => {
      logger.success(`✅ Found ${array.name}: ${array.totalRecords} records`);
      logger.info(`   Schema: ${Object.keys(array.schema).join(', ')}`);
      logger.info(`   Sample: ${array.data[0]?.title || 'N/A'}`);
    });
    
    // Test 2: Query matching
    logger.subsection('Test 2: Query Matching');
    const testQueries = [
      'Can you store the recently played songs in a table',
      'Create a table for Made for you playlists',
      'Store the popular albums in the database',
      'Add a search functionality' // This should not match
    ];
    
    for (const query of testQueries) {
      logger.info(`Query: "${query}"`);
      const matchedArray = await extractor.matchQueryToDataArray(query);
      
      if (matchedArray) {
        logger.success(`  ✅ Matched: ${matchedArray.name} (${matchedArray.totalRecords} records)`);
      } else {
        logger.warn(`  ❌ No match found`);
      }
    }
    
    // Test 3: Data transformation
    logger.subsection('Test 3: Data Transformation');
    const recentlyPlayedArray = await extractor.matchQueryToDataArray('recently played');
    
    if (recentlyPlayedArray) {
      const transformedData = await extractor.transformDataForDatabase(recentlyPlayedArray, 'recently_played');
      logger.success(`✅ Transformed ${transformedData.length} records for recently_played table`);
      
      // Show sample transformed record
      const sampleRecord = transformedData[0];
      logger.info('Sample transformed record:');
      Object.entries(sampleRecord).forEach(([key, value]) => {
        logger.info(`  ${key}: ${value}`);
      });
    }
    
    // Test 4: Generate summary
    logger.subsection('Test 4: Data Summary');
    const summary = await extractor.generateDataSummary('src/components/spotify-main-content.tsx');
    logger.info(summary);
    
    logger.success('🎉 All tests passed!');
    
  } catch (error) {
    logger.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the test
testDataExtractor().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 