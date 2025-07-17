```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Schema for validating request body
const addRecentlyPlayedSchema = z.object({
  trackId: z.string().uuid(),
  playedAt: z.string().datetime().optional(),
});

type AddRecentlyPlayedRequest = z.infer<typeof addRecentlyPlayedSchema>;

/**
 * Adds a track to the user's recently played list
 * 
 * @route POST /api/recently-played/add
 * @access Private - Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = addRecentlyPlayedSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.format() },
        { status: 400 }
      );
    }
    
    const { trackId, playedAt } = validatedData.data;
    
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if track exists
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', trackId)
      .single();
    
    if (trackError || !trackData) {
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
        played_at: playedAt || new Date().toISOString(),
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
      { message: 'Track added to recently played', data },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Unexpected error in recently-played/add:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```