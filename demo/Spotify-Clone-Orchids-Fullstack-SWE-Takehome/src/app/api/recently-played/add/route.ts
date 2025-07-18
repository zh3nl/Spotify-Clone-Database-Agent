```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Schema for validating request body
const PlayTrackSchema = z.object({
  trackId: z.string().uuid(),
  playedAt: z.string().datetime().optional(),
});

type PlayTrackRequest = z.infer<typeof PlayTrackSchema>;

/**
 * Records a track play in the recently played history
 * 
 * @route POST /api/recently-played/add
 * @param {NextRequest} req - The request object
 * @returns {NextResponse} - The response object
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const validationResult = PlayTrackSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { trackId, playedAt = new Date().toISOString() } = validationResult.data;
    
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Insert into recently_played table
    const { data, error } = await supabase
      .from('recently_played')
      .insert({
        user_id: userId,
        track_id: trackId,
        played_at: playedAt,
      })
      .select();
    
    if (error) {
      console.error('Error recording played track:', error);
      return NextResponse.json(
        { error: 'Failed to record played track' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Unexpected error recording played track:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```