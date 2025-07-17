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
 * Response state for the recently played tracks hook
 */
interface UseRecentlyPlayedTracksState {
  tracks: RecentTrack[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Options for the recently played tracks hook
 */
interface UseRecentlyPlayedTracksOptions {
  /** Maximum number of tracks to fetch */
  limit?: number;
  /** Whether to enable automatic refetching */
  autoRefresh?: boolean;
  /** Interval in milliseconds for auto-refreshing */
  refreshInterval?: number;
}

/**
 * Custom hook to fetch and manage recently played tracks
 * 
 * @param options Configuration options for the hook
 * @returns Object containing tracks, loading state, error state, and refetch function
 */
export function useRecentlyPlayedTracks(
  options: UseRecentlyPlayedTracksOptions = {}
): UseRecentlyPlayedTracksState {
  const { 
    limit = 20, 
    autoRefresh = false, 
    refreshInterval = 60000 
  } = options;
  
  const [tracks, setTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Create a cache key based on the limit
  const cacheKey = `recently-played-tracks-${limit}`;

  /**
   * Fetches recently played tracks from the API
   */
  const fetchTracks = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(`${cacheKey}-timestamp`);
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 300000) {
        setTracks(JSON.parse(cachedData));
        setLoading(false);
        return;
      }
      
      const response = await axios.get<RecentTrack[]>(`/api/recently-played?limit=${limit}`);
      
      // Update state with fetched data
      setTracks(response.data);
      
      // Cache the response
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
      localStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString());
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recently played tracks'));
    } finally {
      setLoading(false);
    }
  }, [limit, cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      fetchTracks();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchTracks]);

  return {
    tracks,
    loading,
    error,
    refetch: fetchTracks
  };
}
```