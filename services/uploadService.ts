import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import { uploadAudio, uploadImage, deleteFile as removeFromStorage } from './supabaseStorage';

export interface SingleUploadData {
  title: string;
  lyrics?: string;
  duration?: number;
  genres: string[];
  explicit: boolean;
  description?: string;
  releaseDate: string;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
  coverFile?: { uri: string; name?: string; type?: string };
  audioFile: { uri: string; name?: string; type?: string };
}

export interface AlbumUploadData {
  title: string;
  description?: string;
  releaseDate: string;
  genres: string[];
  explicit: boolean;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
  coverFile?: { uri: string; name?: string; type?: string };
  tracks: Array<{
    title: string;
    lyrics?: string;
    duration?: number;
    explicit: boolean;
    trackNumber: number;
    featuredArtistIds: string[];
    audioFile: { uri: string; name?: string; type?: string };
  }>;
}

export interface UploadPermissions {
  userId: string;
  isAdmin: boolean;
}

class UploadService {
  /** No-op initializer to ensure imports are loaded */
  initializeStorage(): void {}

  /**
   * Check if the current user has upload permissions
   * @returns Promise with user ID and admin status
   */
  async checkUploadPermissions(): Promise<UploadPermissions> {
    return await this.checkAuthAndRole();
  }

  private validateSingle(data: SingleUploadData): void {
    if (!data.title.trim()) throw new Error('Track title is required');
    if (!data.audioFile?.uri) throw new Error('Audio file is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
  }

  private async checkAuthAndRole(): Promise<UploadPermissions> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      userId: user.id,
      isAdmin: profile?.role === 'admin'
    };
  }

  private validateAlbum(data: AlbumUploadData): void {
    if (!data.title.trim()) throw new Error('Album title is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
    if (data.tracks.length < 1) throw new Error('At least one track is required');
    
    data.tracks.forEach((track, index) => {
      if (!track.title.trim()) {
        throw new Error(`Track ${index + 1} title is required`);
      }
      if (!track.audioFile?.uri) {
        throw new Error(`Track ${index + 1} audio file is required`);
      }
    });
  }

  private async uploadCover(
    file: { uri: string; name?: string; type?: string } | undefined,
    artistId: string,
    entityId: string,
    prefix: 'singles' | 'albums'
  ): Promise<string | null> {
    if (!file?.uri) return null;
    
    const ext = file.name?.split('.').pop() || 'jpg';
    const path = `images/${artistId}/${prefix}/${entityId}-cover.${ext}`;
    
    try {
      const { url } = await uploadImage(file, path);
      return url;
    } catch (err) {
      console.error('Cover upload failed:', err);
      throw new Error('Failed to upload cover image');
    }
  }

  private async uploadTrackAudio(
    file: { uri: string; name?: string; type?: string },
    artistId: string,
    trackId: string,
    albumId?: string
  ): Promise<string> {
    const base = albumId
      ? `audio/${artistId}/albums/${albumId}`
      : `audio/${artistId}/singles`;
    const path = `${base}/${trackId}.mp3`;
    
    try {
      const { url } = await uploadAudio(file, path);
      return url;
    } catch (err) {
      console.error('Audio upload failed:', err);
      throw new Error('Failed to upload audio file');
    }
  }

  async uploadSingle(data: SingleUploadData): Promise<void> {
    this.validateSingle(data);
    const id = uuidv4();

    try {
      // Verify user permissions
      const { userId } = await this.checkUploadPermissions();
      
      // Debug logging
      console.log('Current user:', userId);
      console.log('Data.artistId (created_by):', data.artistId);
      console.log('Match created_by?', userId === data.artistId);

      // Upload files
      const audioUrl = await this.uploadTrackAudio(data.audioFile, data.artistId, id);
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, id, 'singles');

      // Insert track record
      const { error } = await supabase
        .from('tracks')
        .insert({
          id,
          title: data.title.trim(),
          lyrics: data.lyrics || '',
          duration: data.duration || 0,
          explicit: data.explicit,
          release_date: data.releaseDate,
          album_id: null,
          artist_id: data.mainArtistId,
          created_by: data.artistId,
          featured_artist_ids: data.featuredArtistIds,
          track_number: 1,
          genres: data.genres,
          description: data.description || '',
          audio_url: audioUrl,
          cover_url: coverUrl,
        });
      
      if (error) throw error;
    } catch (err: any) {
      console.error('uploadSingle error:', err);
      throw new Error(err.message || 'Failed to upload single');
    }
  }

  async uploadAlbum(data: AlbumUploadData): Promise<void> {
    this.validateAlbum(data);
    const albumId = uuidv4();

    try {
      // Verify user permissions
      await this.checkUploadPermissions();

      // Upload album cover
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, albumId, 'albums');

      // Insert album record
      const { error: albumError } = await supabase
        .from('albums')
        .insert({
          id: albumId,
          title: data.title.trim(),
          description: data.description || '',
          release_date: data.releaseDate,
          genres: data.genres,
          explicit: data.explicit,
          artist_id: data.mainArtistId,
          created_by: data.artistId,
          featured_artist_ids: data.featuredArtistIds,
          cover_url: coverUrl,
        });
      
      if (albumError) throw albumError;

      // Upload each track
      for (const track of data.tracks) {
        const trackId = uuidv4();
        const audioUrl = await this.uploadTrackAudio(track.audioFile, data.artistId, trackId, albumId);
        
        const { error: trackError } = await supabase
          .from('tracks')
          .insert({
            id: trackId,
            album_id: albumId,
            title: track.title.trim(),
            lyrics: track.lyrics || '',
            duration: track.duration || 0,
            explicit: track.explicit,
            release_date: data.releaseDate,
            artist_id: data.mainArtistId,
            created_by: data.artistId,
            featured_artist_ids: track.featuredArtistIds,
            track_number: track.trackNumber,
            genres: data.genres,
            description: data.description || '',
            audio_url: audioUrl,
            cover_url: null,
          });
        
        if (trackError) throw trackError;
      }
    } catch (err: any) {
      console.error('uploadAlbum error:', err);
      throw new Error(err.message || 'Failed to upload album');
    }
  }

  async deleteFile(path: string, bucket = 'audio-files'): Promise<void> {
    try {
      await removeFromStorage(path, bucket);
    } catch (err) {
      console.error('deleteFile error:', err);
      throw new Error('Failed to delete file');
    }
  }
}

export const uploadService = new UploadService();