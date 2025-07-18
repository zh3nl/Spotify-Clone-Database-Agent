```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/types/supabase';

const queryParamsSchema = z.object({
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * GET handler for fetching recently played tracks
 * 
 * @param request - The incoming request object
 * @returns NextResponse with recently played tracks or error
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get('limit') || '10',
      offset: url.searchParams.get('offset') || '0'
    };
    
    const { limit, offset } = queryParamsSchema.parse(rawParams);
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch recently played tracks
    const { data: recentlyPlayed, error } = await supabase
      .from('recently_played')
      .select(`
        id,
        user_id,
        track_id,
        played_at,
        tracks (
          id,
          title,
          artist,
          album,
          duration,
          cover_url,
          audio_url
        )
      `)
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching recently played tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recently played tracks' },
        { status: 500 }
      );
    }
    
    // Format the response
    const formattedTracks = recentlyPlayed.map(item => ({
      id: item.id,
      trackId: item.track_id,
      playedAt: item.played_at,
      track: item.tracks
    }));
    
    return NextResponse.json(
      { 
        tracks: formattedTracks,
        count: formattedTracks.length,
        offset,
        limit
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60'
        }
      }
    );
    
  } catch (error) {
    console.error('Error in recently played API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for adding a track to recently played
 * 
 * @param request - The incoming request object
 * @returns NextResponse with success or error
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Validate request body
    const requestSchema = z.object({
      trackId: z.string().uuid()
    });
    
    const body = await request.json();
    const { trackId } = requestSchema.parse(body);
    
    // Check if track exists
    const { data: trackExists, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', trackId)
      .single();
    
    if (trackError || !trackExists) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }
    
    // Add to recently played
    const { data, error } = await supabase
      .from('recently_played')
      .insert({
        user_id: user.id,
        track_id: trackId,
        played_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error adding to recently played:', error);
      return NextResponse.json(
        { error: 'Failed to add track to recently played' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error in recently played API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```