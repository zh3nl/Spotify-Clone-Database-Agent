import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const albums = await db.popularAlbums.getAll(limit);
    
    // Transform database fields to match frontend expectations
    const transformedAlbums = albums.map(album => ({
      id: album.id,
      title: album.title,
      artist: album.artist,
      album: album.title,
      albumArt: album.image_url,
      duration: album.duration
    }));
    
    return NextResponse.json(transformedAlbums);
  } catch (error) {
    console.error('Error fetching popular albums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular albums' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const albumData = {
      title: body.title,
      artist: body.artist,
      image_url: body.image,
      duration: body.duration,
      release_date: body.releaseDate || '2023-01-01',
      popularity_score: body.popularityScore || Math.floor(Math.random() * 100)
    };
    
    const newAlbum = await db.popularAlbums.add(albumData);
    
    return NextResponse.json({
      id: newAlbum.id,
      title: newAlbum.title,
      artist: newAlbum.artist,
      album: newAlbum.title,
      albumArt: newAlbum.image_url,
      duration: newAlbum.duration
    });
  } catch (error) {
    console.error('Error adding popular album:', error);
    return NextResponse.json(
      { error: 'Failed to add popular album' },
      { status: 500 }
    );
  }
}