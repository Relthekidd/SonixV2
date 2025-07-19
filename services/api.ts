import { supabase } from './supabase';

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
