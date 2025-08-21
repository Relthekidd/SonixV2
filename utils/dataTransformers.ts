import { apiService } from '@/services/api';
import { Track, TrackRow, Artist, AlbumResult, PlaylistResult, UserResult } from '@/types';

/**
 * Transform raw Supabase track data into frontend Track interface
 */
export function transformTrack(
  t: TrackRow,
  likedSongIds: string[] = []
): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist?.name || t.artist_name || 'Unknown Artist',
    artistId: t.artist_id || undefined,
    album: t.album?.title || t.album_title || 'Single',
    albumId: t.album_id || undefined,
    duration: t.duration || 0,
    coverUrl: apiService.getPublicUrl(
      'images',
      t.cover_url || t.album?.cover_url || ''
    ),
    audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
    isLiked: likedSongIds.includes(t.id),
    genre: Array.isArray(t.genres)
      ? t.genres[0]
      : (t.genres as string) || '',
    genres: Array.isArray(t.genres)
      ? (t.genres as string[])
      : typeof t.genres === 'string'
        ? [t.genres]
        : [],
    releaseDate: t.release_date || t.created_at || '',
    year: t.release_date
      ? new Date(t.release_date).getFullYear().toString()
      : undefined,
    description: t.description || '',
    playCount: t.play_count || undefined,
    trackNumber: t.track_number || undefined,
    lyrics: t.lyrics || undefined,
    likeCount: t.like_count || undefined,
  };
}

/**
 * Transform raw Supabase album data into frontend AlbumResult interface
 */
export function transformAlbum(a: {
  id: string;
  title: string;
  cover_url?: string | null;
  artist?: { name?: string } | null;
}): AlbumResult {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist?.name || 'Unknown Artist',
    coverUrl: apiService.getPublicUrl('images', a.cover_url || ''),
  };
}

/**
 * Transform raw Supabase playlist data into frontend PlaylistResult interface
 */
export function transformPlaylist(p: {
  id: string;
  title: string;
  cover_url?: string | null;
}): PlaylistResult {
  return {
    id: p.id,
    title: p.title,
    coverUrl: apiService.getPublicUrl('images', p.cover_url || ''),
  };
}

/**
 * Transform raw Supabase artist data into frontend Artist interface
 */
export function transformArtist(a: {
  id: string;
  name: string;
  avatar_url?: string | null;
}): Artist {
  return {
    id: a.id,
    name: a.name,
    avatar_url: a.avatar_url
      ? apiService.getPublicUrl('images', a.avatar_url)
      : null,
  };
}

/**
 * Transform raw Supabase user data into frontend UserResult interface
 */
export function transformUser(u: {
  id: string;
  username: string;
  avatar_url?: string | null;
}): UserResult {
  return {
    id: u.id,
    username: u.username,
    avatar_url: u.avatar_url
      ? apiService.getPublicUrl('images', u.avatar_url)
      : null,
  };
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date string to readable format
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date string to short format (Month Year)
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

/**
 * Format play count with appropriate units (K, M)
 */
export function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}