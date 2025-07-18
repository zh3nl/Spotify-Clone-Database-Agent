/**
 * Represents a Spotify track object
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: {
    id: string;
    name: string;
  }[];
  album: {
    id: string;
    name: string;
    images: {
      url: string;
      height: number;
      width: number;
    }[];
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
}

/**
 * Represents a recently played track from Spotify API
 */
export interface RecentlyPlayedTrack {
  track: SpotifyTrack;
  played_at: string; // ISO 8601 timestamp
  context: {
    type: 'playlist' | 'album' | 'artist' | null;
    uri: string | null;
  } | null;
}

/**
 * Spotify API response for recently played tracks
 */
export interface RecentlyPlayedResponse {
  items: RecentlyPlayedTrack[];
  next: string | null;
  cursors: {
    after: string;
    before: string;
  };
  limit: number;
  href: string;
}

/**
 * Database schema for recently played tracks
 */
export interface RecentlyPlayedTrackDB {
  id: string; // UUID primary key
  user_id: string; // Foreign key to users table
  track_id: string; // Spotify track ID
  track_name: string;
  artist_names: string; // Comma-separated list of artist names
  album_name: string;
  album_image_url: string;
  played_at: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
}

/**
 * Insert parameters for recently played tracks table
 */
export type RecentlyPlayedTrackInsert = Omit<RecentlyPlayedTrackDB, 'id' | 'created_at'>;

/**
 * Update parameters for recently played tracks table
 */
export type RecentlyPlayedTrackUpdate = Partial<Omit<RecentlyPlayedTrackDB, 'id' | 'user_id' | 'track_id' | 'played_at' | 'created_at'>>;

/**
 * Query parameters for fetching recently played tracks
 */
export interface RecentlyPlayedTrackQuery {
  user_id: string;
  limit?: number;
  offset?: number;
  from_date?: string; // ISO 8601 timestamp
  to_date?: string; // ISO 8601 timestamp
}

/**
 * Response for recently played tracks API endpoint
 */
export interface RecentlyPlayedTracksApiResponse {
  tracks: {
    id: string;
    trackId: string;
    trackName: string;
    artistNames: string;
    albumName: string;
    albumImageUrl: string;
    playedAt: string;
  }[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Statistics for recently played tracks
 */
export interface RecentlyPlayedStats {
  totalTracks: number;
  uniqueTracks: number;
  topArtists: {
    name: string;
    count: number;
  }[];
  topAlbums: {
    name: string;
    count: number;
  }[];
  playsByHour: {
    hour: number;
    count: number;
  }[];
  playsByDay: {
    day: string; // 'Monday', 'Tuesday', etc.
    count: number;
  }[];
}

/**
 * Database operations for recently played tracks
 */
export interface RecentlyPlayedTrackOperations {
  insertTrack: (track: RecentlyPlayedTrackInsert) => Promise<string>; // Returns inserted ID
  getTracksByUserId: (query: RecentlyPlayedTrackQuery) => Promise<RecentlyPlayedTrackDB[]>;
  getTrackById: (id: string) => Promise<RecentlyPlayedTrackDB | null>;
  getTrackStats: (userId: string, timeRange?: 'week' | 'month' | 'year' | 'all') => Promise<RecentlyPlayedStats>;
  deleteTrack: (id: string) => Promise<boolean>;
  deleteTracksByUserId: (userId: string) => Promise<number>; // Returns count of deleted tracks
}