```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/types/supabase';

/**
 * Query parameters schema for the recently played tracks endpoint
 */
const QueryParamsSchema = z.object({
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Track response type
 */
type RecentlyPlayedTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover_url: string | null;
  played_at: string;
};

/**
 * GET handler for fetching recently played tracks
 * 
 * @param request - The incoming request object
 * @returns A response with the recently played tracks
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const queryParamsResult = QueryParamsSchema.safeParse({
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    });

    if (!queryParamsResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryParamsResult.error.format() },
        { status: 400 }
      );
    }

    const { limit, offset } = queryParamsResult.data;

    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch recently played tracks
    const { data: recentlyPlayed, error } = await supabase
      .from('played_tracks')
      .select(`
        id,
        played_at,
        track_id,
        tracks (
          id,
          title,
          artist,
          album,
          cover_url
        )
      `)
      .eq('user_id', session.user.id)
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching recently played tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recently played tracks' },
        { status: 500 }
      );
    }

    // Transform the data to the expected format
    const formattedTracks: RecentlyPlayedTrack[] = recentlyPlayed.map(item => ({
      id: item.track_id,
      title: item.tracks?.title || 'Unknown Title',
      artist: item.tracks?.artist || 'Unknown Artist',
      album: item.tracks?.album || 'Unknown Album',
      cover_url: item.tracks?.cover_url,
      played_at: item.played_at,
    }));

    return NextResponse.json(
      { tracks: formattedTracks },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300'
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error in recently played tracks endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```