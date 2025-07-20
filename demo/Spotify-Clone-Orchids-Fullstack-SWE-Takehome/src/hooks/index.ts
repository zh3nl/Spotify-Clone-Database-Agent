// Re-export all individual hooks
export {
  useRecentlyPlayedTracks,
  type RecentTrack,
  type UseRecentlyPlayedTracksState,
  type UseRecentlyPlayedTracksOptions
} from './use-recently-played';

export {
  usePopularAlbums,
  useAlbum,
  type PopularAlbum,
  type UsePopularAlbumsState,
  type UsePopularAlbumsOptions
} from './use-albums';

export {
  useMadeForYouPlaylists,
  usePlaylistsByType,
  usePlaylist,
  type MadeForYouPlaylist,
  type UseMadeForYouPlaylistsState,
  type UseMadeForYouPlaylistsOptions
} from './use-playlists';

// Common hook utilities and types
export interface BaseHookState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface BaseHookOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Common cache utilities
export const CACHE_DURATIONS = {
  RECENTLY_PLAYED: 5 * 60 * 1000,    // 5 minutes
  POPULAR_ALBUMS: 15 * 60 * 1000,    // 15 minutes  
  PLAYLISTS: 30 * 60 * 1000          // 30 minutes
} as const;

// Backward compatibility - maintain existing database.ts exports
export {
  useRecentlyPlayedTracks as useRecentlyPlayedTracks_LEGACY,
  type RecentTrack as RecentTrack_LEGACY
} from './use-recently-played';