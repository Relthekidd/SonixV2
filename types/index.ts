export interface Artist {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  isLiked: boolean;
  genre: string;
  genres?: string[];
  releaseDate: string;
  year?: string;
  description?: string;
  playCount?: number;
  trackNumber?: number;
  lyrics?: string;
  likeCount?: number;
  featuredArtists?: Artist[];
}

export interface Playlist {
  id: string;
  title: string;
  trackIds: string[];
  description?: string;
  coverUrl?: string;
  isPublic?: boolean;
  createdAt?: string;
  userId?: string;
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: Artist | null;
  artist_id?: string | null;
  featured_artists: Artist[];
  featured_artist_ids?: string[] | null;
  cover_url: string;
  description?: string;
  release_date?: string;
  tracks: TrackData[];
}

export interface TrackData {
  id: string;
  title: string;
  duration: number;
  audio_url: string;
  track_number: number | null;
  play_count: number | null;
  like_count: number | null;
  lyrics: string | null;
  artist_id?: string | null;
  artist?: Artist | null;
  featured_artist_ids?: string[] | null;
  featured_artists?: Artist[];
}

export interface TrackRow {
  id: string;
  title: string;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  artist_name?: string | null;
  album_id?: string | null;
  album?: { title?: string; cover_url?: string | null } | null;
  album_title?: string | null;
  duration?: number | null;
  cover_url?: string | null;
  audio_url: string;
  genres?: string[] | string | null;
  release_date?: string | null;
  created_at?: string;
  play_count?: number | null;
  track_number?: number | null;
  like_count?: number | null;
  description?: string | null;
  lyrics?: string | null;
}

export interface AlbumResult {
  id: string;
  title: string;
  artist?: string;
  coverUrl: string;
}

export interface PlaylistResult {
  id: string;
  title: string;
  coverUrl: string;
}

export interface UserResult {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface SearchResults {
  tracks: Track[];
  albums: AlbumResult[];
  playlists: PlaylistResult[];
  artists: Artist[];
  users: UserResult[];
}

export type RepeatMode = 'off' | 'all' | 'one';
export type SortOrder = 'recent' | 'popular' | 'relevance';