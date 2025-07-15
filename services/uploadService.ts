import { supabase } from '@/providers/AuthProvider';
import {
  uploadAudio,
  uploadImage,
  deleteFile,
  // initializeBuckets, // removed: not exported
} from './supabaseStorage';

export interface SingleUploadData {
  title: string;
  lyrics?: string;
  duration?: number;
  genres: string[];
  explicit: boolean;
  coverFile?: { uri: string; name?: string; type?: string };
  audioFile: { uri: string; name?: string; type?: string };
  description?: string;
  releaseDate?: string;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
}

export interface AlbumUploadData {
  title: string;
  description?: string;
  releaseDate?: string;
  coverFile?: { uri: string; name?: string; type?: string };
  genres: string[];
  explicit: boolean;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
  tracks: Array<{
    title: string;
    audioFile: { uri: string; name?: string; type?: string };
    lyrics?: string;
    explicit: boolean;
    trackNumber: number;
    duration?: number;
    featuredArtistIds: string[];
  }>;
}

class UploadService {
  /**
   * Upload a single track using Supabase Storage and Database
   */
  async uploadSingle(singleData: SingleUploadData): Promise<any> {
    // ... existing uploadSingle implementation
  }

  /**
   * Upload an album with multiple tracks
   */
  async uploadAlbum(albumData: AlbumUploadData): Promise<any> {
    // ... existing uploadAlbum implementation
  }

  /**
   * Delete an album completely (both from database and storage)
   */
  async deleteAlbum(albumId: string): Promise<void> {
    // ... existing deleteAlbum implementation
  }

  /**
   * Delete a track completely (both from database and storage)
   */
  async deleteTrack(trackId: string): Promise<void> {
    // ... existing deleteTrack implementation
  }

  /**
   * Generic delete content helper
   */
  async deleteContent(type: string, id: string): Promise<void> {
    if (type === 'track') {
      await this.deleteTrack(id);
    } else if (type === 'album') {
      await this.deleteAlbum(id);
    } else {
      throw new Error(`Unsupported content type: ${type}`);
    }
  }

  /**
   * Publish a track
   */
  async publishTrack(trackId: string): Promise<any> {
    // Delegate to supabase track publish
    const { data, error } = await supabase
      .from('tracks')
      .update({ is_published: true })
      .eq('id', trackId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Unpublish a track
   */
  async unpublishTrack(trackId: string): Promise<any> {
    // Delegate to supabase track unpublish
    const { data, error } = await supabase
      .from('tracks')
      .update({ is_published: false })
      .eq('id', trackId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // /**
  //  * Initialize storage buckets on app start
  //  */
  // async initializeStorage(): Promise<void> {
  //   await initializeBuckets();
  // }
}

export const uploadService = new UploadService();
