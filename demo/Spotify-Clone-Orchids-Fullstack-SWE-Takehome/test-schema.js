/**
 * Test script to check the actual database schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSchema() {
  console.log('🔍 Testing database schema...');
  
  try {
    // Try to insert a minimal record to see what fields are expected
    const testRecord = {
      id: 'test-' + Date.now(),
      title: 'Test Track'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('recently_played')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.log('Insert error (this helps us understand the schema):', insertError);
    } else {
      console.log('Insert successful:', insertData);
      
      // Clean up the test record
      await supabase
        .from('recently_played')
        .delete()
        .eq('id', testRecord.id);
    }
    
    // Try to select any existing data to see the structure
    const { data: selectData, error: selectError } = await supabase
      .from('recently_played')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('Select error:', selectError);
    } else {
      console.log('Existing data structure:', selectData);
    }
    
    // Also test the other tables
    console.log('\n--- Testing made_for_you table ---');
    const { data: madeForYouData, error: madeForYouError } = await supabase
      .from('made_for_you')
      .select('*')
      .limit(1);
    
    if (madeForYouError) {
      console.log('Made for you error:', madeForYouError);
    } else {
      console.log('Made for you structure:', madeForYouData);
    }
    
    console.log('\n--- Testing popular_albums table ---');
    const { data: popularData, error: popularError } = await supabase
      .from('popular_albums')
      .select('*')
      .limit(1);
    
    if (popularError) {
      console.log('Popular albums error:', popularError);
    } else {
      console.log('Popular albums structure:', popularData);
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testSchema();