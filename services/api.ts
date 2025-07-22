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
  track_number: number;
  play_count: number;
  like_count: number;
  lyrics: string;
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string; // aliased from artist_name
  cover_url: string;
  description?: string;
  release_date?: string;
  tracks: TrackData[];
}

class ApiService {
  private authToken = '';
  private unauthorizedCallback: (() => void) | null = null;

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
          id,
          title,
          artist:artist_name,
          cover_url,
          description,
          release_date,
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
        ) // ← closed backtick
        .eq('id', id) // ← filter by album id
        .single(); // ← expect a single row

      if (error) {
        console.error('[ApiService] getAlbumById supabase error', error);
        throw error;
      }

      console.log('[ApiService] getAlbumById success', data);
      return data as AlbumDetails;
    } catch (err) {
      console.error('[ApiService] getAlbumById error', err);
      throw err;
    }
  }

  /**
   * Fetch track by ID with related artist and album
   */
  async getTrackById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('tracks')
      .select(`*, artist:artist_id(*), album:album_id(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /** Get artist info */
  async getArtistById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /** Get tracks for an artist */
  async getArtistTracks(id: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('artist_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
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
