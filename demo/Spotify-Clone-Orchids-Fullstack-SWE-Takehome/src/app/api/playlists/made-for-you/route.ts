import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const playlists = await db.madeForYou.getAll();
    
    // Transform database fields to match frontend expectations
    const transformedPlaylists = playlists.map(playlist => ({
      id: playlist.id,
      title: playlist.title,
      artist: playlist.description,
      album: playlist.playlist_type,
      albumArt: playlist.image_url,
      duration: 210 // Default duration for playlists
    }));
    
    return NextResponse.json(transformedPlaylists);
  } catch (error) {
    console.error('Error fetching made for you playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch made for you playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const playlistData = {
      title: body.title,
      description: body.description,
      image_url: body.image,
      playlist_type: body.playlistType || 'personalized',
      user_id: body.userId || 'default-user'
    };
    
    const newPlaylist = await db.madeForYou.add(playlistData);
    
    return NextResponse.json({
      id: newPlaylist.id,
      title: newPlaylist.title,
      artist: newPlaylist.description,
      album: newPlaylist.playlist_type,
      albumArt: newPlaylist.image_url,
      duration: 210
    });
  } catch (error) {
    console.error('Error adding made for you playlist:', error);
    return NextResponse.json(
      { error: 'Failed to add made for you playlist' },
      { status: 500 }
    );
  }
}