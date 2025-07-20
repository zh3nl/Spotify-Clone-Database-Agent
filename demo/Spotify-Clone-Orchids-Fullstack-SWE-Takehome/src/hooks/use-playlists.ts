import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Playlist interface representing a made-for-you playlist
 */
export interface MadeForYouPlaylist {
  id: string;
  title: string;
  artist: string; // Description field from API
  album: string;  // Playlist type field from API
  albumArt: string;
  duration: number;
  playlistType?: string;
}

/**
 * Response state for the made-for-you playlists hook
 */
interface UseMadeForYouPlaylistsState {
  playlists: MadeForYouPlaylist[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Options for the made-for-you playlists hook
 */
interface UseMadeForYouPlaylistsOptions {
  /** Maximum number of playlists to fetch */
  limit?: number;
  /** Whether to enable automatic refetching */
  autoRefresh?: boolean;
  /** Interval in milliseconds for auto-refreshing */
  refreshInterval?: number;
  /** Filter by playlist type */
  playlistType?: string;
}

/**
 * Custom hook to fetch and manage made-for-you playlists
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing playlists, loading state, error state, and refetch function
 */
export function useMadeForYouPlaylists(
  options: UseMadeForYouPlaylistsOptions = {}
): UseMadeForYouPlaylistsState {
  const { 
    limit = 20, 
    autoRefresh = false, 
    refreshInterval = 600000, // 10 minutes default for playlists
    playlistType
  } = options;
  
  const [playlists, setPlaylists] = useState<MadeForYouPlaylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Cache key for localStorage
  const cacheKey = `made-for-you-playlists-${limit}-${playlistType || 'all'}`;
  
  /**
   * Fetch made-for-you playlists from the API
   */
  const fetchPlaylists = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit };
      if (playlistType) {
        params.type = playlistType;
      }
      
      const response = await axios.get<MadeForYouPlaylist[]>('/api/playlists/made-for-you', {
        params
      });
      
      let filteredPlaylists = response.data;
      
      // Additional client-side filtering if needed
      if (playlistType && filteredPlaylists.length > 0) {
        filteredPlaylists = filteredPlaylists.filter(
          playlist => playlist.playlistType === playlistType
        );
      }
      
      setPlaylists(filteredPlaylists);
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        data: filteredPlaylists,
        timestamp: Date.now()
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch made-for-you playlists'));
      
      // Try to load from cache if API request fails
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          setPlaylists(data);
        } catch (cacheErr) {
          // If cache parsing fails, keep the error state
        }
      }
    } finally {
      setLoading(false);
    }
  }, [limit, cacheKey, playlistType]);
  
  /**
   * Initialize the hook by loading from cache first, then fetching fresh data
   */
  useEffect(() => {
    // Try to load from cache first for immediate display
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        
        // Only use cache if it's less than 30 minutes old (playlists change less frequently)
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setPlaylists(data);
          setLoading(false);
        }
      } catch (err) {
        // If cache parsing fails, continue to fetch
      }
    }
    
    // Fetch fresh data
    fetchPlaylists();
    
    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | undefined;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(fetchPlaylists, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchPlaylists, autoRefresh, refreshInterval, cacheKey]);
  
  return { playlists, loading, error, refetch: fetchPlaylists };
}

/**
 * Hook to get playlists by type (daily_mix, personalized, etc.)
 */
export function usePlaylistsByType(playlistType: string) {
  return useMadeForYouPlaylists({ playlistType });
}

/**
 * Hook to get a single playlist by ID
 */
export function usePlaylist(playlistId: string) {
  const { playlists, loading, error } = useMadeForYouPlaylists();
  
  const playlist = playlists.find(p => p.id === playlistId);
  
  return {
    playlist: playlist || null,
    loading,
    error
  };
}