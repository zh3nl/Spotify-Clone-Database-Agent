import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  played_at: string;
}

interface UseRecentlyPlayedTracksOptions {
  limit?: number;
  onError?: (error: Error) => void;
}

export function useRecentlyPlayedTracks({ 
  limit = 20, 
  onError 
}: UseRecentlyPlayedTracksOptions = {}) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecentlyPlayedTracks = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data, error: supabaseError } = await supabase
          .from('played_tracks')
          .select('id, title, artist, album, cover_url, played_at')
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(limit);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setTracks(data || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch recently played tracks');
        setError(error);
        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyPlayedTracks();
  }, [user, limit, onError]);

  const refresh = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error: supabaseError } = await supabase
        .from('played_tracks')
        .select('id, title, artist, album, cover_url, played_at')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(limit);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setTracks(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh recently played tracks');
      setError(error);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    tracks,
    loading,
    error,
    refresh
  };
}