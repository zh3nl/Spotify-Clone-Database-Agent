import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('type', 'personalized')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching made-for-you playlists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformedData = playlists?.map(playlist => ({
      id: playlist.id,
      title: playlist.title,
      artist: playlist.description || 'Personalized playlist', // Map description to artist field for frontend compatibility
      album: playlist.type || 'Playlist', // Map type to album field for frontend compatibility
      albumArt: playlist.image_url,
      duration: 200, // Default duration for playlists
      playlistType: playlist.type
    })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'Failed to fetch made-for-you playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        title: body.title,
        description: body.description,
        image_url: body.imageUrl,
        type: 'personalized', // Match the type used in GET query
        user_id: body.userId || 'system'
      })
      .select()
      .single();

    if (playlistError) {
      console.error('Error creating playlist:', playlistError);
      return NextResponse.json({ error: playlistError.message }, { status: 500 });
    }

    if (body.songs?.length > 0) {
      const songsToInsert = body.songs.map((song, index) => ({
        playlist_id: playlist.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration || 200,
        position: index
      }));

      const { error: songsError } = await supabase
        .from('songs')
        .insert(songsToInsert);

      if (songsError) {
        console.error('Error adding songs to playlist:', songsError);
        // Rollback playlist creation
        await supabase.from('playlists').delete().eq('id', playlist.id);
        return NextResponse.json({ error: songsError.message }, { status: 500 });
      }
    }

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'Failed to create made-for-you playlist' },
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

    // Delete associated songs first
    const { error: songsError } = await supabase
      .from('songs')
      .delete()
      .eq('playlist_id', playlistId);

    if (songsError) {
      console.error('Error deleting playlist songs:', songsError);
      return NextResponse.json({ error: songsError.message }, { status: 500 });
    }

    // Delete the playlist
    const { error: playlistError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (playlistError) {
      console.error('Error deleting playlist:', playlistError);
      return NextResponse.json({ error: playlistError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/playlists/made-for-you:', error);
    return NextResponse.json(
      { error: 'Failed to delete made-for-you playlist' },
      { status: 500 }
    );
  }
}