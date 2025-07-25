import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    // Fetch popular albums (simplified for demo - no auth required)
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching popular album:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend expectations  
    const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.title, // Use title as album for albums
      albumArt: item.image_url || '/images/default-album.png',
      duration: item.duration || 0, // Default duration for albums
      popularityScore: item.popularity_score,
      releaseDate: item.release_date,
      genre: item.genre
    })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/albums/popular:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For demo purposes, insert the album data directly
    const { data, error } = await supabase
      .from('albums')
      .insert({
        album_id: body.albumId || body.id,
        title: body.title,
        artist: body.artist,
        image_url: body.albumArt,
        release_date: body.releaseDate || new Date().toISOString().split('T')[0],
        popularity_score: body.popularityScore || Math.floor(Math.random() * 20 + 80),
        genre: body.genre || 'Pop'
      })
      .select();

    if (error) {
      console.error('Error inserting popular album:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return transformed data to match frontend expectations
    const transformedData = {
      id: data[0].id,
      title: data[0].title,
      artist: data[0].artist,
      album: data[0].title,
      albumArt: data[0].image_url || '/images/default-album.png',
      duration: data[0].duration || 0,
      popularityScore: data[0].popularity_score,
      releaseDate: data[0].release_date,
      genre: data[0].genre
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/albums/popular:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const albumId = request.nextUrl.searchParams.get('id');

    if (!albumId) {
      return NextResponse.json(
        { error: 'Album ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId);

    if (error) {
      console.error('Error deleting popular album:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/albums/popular:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}