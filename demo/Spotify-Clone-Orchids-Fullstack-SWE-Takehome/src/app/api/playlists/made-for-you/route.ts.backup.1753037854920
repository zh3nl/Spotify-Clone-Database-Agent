import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    // Fetch made for you playlists (simplified for demo - no auth required)
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching made for you playlists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend expectations  
    const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.description, // Using description as artist field for compatibility
      album: item.title, // Use title as album for playlists
      albumArt: item.image_url,
      duration: 200, // Default duration for playlists
      playlistType: item.playlist_type
    })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For demo purposes, insert the playlist data directly
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        title: body.title,
        description: body.description,
        image_url: body.albumArt,
        playlist_type: body.playlistType || 'personalized',
        user_id: 'default-user'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting made for you playlist:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const playlistId = request.nextUrl.searchParams.get('id');

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) {
      console.error('Error deleting made for you playlist:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}