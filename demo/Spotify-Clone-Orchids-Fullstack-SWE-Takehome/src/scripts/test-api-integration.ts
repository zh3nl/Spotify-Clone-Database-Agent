/**
 * API Integration Test Script
 * Run this to test that all API endpoints are working correctly
 * Usage: npx tsx src/scripts/test-api-integration.ts
 * 
 * Prerequisites: 
 * 1. Database should be populated (run populate-database.ts first)
 * 2. Next.js dev server should be running (npm run dev)
 */

const API_BASE = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  success: boolean;
  error?: string;
  dataCount?: number;
  sampleData?: any;
}

async function testEndpoint(
  endpoint: string, 
  expectedFields: string[]
): Promise<TestResult> {
  try {
    console.log(`🔍 Testing ${endpoint}...`);
    
    const response = await fetch(`${API_BASE}${endpoint}`);
    
    if (!response.ok) {
      return {
        endpoint,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return {
        endpoint,
        success: false,
        error: 'Response is not an array'
      };
    }
    
    if (data.length === 0) {
      return {
        endpoint,
        success: false,
        error: 'No data returned (empty array)'
      };
    }
    
    // Check if first item has expected fields
    const firstItem = data[0];
    const missingFields = expectedFields.filter(field => !(field in firstItem));
    
    if (missingFields.length > 0) {
      return {
        endpoint,
        success: false,
        error: `Missing expected fields: ${missingFields.join(', ')}`
      };
    }
    
    return {
      endpoint,
      success: true,
      dataCount: data.length,
      sampleData: firstItem
    };
    
  } catch (error) {
    return {
      endpoint,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTests() {
  console.log('🚀 Starting API integration tests...\n');
  
  const tests = [
    {
      endpoint: '/api/tracks/recently-played',
      expectedFields: ['id', 'title', 'artist', 'album', 'albumArt', 'duration']
    },
    {
      endpoint: '/api/playlists/made-for-you',
      expectedFields: ['id', 'title', 'artist', 'album', 'albumArt', 'playlistType']
    },
    {
      endpoint: '/api/albums/popular',
      expectedFields: ['id', 'title', 'artist', 'album', 'albumArt', 'duration']
    }
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.expectedFields);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.endpoint}`);
      console.log(`   📊 ${result.dataCount} items returned`);
      console.log(`   📝 Sample: ${result.sampleData?.title} by ${result.sampleData?.artist}`);
    } else {
      console.log(`❌ ${result.endpoint}`);
      console.log(`   💥 Error: ${result.error}`);
    }
    console.log();
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Test Summary:');
  console.log(`   ✅ Successful: ${successful}/${total}`);
  console.log(`   ❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All API endpoints are working correctly!');
    console.log('\n🔥 Next steps:');
    console.log('   1. Open the application in your browser');
    console.log('   2. Verify that the UI displays the database data');
    console.log('   3. Check that loading states and error handling work');
    return true;
  } else {
    console.log('\n💥 Some API endpoints are failing');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Make sure Next.js dev server is running (npm run dev)');
    console.log('   2. Check that database is populated (run populate-database.ts)');
    console.log('   3. Verify Supabase environment variables are set');
    console.log('   4. Check browser console for additional errors');
    return false;
  }
}

// Connectivity test
async function testConnectivity() {
  try {
    console.log('🔍 Testing Next.js server connectivity...');
    const response = await fetch(`${API_BASE}/api/tracks/recently-played`, {
      method: 'HEAD'
    });
    
    if (response.ok || response.status === 405) { // 405 = Method Not Allowed is OK
      console.log('✅ Next.js server is reachable');
      return true;
    } else {
      console.log(`❌ Server responded with: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach server: ${error instanceof Error ? error.message : String(error)}`);
    console.log('💡 Make sure you run: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🎯 API Integration Test Suite');
  console.log('===============================\n');
  
  // Test basic connectivity first
  const canConnect = await testConnectivity();
  if (!canConnect) {
    process.exit(1);
  }
  
  console.log();
  
  // Run the full test suite
  const allTestsPassed = await runTests();
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}