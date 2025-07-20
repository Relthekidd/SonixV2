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
    this.authToken = token;
  }

  /**
   * Register a callback for unauthorized responses
   */
  setOnUnauthorizedCallback(cb: () => void) {
    this.unauthorizedCallback = cb;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (res.status === 401 && this.unauthorizedCallback) {
      this.unauthorizedCallback();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with status ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    return (data.data ?? data) as T;
  }
  /**
   * Fetch album by ID, including its tracks
   */
  async getAlbumById(id: string): Promise<AlbumDetails> {
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
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error(`Album with ID ${id} not found`);
    }
    // Type assertion since Supabase returns untyped data
    return data as AlbumDetails;
  }

  // ... add other API methods here (e.g., search, getTrackById, etc.)
}

export const apiService = new ApiService();
