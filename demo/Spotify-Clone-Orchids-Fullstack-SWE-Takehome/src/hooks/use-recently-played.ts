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
  data: RecentTrack[];
  isLoading: boolean;
  error: string | null;
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
 * @param options - Configuration options for the hook
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
  const [error, setError] = useState<string | null>(null);
  
  // Cache key for localStorage
  const cacheKey = `recently-played-tracks-${limit}`;
  
  /**
   * Fetch recently played tracks from the API
   */
  const fetchTracks = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<RecentTrack[]>('/api/tracks/recently-played', {
        params: { limit }
      });
      
      setTracks(response.data);
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recently played tracks';
      setError(errorMessage);
      
      // Try to load from cache if API request fails
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          setTracks(data);
        } catch (cacheErr) {
          // If cache parsing fails, keep the error state
        }
      }
    } finally {
      setLoading(false);
    }
  }, [limit, cacheKey]);
  
  /**
   * Initialize the hook by loading from cache first, then fetching fresh data
   */
  useEffect(() => {
    // Try to load from cache first for immediate display
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        
        // Only use cache if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setTracks(data);
          setLoading(false);
        }
      } catch (err) {
        // If cache parsing fails, continue to fetch
      }
    }
    
    // Fetch fresh data
    fetchTracks();
    
    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | undefined;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(fetchTracks, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchTracks, autoRefresh, refreshInterval, cacheKey]);
  
  return { data: tracks, isLoading: loading, error, refetch: fetchTracks };
}