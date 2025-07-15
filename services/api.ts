import { supabase } from './supabase';

export class ApiService {
  private authToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  /**
   * Set the Bearer authentication token for API calls
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Register a callback to invoke on HTTP 401 Unauthorized
   */
  setOnUnauthorizedCallback(fn: () => void) {
    this.onUnauthorizedCallback = fn;
  }

  /**
   * Fetch recent uploads: singles, albums, tracks
   */
  async getRecentUploads() {
    const [
      { data: singles, error: sErr },
      { data: albums, error: aErr },
      { data: tracks, error: tErr }
    ] = await Promise.all([
      supabase.from('singles').select('*, artist:profiles(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('albums').select('*, artist:profiles(name), track_count:tracks(id,count)').order('created_at', { ascending: false }).limit(50),
      supabase.from('tracks').select('*, artist:profiles(name), cover_url:albums!inner(cover_url)').order('created_at', { ascending: false }).limit(50),
    ]);

    if (sErr || aErr || tErr) throw new Error('Failed to load recent uploads');
    return { singles: singles || [], albums: albums || [], tracks: tracks || [] };
  }

  /**
   * Fetch a single track by its ID
   */
  async getTrackById(id: string) {
    const { data, error } = await supabase.from('tracks').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  /**
   * Fetch a single artist profile by its ID
   */
  async getArtistById(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  /**
   * Fetch all tracks by a specific artist
   */
  async getArtistTracks(artistId: string) {
    const { data, error } = await supabase.from('tracks').select('*').eq('artist_id', artistId);
    if (error) throw error;
    return data;
  }

  /**
   * Publish a track
   */
  async publishTrack(id: string): Promise<void> {
    const { error } = await supabase.from('tracks').update({ is_published: true }).eq('id', id);
    if (error) throw error;
  }

  /**
   * Unpublish a track
   */
  async unpublishTrack(id: string): Promise<void> {
    const { error } = await supabase.from('tracks').update({ is_published: false }).eq('id', id);
    if (error) throw error;
  }

  /**
   * Delete a single, album, or track by ID
   */
  async deleteContent(type: 'single' | 'album' | 'track', id: string): Promise<void> {
    const table = type === 'track' ? 'tracks' : type === 'single' ? 'singles' : 'albums';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Perform a JSON POST with auth token and unauthorized handling
   */
  async examplePost(endpoint: string, body: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.status === 401 && this.onUnauthorizedCallback) this.onUnauthorizedCallback();
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  }
}

export const apiService = new ApiService();
