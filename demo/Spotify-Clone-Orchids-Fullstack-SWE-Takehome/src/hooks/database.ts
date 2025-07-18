```typescript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Track interface representing a recently played track
 */
export interface RecentTrack {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  playedAt: string;
  duration: number;
  albumName?: string;
}

/**
 * Response from the API for recently played tracks
 */
interface RecentTracksResponse {
  tracks: RecentTrack[];
  nextCursor?: string;
}

/**
 * Hook options for useRecentlyPlayed
 */
interface UseRecentlyPlayedOptions {
  /** Number of tracks to fetch */
  limit?: number;
  /** Whether to auto-refresh data periodically */
  autoRefresh?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Custom hook to fetch and manage recently played tracks
 * 
 * @param options Configuration options for the hook
 * @returns Object containing recently played tracks, loading state, error state, and refetch function
 */
export function useRecentlyPlayed({
  limit = 20,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseRecentlyPlayedOptions = {}) {
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean>(true);

  /**
   * Fetches recently played tracks from the API
   */
  const fetchRecentTracks = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await axios.get<RecentTracksResponse>(`/api/tracks/recently-played?${params.toString()}`);
      
      if (!cursor) {
        // Initial load
        setRecentTracks(response.data.tracks);
      } else {
        // Load more
        setRecentTracks(prev => [...prev, ...response.data.tracks]);
      }
      
      setNextCursor(response.data.nextCursor);
      setHasMore(!!response.data.nextCursor);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recently played tracks'));
      setLoading(false);
    }
  }, [limit]);

  /**
   * Refetches the recently played tracks
   */
  const refetch = useCallback(() => {
    return fetchRecentTracks();
  }, [fetchRecentTracks]);

  /**
   * Loads more tracks using the next cursor
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore && nextCursor) {
      fetchRecentTracks(nextCursor);
    }
  }, [loading, hasMore, nextCursor, fetchRecentTracks]);

  // Initial fetch
  useEffect(() => {
    fetchRecentTracks();
  }, [fetchRecentTracks]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      refetch();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refetch]);

  return {
    recentTracks,
    loading,
    error,
    refetch,
    loadMore,
    hasMore
  };
}
```