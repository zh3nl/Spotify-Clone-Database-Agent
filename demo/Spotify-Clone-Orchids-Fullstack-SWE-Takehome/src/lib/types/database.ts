/**
 * Represents a Spotify artist
 */
export interface Artist {
  id: string;
  name: string;
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
}

/**
 * Represents a Spotify album
 */
export interface Album {
  id: string;
  name: string;
  uri: string;
  href: string;
  album_type: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
  artists: Artist[];
}

/**
 * Represents a Spotify track
 */
export interface Track {
  id: string;
  name: string;
  uri: string;
  href: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  album: Album;
  artists: Artist[];
}

/**
 * Represents a recently played track item from Spotify API
 */
export interface RecentlyPlayedItem {
  track: Track;
  played_at: string; // ISO 8601 timestamp
  context: {
    type: 'artist' | 'playlist' | 'album' | 'show' | null;
    uri: string | null;
    href: string | null;
    external_urls: {
      spotify: string;
    } | null;
  } | null;
}

/**
 * Represents the response from Spotify's recently played tracks API
 */
export interface RecentlyPlayedResponse {
  items: RecentlyPlayedItem[];
  next: string | null;
  cursors: {
    after: string;
    before: string;
  };
  limit: number;
  href: string;
}

/**
 * Props for a component that displays recently played tracks
 */
export interface RecentlyPlayedTracksProps {
  tracks: RecentlyPlayedItem[];
  isLoading?: boolean;
  error?: Error | null;
  limit?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * State for managing recently played tracks
 */
export interface RecentlyPlayedTracksState {
  tracks: RecentlyPlayedItem[];
  isLoading: boolean;
  error: Error | null;
  cursor?: string;
  hasMore: boolean;
}

/**
 * Parameters for fetching recently played tracks
 */
export interface FetchRecentlyPlayedParams {
  limit?: number;
  after?: string;
  before?: string;
}