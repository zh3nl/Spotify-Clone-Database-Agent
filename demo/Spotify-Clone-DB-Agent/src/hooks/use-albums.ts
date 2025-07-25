import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Album interface representing a popular album
 */
export interface PopularAlbum {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  releaseDate?: string;
  popularityScore?: number;
}

/**
 * Response state for the popular albums hook
 */
interface UsePopularAlbumsState {
  data: PopularAlbum[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Options for the popular albums hook
 */
interface UsePopularAlbumsOptions {
  /** Maximum number of albums to fetch */
  limit?: number;
  /** Whether to enable automatic refetching */
  autoRefresh?: boolean;
  /** Interval in milliseconds for auto-refreshing */
  refreshInterval?: number;
}

/**
 * Custom hook to fetch and manage popular albums
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing albums, loading state, error state, and refetch function
 */
export function usePopularAlbums(
  options: UsePopularAlbumsOptions = {}
): UsePopularAlbumsState {
  const { 
    limit = 20, 
    autoRefresh = false, 
    refreshInterval = 300000 // 5 minutes default for albums
  } = options;
  
  const [albums, setAlbums] = useState<PopularAlbum[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache key for localStorage
  const cacheKey = `popular-albums-${limit}`;
  
  /**
   * Fetch popular albums from the API
   */
  const fetchAlbums = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<PopularAlbum[]>('/api/albums/popular', {
        params: { limit }
      });
      
      setAlbums(response.data);
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular albums';
      setError(errorMessage);
      
      // Try to load from cache if API request fails
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          setAlbums(data);
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
        
        // Only use cache if it's less than 15 minutes old (albums change less frequently)
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          setAlbums(data);
          setLoading(false);
        }
      } catch (err) {
        // If cache parsing fails, continue to fetch
      }
    }
    
    // Fetch fresh data
    fetchAlbums();
    
    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | undefined;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(fetchAlbums, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchAlbums, autoRefresh, refreshInterval, cacheKey]);
  
  return { data: albums, isLoading: loading, error, refetch: fetchAlbums };
}

/**
 * Hook to get a single album by ID
 */
export function useAlbum(albumId: string) {
  const { data: albums, isLoading: loading, error } = usePopularAlbums();
  
  const album = albums.find(a => a.id === albumId);
  
  return {
    album: album || null,
    loading,
    error
  };
}