import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler to fetch popular albums
 * @param request - The incoming request object
 * @returns NextResponse with the popular albums or error
 */
export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    // Fetch popular albums (simplified for demo - no auth required)
    const { data, error } = await supabase
      .from('popular_albums')
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Error fetching popular albums:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform data to match frontend expectations
    const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.title, // Use title as album name for albums
      albumArt: item.image_url,
      duration: item.duration,
      releaseDate: item.release_date,
      popularityScore: item.popularity_score
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

/**
 * POST handler to add a new popular album (simplified for demo)
 * @param request - The incoming request object
 * @returns NextResponse with success message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For demo purposes, insert the album data directly
    const { data, error } = await supabase
      .from('popular_albums')
      .insert({
        title: body.title,
        artist: body.artist,
        image_url: body.albumArt,
        duration: body.duration,
        release_date: body.releaseDate || '2023-01-01',
        popularity_score: body.popularityScore || 80
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting popular album:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/albums/popular:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}