```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/types/supabase';
import { Track } from '@/types/music';

// Query parameters schema
const QuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET handler for fetching recently played tracks
 * @param req - The incoming request object
 * @returns A response with the recently played tracks or an error
 */
export async function GET(req: NextRequest) {
  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const rawParams = {
      limit: url.searchParams.get('limit') || '10',
      offset: url.searchParams.get('offset') || '0',
    };
    
    const result = QuerySchema.safeParse(rawParams);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { limit, offset } = result.data;
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get the current user
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
      .select('*, track:tracks(*)')
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
    
    // Transform the data to match the Track type
    const tracks: Track[] = recentlyPlayed.map(item => item.track as Track);
    
    return NextResponse.json({ 
      tracks,
      count: tracks.length,
      offset,
      limit
    });
    
  } catch (error) {
    console.error('Unexpected error in recently played API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```