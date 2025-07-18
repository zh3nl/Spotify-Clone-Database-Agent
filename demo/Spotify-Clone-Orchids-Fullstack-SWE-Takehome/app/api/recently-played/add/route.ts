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
 * @param req - The incoming request object
 * @returns A response indicating success or failure
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
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
    
    // Add track to recently played
    const { error } = await supabase
      .from('recently_played')
      .insert({
        user_id: user.id,
        track_id: trackId,
        played_at: playedAt || new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error adding track to recently played:', error);
      return NextResponse.json(
        { error: 'Failed to add track to recently played' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Track added to recently played' },
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