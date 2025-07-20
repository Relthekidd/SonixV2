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
  artist: string;              // aliased from artist_name
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log('[ApiService] request start', endpoint, options);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
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
        .select(`
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
        `) // ← closed backtick
        .eq('id', id)   // ← filter by album id
        .single();      // ← expect a single row

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

  // If you need to call REST endpoints:
  // async fetchSomeOtherResource() {
  //   return this.request<SomeType>('/some-endpoint');
  // }
}

/**
 * Singleton for making API calls
 */
export const apiService = new ApiService();
