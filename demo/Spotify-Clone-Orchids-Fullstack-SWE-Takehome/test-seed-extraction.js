#!/usr/bin/env node

/**
 * Test script to verify seed data extraction pipeline
 * Usage: node test-seed-extraction.js
 */

// Since we're dealing with TypeScript modules, let's inline the extraction function
const fs = require('fs');
const path = require('path');

/**
 * Test version of extractArrayFromFile function (simplified)
 */
async function extractArrayFromFile(filePath, arrayName) {
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    // First try current file
    if (fs.existsSync(absPath)) {
      const fileContent = fs.readFileSync(absPath, 'utf8');
      console.log(`📄 Reading main file: ${filePath}`);
      
      // Try bracket counting approach first
      const result = extractArrayByBracketCounting(fileContent, arrayName);
      if (result) {
        console.log(`✅ Found ${arrayName} in main file using bracket counting`);
        return parseArrayString(result);
      }
    }
    
    // If not found in main file, try backup files
    console.log(`🔍 Searching backup files for: ${arrayName}`);
    return await extractArrayFromBackupFile(filePath, arrayName);
    
  } catch (error) {
    console.error(`Error extracting ${arrayName}:`, error.message);
    return null;
  }
}

/**
 * Extract from backup files
 */
async function extractArrayFromBackupFile(originalFilePath, arrayName) {
  try {
    const absPath = path.isAbsolute(originalFilePath) ? originalFilePath : path.join(process.cwd(), originalFilePath);
    const dir = path.dirname(absPath);
    const basename = path.basename(originalFilePath, '.tsx');
    
    if (!fs.existsSync(dir)) {
      console.log(`Directory does not exist: ${dir}`);
      return null;
    }
    
    const allFiles = fs.readdirSync(dir);
    const backupFiles = allFiles
      .filter(file => file.startsWith(`${basename}.tsx.backup.`))
      .sort((a, b) => {
        const aTime = parseInt(a.split('.backup.')[1]);
        const bTime = parseInt(b.split('.backup.')[1]);
        return bTime - aTime; // Most recent first
      });
    
    console.log(`📁 Found ${backupFiles.length} backup files`);
    
    for (const backupFile of backupFiles) {
      const backupPath = path.join(dir, backupFile);
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      
      // Use a custom bracket-balanced extraction approach
      const result = extractArrayByBracketCounting(backupContent, arrayName);
      if (result) {
        console.log(`✅ Found ${arrayName} in backup file ${backupFile} using bracket counting`);
        console.log(`📋 Extracted string preview: ${result.substring(0, 300)}...`);
        const parsed = parseArrayString(result);
        if (parsed) {
          console.log(`✅ Successfully parsed ${parsed.length} items`);
        } else {
          console.log(`❌ Failed to parse the extracted string`);
        }
        return parsed;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error extracting from backup files:`, error.message);
    return null;
  }
}

/**
 * Extract array using proper bracket counting to handle nested structures
 */
function extractArrayByBracketCounting(content, arrayName) {
  // Find the array declaration
  const pattern = new RegExp(`(?:const\\s+)?${arrayName}\\s*=\\s*\\[`, 'i');
  const match = content.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const startIndex = match.index + match[0].length - 1; // Position of opening bracket
  let bracketCount = 0;
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (!inString) {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
      } else if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          // Found the complete array
          return content.substring(startIndex, i + 1);
        }
      }
    } else {
      if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
  }
  
  return null; // Unclosed brackets
}

/**
 * Parse array string to JavaScript objects
 */
function parseArrayString(arrayString) {
  try {
    console.log(`🔧 Parsing array string of length: ${arrayString.length}`);
    
    // Simple cleanup - only remove comments and trailing commas, but be careful with URLs
    let cleaned = arrayString
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/^\s*\/\/.*$/gm, '') // Remove line comments (only at start of line to avoid URLs)
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas more precisely
      .trim();
    
    console.log(`🔧 Cleaned array string length: ${cleaned.length}`);
    
    let arr = null;
    
    // Try direct evaluation since the extracted arrays are valid JavaScript object literals
    try {
      console.log(`🔧 Attempting eval...`);
      arr = eval(`(${cleaned})`);
      console.log(`✅ Eval successful`);
    } catch (evalError) {
      console.log(`❌ Eval failed: ${evalError.message}`);
      
      // Fallback to Function constructor
      try {
        console.log(`🔧 Falling back to Function constructor...`);
        arr = Function(`"use strict"; return (${cleaned})`)();
        console.log(`✅ Function constructor successful`);
      } catch (funcError) {
        console.log(`❌ Function constructor also failed: ${funcError.message}`);
        return null;
      }
    }
    
    if (Array.isArray(arr)) {
      console.log(`✅ Successfully evaluated as array with ${arr.length} items`);
      const validItems = arr.filter(item => item && (item.id || item.title || item.artist));
      console.log(`✅ ${validItems.length} items have valid structure`);
      
      if (validItems.length > 0) {
        console.log(`📋 Sample item:`, JSON.stringify(validItems[0], null, 2));
        return validItems;
      }
    } else {
      console.log(`❌ Evaluation result is not an array: ${typeof arr}`);
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error parsing array string: ${error.message}`);
    return null;
  }
}

const FRONTNED_FILE = 'src/components/spotify-main-content.tsx';

// Test arrays based on our updated tableToArrayMap
const TEST_ARRAYS = [
  'FALLBACK_RECENTLY_PLAYED',  // Should be in current file
  'madeForYou',                // Should be in backup files
  'popularAlbums'              // Should be in backup files
];

async function testExtraction(arrayName) {
  console.log(`\n🧪 Testing extraction for: ${arrayName}`);
  console.log('='.repeat(60));
  
  try {
    const result = await extractArrayFromFile(FRONTNED_FILE, arrayName);
    
    if (result) {
      console.log(`✅ SUCCESS: Extracted ${result.length} items`);
      console.log(`📋 First item structure:`, JSON.stringify(result[0], null, 2));
      
      // Validate basic structure
      const validItems = result.filter(item => 
        item && (item.id || item.title || item.artist)
      );
      
      if (validItems.length === result.length) {
        console.log(`✅ All ${result.length} items have valid structure`);
      } else {
        console.log(`⚠️  ${validItems.length}/${result.length} items have valid structure`);
      }
      
      return true;
    } else {
      console.log(`❌ FAILED: No data extracted`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting seed data extraction pipeline test');
  console.log(`📂 Target file: ${FRONTNED_FILE}`);
  console.log(`🎯 Testing ${TEST_ARRAYS.length} arrays`);
  
  let successCount = 0;
  
  for (const arrayName of TEST_ARRAYS) {
    const success = await testExtraction(arrayName);
    if (success) successCount++;
    
    // Add a small delay between tests for readability
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${successCount}/${TEST_ARRAYS.length} arrays extracted successfully`);
  
  if (successCount === TEST_ARRAYS.length) {
    console.log('🎉 All tests passed! Seed data extraction pipeline is working correctly.');
    process.exit(0);
  } else if (successCount > 0) {
    console.log('⚠️  Some tests passed. Partial functionality is working.');
    process.exit(1);
  } else {
    console.log('❌ All tests failed. Seed data extraction pipeline needs more work.');
    process.exit(2);
  }
}

// Run the test
main().catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(3);
});