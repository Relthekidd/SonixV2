// Use the global Supabase client from the AuthProvider to ensure
// authenticated requests have access to the current session.
import { supabase } from './supabase';

// Base URL for any REST endpoints if needed
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Define types for album, track, and artist details
export interface Artist {
  id: string;
  name: string;
  avatar_url?: string | null;
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
  artist?: Artist | null;
  featured_artist_ids?: string[] | null;
  featured_artists?: Artist[];
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
    if (!path) {
      console.warn('[ApiService] getPublicUrl called with empty path', bucket);
      return '';
    }

    if (/^https?:\/\//.test(path)) {
      console.log('[ApiService] getPublicUrl received full URL', path);
      return path;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log('[ApiService] getPublicUrl resolved', { bucket, path: data.publicUrl });
    return data.publicUrl;
  }

  async recordPlay(
    trackId: string,
    artistId?: string,
    userId?: string,
    durationPlayed = 0,
  ) {
    try {
      await supabase.from('song_plays').insert({
        track_id: trackId,
        artist_id: artistId,
        user_id: userId,
        duration_played: durationPlayed,
      });
    } catch (err) {
      console.error('[ApiService] recordPlay error', err);
    }
  }

  private async fetchArtists(ids: string[]): Promise<Artist[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, avatar_url')
      .in('id', ids);
    if (error) throw error;
    return (data as Artist[]) || [];
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
          tracks (
            id,
            title,
            duration,
            audio_url,
            track_number,
            play_count,
            like_count,
            lyrics,
            artist_id,
            featured_artist_ids
          )
        `,
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('[ApiService] getAlbumById supabase error', error);
        throw error;
      }

      console.log('[ApiService] getAlbumById success', data);

      const artistIds = new Set<string>();
      const mainArtistId = data.main_artist_id || data.artist_id || null;
      if (mainArtistId) artistIds.add(mainArtistId);
      (data.featured_artist_ids || []).forEach((aid: string) =>
        artistIds.add(aid),
      );
      (data.tracks || []).forEach((t: any) => {
        if (t.artist_id) artistIds.add(t.artist_id);
        (t.featured_artist_ids || []).forEach((fid: string) =>
          artistIds.add(fid),
        );
      });

      const artists = await this.fetchArtists(Array.from(artistIds));
      const artistMap = new Map(artists.map((a) => [a.id, a]));

      const album: AlbumDetails = {
        id: data.id,
        title: data.title,
        artist: mainArtistId ? artistMap.get(mainArtistId) || null : null,
        artist_id: mainArtistId,
        featured_artists:
          (data.featured_artist_ids || [])
            .map((aid: string) => artistMap.get(aid))
            .filter(Boolean) as Artist[],
        featured_artist_ids: data.featured_artist_ids || [],
        cover_url: this.getPublicUrl('images', data.cover_url),
        description: data.description || undefined,
        release_date: data.release_date || undefined,
        tracks: (data.tracks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          duration: t.duration,
          audio_url: this.getPublicUrl('audio-files', t.audio_url),
          track_number: t.track_number,
          play_count: t.play_count,
          like_count: t.like_count,
          lyrics: t.lyrics,
          artist_id: t.artist_id,
          artist: t.artist_id ? artistMap.get(t.artist_id) || null : null,
          featured_artist_ids: t.featured_artist_ids || [],
          featured_artists: (t.featured_artist_ids || [])
            .map((fid: string) => artistMap.get(fid))
            .filter(Boolean) as Artist[],
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
      .select(`*, artist:artist_id(id,name,avatar_url), album:album_id(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;

    const featuredArtists = await this.fetchArtists(
      data.featured_artist_ids || [],
    );

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
      featured_artist_ids: data.featured_artist_ids || [],
      featured_artists: featuredArtists,
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

  /** Fetch liked songs and playlists for a user */
  async getUserLibrary(userId: string): Promise<{
    likedSongIds: string[];
    playlists: { id: string; title: string; trackIds: string[] }[];
  }> {
    const [likedRes, playlistRes] = await Promise.all([
      supabase.from('liked_songs').select('track_id').eq('user_id', userId),
      supabase
        .from('playlists')
        .select('id,title, playlist_tracks:playlist_tracks(track_id,position)')
        .eq('user_id', userId),
    ]);

    const likedSongIds =
      likedRes.data?.map((r: { track_id: string }) => r.track_id) || [];

    const playlists =
      playlistRes.data?.map((p: any) => ({
        id: p.id,
        title: p.title,
        trackIds:
          (p.playlist_tracks || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((pt: any) => pt.track_id) || [],
      })) || [];

    return { likedSongIds, playlists };
  }

  /** Toggle like for a track */
  async toggleLike(userId: string, trackId: string, liked: boolean) {
    if (liked) {
      await supabase
        .from('liked_songs')
        .delete()
        .match({ user_id: userId, track_id: trackId });
    } else {
      await supabase
        .from('liked_songs')
        .upsert({ user_id: userId, track_id: trackId });
    }
  }

  /** Create a new playlist */
  async createPlaylist(userId: string, title: string) {
    const { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: userId, title })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, title: data.title };
  }

  /** Add track to playlist at the end */
  async addTrackToPlaylist(
    playlistId: string,
    trackId: string,
    position: number,
  ) {
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({ playlist_id: playlistId, track_id: trackId, position });
    if (error) throw error;
  }

  /** Remove track from playlist */
  async removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .match({ playlist_id: playlistId, track_id: trackId });
    if (error) throw error;
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
