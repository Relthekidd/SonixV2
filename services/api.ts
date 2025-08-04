// Use the global Supabase client from the AuthProvider to ensure
// authenticated requests have access to the current session.
import { supabase } from './supabase';

// Base URL for any REST endpoints if needed
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Define types for album and track details
export interface TrackData {
  id: string;
  title: string;
  duration: number;
  audio_url: string;
  track_number: number | null;
  play_count: number | null;
  like_count: number | null;
  lyrics: string | null;
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string; // aliased from artist_name
  artist_id?: string | null;
  cover_url: string;
  description?: string;
  release_date?: string;
  tracks: TrackData[];
}

interface TrackDetails {
  id: string;
  title: string;
  duration: number | null;
  audio_url: string;
  track_number?: number | null;
  play_count?: number | null;
  like_count?: number | null;
  lyrics?: string | null;
  cover_url?: string | null;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  album_id?: string | null;
  album?: { title?: string; cover_url?: string | null } | null;
  description?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
}

interface SingleDetails {
  id: string;
  title: string;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  track?: TrackDetails | null;
  cover_url: string;
  description?: string | null;
  release_date?: string | null;
}

class ApiService {
  private authToken = '';
  private unauthorizedCallback: (() => void) | null = null;

  /**
   * Helper to convert a storage path into a public URL
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async recordPlay(trackId: string, artistId: string) {
    try {
      await supabase
        .from('song_plays')
        .insert({ track_id: trackId, artist_id: artistId });
    } catch (err) {
      console.error('[ApiService] recordPlay error', err);
    }
  }

  /**
   * Set the authorization token used for REST requests
   */
  setAuthToken(token: string) {
    console.log('[ApiService] setAuthToken', token?.slice(0, 10) + '…');
    this.authToken = token;
  }

  /**
   * Register a callback for unauthorized responses
   */
  setOnUnauthorizedCallback(cb: () => void) {
    console.log('[ApiService] setOnUnauthorizedCallback');
    this.unauthorizedCallback = cb;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    console.log('[ApiService] request start', endpoint, options);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {}),
        ...(options.headers || {}),
      },
    });

    if (res.status === 401 && this.unauthorizedCallback) {
      console.warn('[ApiService] request 401, invoking unauthorizedCallback');
      this.unauthorizedCallback();
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[ApiService] request error ${res.status}`, text);
      throw new Error(text || `Request failed with status ${res.status}`);
    }

    const raw = await res.text().catch(() => '');
    const parsed = raw ? JSON.parse(raw) : {};
    const data = (parsed.data ?? parsed) as T;
    console.log('[ApiService] request success', endpoint, data);
    return data;
  }

  /**
   * Fetch album by ID, including its tracks
   */
  async getAlbumById(id: string): Promise<AlbumDetails> {
    console.log('[ApiService] getAlbumById start for', id);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select(
          `
          *,
          artist:artist_id(*),
          tracks (
            id,
            title,
            duration,
            audio_url,
            track_number,
            play_count,
            like_count,
            lyrics
          )
        `,
        )
        .eq('id', id) // ← filter by album id
        .single(); // ← expect a single row

      if (error) {
        console.error('[ApiService] getAlbumById supabase error', error);
        throw error;
      }

      console.log('[ApiService] getAlbumById success', data);
      const album: AlbumDetails = {
        id: data.id,
        title: data.title,
        artist: data.artist?.name || data.artist_name || '',
        artist_id: data.artist_id,
        cover_url: this.getPublicUrl('images', data.cover_url),
        description: data.description || undefined,
        release_date: data.release_date || undefined,
        tracks: (data.tracks || []).map((t: TrackData) => ({
          ...t,
          audio_url: this.getPublicUrl('audio-files', t.audio_url),
        })),
      };
      return album;
    } catch (err) {
      console.error('[ApiService] getAlbumById error', err);
      throw err;
    }
  }

  /**
   * Fetch track by ID with related artist and album
   */
  async getTrackById(id: string): Promise<TrackDetails> {
    const { data, error } = await supabase
      .from('tracks')
      .select(`*, artist:artist_id(*), album:album_id(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    const track: TrackDetails = {
      id: data.id,
      title: data.title,
      duration: data.duration,
      audio_url: this.getPublicUrl('audio-files', data.audio_url),
      track_number: data.track_number,
      play_count: data.play_count,
      like_count: data.like_count,
      lyrics: data.lyrics,
      cover_url: this.getPublicUrl('images', data.cover_url),
      artist_id: data.artist_id,
      artist: data.artist,
      album_id: data.album_id,
      album: data.album,
      description: data.description,
      release_date: data.release_date,
      genres: data.genres,
    };
    return track;
  }

  /**
   * Fetch single by ID and join its track
   */
  async getSingleById(id: string): Promise<SingleDetails> {
    const { data, error } = await supabase
      .from('singles')
      .select(`*, artist:artist_id(*), track:track_id(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    const single: SingleDetails = {
      id: data.id,
      title: data.title,
      artist_id: data.artist_id,
      artist: data.artist,
      track: data.track
        ? {
            ...data.track,
            audio_url: this.getPublicUrl('audio-files', data.track.audio_url),
          }
        : null,
      cover_url: this.getPublicUrl('images', data.cover_url),
      description: data.description,
      release_date: data.release_date,
    };
    return single;
  }

  /** Get artist info */
  async getArtistById(id: string): Promise<{ id: string; name: string; avatar_url?: string | null }> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /** Get tracks for an artist */
  async getArtistTracks(id: string): Promise<TrackDetails[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*, artist:artist_id(*), album:album_id(*)')
      .eq('artist_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t: TrackDetails) => ({
      id: t.id,
      title: t.title,
      duration: t.duration,
      audio_url: this.getPublicUrl('audio-files', t.audio_url),
      track_number: t.track_number,
      play_count: t.play_count,
      like_count: t.like_count,
      lyrics: t.lyrics,
      cover_url: this.getPublicUrl('images', t.cover_url || ''),
      artist_id: t.artist_id,
      artist: t.artist,
      album_id: t.album_id,
      album: t.album,
      description: t.description,
      release_date: t.release_date,
      genres: t.genres,
    }));
  }

  /** Recent uploads across singles, albums and tracks */
  async getRecentUploads() {
    const [singles, albums, tracks] = await Promise.all([
      supabase
        .from('singles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('albums')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    return {
      singles: singles.data || [],
      albums: albums.data || [],
      tracks: tracks.data || [],
    };
  }

  /** Publish a track */
  async publishTrack(id: string) {
    const { error } = await supabase
      .from('tracks')
      .update({ is_published: true })
      .eq('id', id);
    if (error) throw error;
  }

  /** Unpublish a track */
  async unpublishTrack(id: string) {
    const { error } = await supabase
      .from('tracks')
      .update({ is_published: false })
      .eq('id', id);
    if (error) throw error;
  }

  /** Delete uploaded content by type */
  async deleteContent(type: 'single' | 'album' | 'track', id: string) {
    const table =
      type === 'album' ? 'albums' : type === 'single' ? 'singles' : 'tracks';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // If you need to call REST endpoints:
  // async fetchSomeOtherResource() {
  //   return this.request<SomeType>('/some-endpoint');
  // }
}

/**
 * Singleton for making API calls
 */
export const apiService = new ApiService();
