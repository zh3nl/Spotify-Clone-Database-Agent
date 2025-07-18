import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const tracks = await db.recentlyPlayed.getAll(limit);
    
    // Transform database fields to match frontend expectations
    const transformedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumArt: track.image_url,
      duration: track.duration
    }));
    
    return NextResponse.json(transformedTracks);
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recently played tracks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const trackData = {
      title: body.title,
      artist: body.artist,
      album: body.album,
      image_url: body.albumArt,
      duration: body.duration,
      user_id: body.userId || 'default-user'
    };
    
    const newTrack = await db.recentlyPlayed.add(trackData);
    
    return NextResponse.json({
      id: newTrack.id,
      title: newTrack.title,
      artist: newTrack.artist,
      album: newTrack.album,
      albumArt: newTrack.image_url,
      duration: newTrack.duration
    });
  } catch (error) {
    console.error('Error adding recently played track:', error);
    return NextResponse.json(
      { error: 'Failed to add recently played track' },
      { status: 500 }
    );
  }
}