import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler to fetch recently played tracks
 * @param request - The incoming request object
 * @returns NextResponse with the recently played tracks or error
 */
export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    // Fetch recently played tracks (simplified for demo - no auth required)
    const { data, error } = await supabase
      .from('recently_played')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Error fetching recently played tracks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform data to match frontend expectations
    const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.album,
      albumArt: item.image_url,
      duration: item.duration,
      playedAt: item.played_at
    })) || [];
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/recently-played:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to add a new recently played track (simplified for demo)
 * @param request - The incoming request object
 * @returns NextResponse with success message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For demo purposes, just insert the track data directly
    const { data, error } = await supabase
      .from('recently_played')
      .insert({
        title: body.title,
        artist: body.artist,
        album: body.album,
        image_url: body.albumArt,
        duration: body.duration,
        played_at: new Date().toISOString(),
        user_id: 'default-user'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting recently played track:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/recently-played:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}