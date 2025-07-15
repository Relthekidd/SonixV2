import 'react-native-get-random-values';
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

class UploadService {
  /** No-op initializer to ensure imports are loaded */
  initializeStorage(): void {}

  private validateSingle(data: SingleUploadData) {
    if (!data.title.trim()) throw new Error('Track title is required');
    if (!data.audioFile?.uri) throw new Error('Audio file is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
  }

  private validateAlbum(data: AlbumUploadData) {
    if (!data.title.trim()) throw new Error('Album title is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
    if (data.tracks.length < 1) throw new Error('At least one track is required');
    data.tracks.forEach((t, i) => {
      if (!t.title.trim()) throw new Error(`Track ${i + 1} title is required`);
      if (!t.audioFile?.uri) throw new Error(`Track ${i + 1} audio file is required`);
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
    const id = crypto.randomUUID();

    try {
      const audioUrl = await this.uploadTrackAudio(data.audioFile, data.artistId, id);
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, id, 'singles');

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
    const albumId = crypto.randomUUID();

    try {
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, albumId, 'albums');

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

      for (const t of data.tracks) {
        const trackId = crypto.randomUUID();
        const audioUrl = await this.uploadTrackAudio(t.audioFile, data.artistId, trackId, albumId);
        const { error: trackError } = await supabase
          .from('tracks')
          .insert({
            id: trackId,
            album_id: albumId,
            title: t.title.trim(),
            lyrics: t.lyrics || '',
            duration: t.duration || 0,
            explicit: t.explicit,
            release_date: data.releaseDate,
            artist_id: data.mainArtistId,
            created_by: data.artistId,
            featured_artist_ids: t.featuredArtistIds,
            track_number: t.trackNumber,
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
