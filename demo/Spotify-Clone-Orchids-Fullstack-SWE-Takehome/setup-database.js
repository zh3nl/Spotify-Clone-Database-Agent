/**
 * Complete Database Setup Script
 * This script creates tables and populates them with seed data
 * Usage: node setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Table creation SQL
const createTablesSQL = `
-- Create recently_played table
CREATE TABLE IF NOT EXISTS recently_played (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  image_url TEXT,
  duration INTEGER NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT DEFAULT 'default-user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create made_for_you table
CREATE TABLE IF NOT EXISTS made_for_you (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  playlist_type TEXT NOT NULL DEFAULT 'personalized',
  user_id TEXT DEFAULT 'default-user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create popular_albums table
CREATE TABLE IF NOT EXISTS popular_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  image_url TEXT,
  release_date DATE,
  duration INTEGER NOT NULL,
  popularity_score INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_made_for_you_created_at ON made_for_you(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular_albums_popularity_score ON popular_albums(popularity_score DESC);

-- Enable RLS
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE made_for_you ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_albums ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Allow all operations on recently_played" ON recently_played FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on made_for_you" ON made_for_you FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on popular_albums" ON popular_albums FOR ALL USING (true);
`;

// Original hardcoded data
const recentlyPlayedData = [
  { 
    id: "1",
    title: "Liked Songs", 
    artist: "320 songs",
    album: "Your Music",
    image: "https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png",
    duration: 180
  },
  { 
    id: "2",
    title: "Discover Weekly", 
    artist: "Spotify",
    album: "Weekly Mix",
    image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
    duration: 210
  },
  { 
    id: "3",
    title: "Release Radar", 
    artist: "Spotify",
    album: "New Releases",
    image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
    duration: 195
  },
  { 
    id: "4",
    title: "Daily Mix 1", 
    artist: "Spotify",
    album: "Daily Mix",
    image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
    duration: 225
  },
  { 
    id: "5",
    title: "Chill Hits", 
    artist: "Spotify",
    album: "Chill Collection",
    image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
    duration: 240
  },
  { 
    id: "6",
    title: "Top 50 - Global", 
    artist: "Spotify",
    album: "Global Charts",
    image: "https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png",
    duration: 205
  }
];

const madeForYouData = [
  { 
    id: "7",
    title: "Discover Weekly", 
    artist: "Your weekly mixtape of fresh music",
    album: "Weekly Discovery",
    image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
    duration: 210
  },
  { 
    id: "8",
    title: "Release Radar", 
    artist: "Catch all the latest music from artists you follow",
    album: "New Music Friday",
    image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
    duration: 195
  },
  { 
    id: "9",
    title: "Daily Mix 1", 
    artist: "Billie Eilish, Lorde, Clairo and more",
    album: "Alternative Mix",
    image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
    duration: 225
  },
  { 
    id: "10",
    title: "Daily Mix 2", 
    artist: "Arctic Monkeys, The Strokes, Tame Impala and more",
    album: "Indie Rock Mix",
    image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
    duration: 240
  },
  { 
    id: "11",
    title: "Daily Mix 3", 
    artist: "Taylor Swift, Olivia Rodrigo, Gracie Abrams and more",
    album: "Pop Mix",
    image: "https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png",
    duration: 190
  },
  { 
    id: "12",
    title: "On Repeat", 
    artist: "The songs you can't get enough of",
    album: "Your Favorites",
    image: "https://v3.fal.media/files/rabbit/mVegWQYIe0yj8NixTQQG-_output.png",
    duration: 220
  }
];

const popularAlbumsData = [
  { 
    id: "13",
    title: "Midnights", 
    artist: "Taylor Swift",
    album: "Midnights",
    image: "https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png",
    duration: 275
  },
  { 
    id: "14",
    title: "Harry's House", 
    artist: "Harry Styles",
    album: "Harry's House",
    image: "https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png",
    duration: 245
  },
  { 
    id: "15",
    title: "Un Verano Sin Ti", 
    artist: "Bad Bunny",
    album: "Un Verano Sin Ti",
    image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
    duration: 265
  },
  { 
    id: "16",
    title: "Renaissance", 
    artist: "Beyoncé",
    album: "Renaissance",
    image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
    duration: 290
  },
  { 
    id: "17",
    title: "SOUR", 
    artist: "Olivia Rodrigo",
    album: "SOUR",
    image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
    duration: 215
  },
  { 
    id: "18",
    title: "Folklore", 
    artist: "Taylor Swift",
    album: "Folklore",
    image: "https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png",
    duration: 285
  },
  { 
    id: "19",
    title: "Fine Line", 
    artist: "Harry Styles",
    album: "Fine Line",
    image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
    duration: 255
  },
  { 
    id: "20",
    title: "After Hours", 
    artist: "The Weeknd",
    album: "After Hours",
    image: "https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png",
    duration: 270
  }
];

async function createTables() {
  console.log('🏗️  Creating database tables...');
  
  try {
    const { error } = await supabase.rpc('exec', { sql: createTablesSQL });
    
    if (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
    
    console.log('✅ Tables created successfully');
  } catch (error) {
    // If RPC doesn't work, try alternative approach
    console.log('⚠️  RPC method failed, tables may need to be created manually');
    console.log('Please run the SQL from create-tables.sql in Supabase SQL Editor');
    throw error;
  }
}

async function populateRecentlyPlayed() {
  console.log('🎵 Populating recently played tracks...');
  
  const transformedData = recentlyPlayedData.map((item, index) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    image_url: item.image,
    duration: item.duration,
    played_at: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(),
    user_id: 'default-user',
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('recently_played')
    .upsert(transformedData, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Error inserting recently played:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${transformedData.length} recently played tracks`);
}

async function populateMadeForYou() {
  console.log('🎨 Populating made for you playlists...');
  
  const transformedData = madeForYouData.map(item => ({
    id: item.id,
    title: item.title,
    description: item.artist, // Using artist field as description
    image_url: item.image,
    playlist_type: item.title.includes('Daily Mix') ? 'daily_mix' : 'personalized',
    user_id: 'default-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('made_for_you')
    .upsert(transformedData, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Error inserting made for you:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${transformedData.length} made for you playlists`);
}

async function populatePopularAlbums() {
  console.log('🔥 Populating popular albums...');
  
  const transformedData = popularAlbumsData.map(item => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    image_url: item.image,
    release_date: getRandomReleaseDate(),
    duration: item.duration,
    popularity_score: Math.floor(Math.random() * 20) + 80,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('popular_albums')
    .upsert(transformedData, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Error inserting popular albums:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${transformedData.length} popular albums`);
}

function getRandomReleaseDate() {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

async function main() {
  try {
    console.log('🚀 Starting complete database setup...');
    
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .limit(1);
    
    if (testError && !testError.message.includes('does not exist')) {
      console.error('❌ Supabase connection failed:', testError);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful');
    
    // Try to create tables (this may fail if we don't have admin access)
    try {
      await createTables();
    } catch (error) {
      console.log('⚠️  Could not create tables automatically. Please run create-tables.sql manually.');
      console.log('Continuing with data population assuming tables exist...');
    }
    
    // Populate all tables
    await populateRecentlyPlayed();
    await populateMadeForYou();
    await populatePopularAlbums();
    
    // Verify data
    console.log('🔍 Verifying data...');
    const counts = await Promise.all([
      supabase.from('recently_played').select('*'),
      supabase.from('made_for_you').select('*'),
      supabase.from('popular_albums').select('*')
    ]);
    
    console.log('📊 Final counts:');
    console.log(`   Recently Played: ${counts[0].data?.length || 0}`);
    console.log(`   Made For You: ${counts[1].data?.length || 0}`);
    console.log(`   Popular Albums: ${counts[2].data?.length || 0}`);
    
    console.log('🎉 Database setup completed successfully!');
    console.log('\n🔥 Next steps:');
    console.log('   1. Run the Next.js dev server: npm run dev');
    console.log('   2. Test the API integration: node test-api-integration.js (if available)');
    console.log('   3. Open the application in your browser');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    
    if (error.message.includes('does not exist')) {
      console.log('\n🔧 Manual setup required:');
      console.log('   1. Copy the contents of create-tables.sql');
      console.log('   2. Go to your Supabase project SQL Editor');
      console.log('   3. Paste and run the SQL to create tables');
      console.log('   4. Run this script again: node setup-database.js');
    }
    
    process.exit(1);
  }
}

// Run the script
main();