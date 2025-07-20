/**
 * Database Population Script
 * Run this to populate the database with seed data from the original hardcoded arrays
 * Usage: npx tsx src/scripts/populate-database.ts
 */

import { supabase } from '../lib/supabase';

// Original hardcoded data from backup file
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

async function populateRecentlyPlayed() {
  console.log('🎵 Populating recently played tracks...');
  
  const transformedData = recentlyPlayedData.map((item, index) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    image_url: item.image,
    duration: item.duration,
    played_at: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString(), // Staggered play times
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
    .from('playlists')
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
    popularity_score: Math.floor(Math.random() * 20) + 80, // Random score 80-100
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('albums')
    .upsert(transformedData, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Error inserting popular albums:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${transformedData.length} popular albums`);
}

function getRandomReleaseDate(): string {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

async function main() {
  try {
    console.log('🚀 Starting database population...');
    
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('recently_played')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful');
    
    // Populate all tables
    await populateRecentlyPlayed();
    await populateMadeForYou();
    await populatePopularAlbums();
    
    // Verify data
    console.log('🔍 Verifying data...');
    const counts = await Promise.all([
      supabase.from('recently_played').select('count(*)').single(),
      supabase.from('playlists').select('count(*)').single(),
      supabase.from('albums').select('count(*)').single()
    ]);
    
    console.log('📊 Final counts:');
    console.log(`   Recently Played: ${counts[0].data?.count || 0}`);
    console.log(`   Made For You: ${counts[1].data?.count || 0}`);
    console.log(`   Popular Albums: ${counts[2].data?.count || 0}`);
    
    console.log('🎉 Database population completed successfully!');
    
  } catch (error) {
    console.error('💥 Population failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}