import { supabase } from './supabase';
import { uploadAudio, uploadImage, deleteFile } from './supabaseStorage';
import { v4 as uuidv4 } from 'uuid';

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
  /** Placeholder to allow future storage setup */
  initializeStorage(): void {
    // Currently no-op, but called on mount to ensure storage is ready
  }

  private validateSingle(data: SingleUploadData) {
    if (!data.title.trim()) throw new Error('Track title is required');
    if (!data.audioFile) throw new Error('Audio file is required');
    if (!data.artistId) throw new Error('Artist ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
  }

  private validateAlbum(data: AlbumUploadData) {
    if (!data.title.trim()) throw new Error('Album title is required');
    if (!data.artistId) throw new Error('Artist ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
    if (!data.tracks.length) throw new Error('At least one track is required');
    data.tracks.forEach((t, i) => {
      if (!t.title.trim()) throw new Error(`Track ${i + 1} title is required`);
      if (!t.audioFile) throw new Error(`Track ${i + 1} audio file is required`);
    });
  }

  private async uploadCover(
    file: { uri: string; name?: string; type?: string } | undefined,
    artistId: string,
    id: string,
    prefix: 'singles' | 'albums',
  ): Promise<string | null> {
    if (!file) return null;
    const ext = file.name?.split('.').pop() || 'jpg';
    const path = `images/${artistId}/${prefix}/${id}-cover.${ext}`;
    const { url } = await uploadImage(file, path);
    return url;
  }

  private async uploadTrackAudio(
    file: { uri: string; name?: string; type?: string },
    artistId: string,
    id: string,
    albumId?: string,
  ): Promise<string> {
    const base = albumId ? `audio/${artistId}/albums/${albumId}` : `audio/${artistId}/singles`;
    const path = `${base}/${id}.mp3`;
    const { url } = await uploadAudio(file, path);
    return url;
  }

  /** Upload a single track using Supabase Storage and Database */
  async uploadSingle(data: SingleUploadData): Promise<void> {
    this.validateSingle(data);
    const id = uuidv4();

    try {
      const audioUrl = await this.uploadTrackAudio(data.audioFile, data.artistId, id);
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, id, 'singles');

      const { error } = await supabase.from('singles').insert({
        id,
        title: data.title.trim(),
        lyrics: data.lyrics || '',
        duration: data.duration || 0,
        genres: data.genres,
        explicit: data.explicit,
        description: data.description || '',
        release_date: data.releaseDate,
        artist_id: data.artistId,
        main_artist_id: data.mainArtistId,
        featured_artist_ids: data.featuredArtistIds,
        audio_url: audioUrl,
        cover_url: coverUrl,
      });

      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to upload single');
    }
  }

  /** Upload an album and its tracks */
  async uploadAlbum(data: AlbumUploadData): Promise<void> {
    this.validateAlbum(data);
    const albumId = uuidv4();

    try {
      const coverUrl = await this.uploadCover(data.coverFile, data.artistId, albumId, 'albums');

      const { error: albumError } = await supabase.from('albums').insert({
        id: albumId,
        title: data.title.trim(),
        description: data.description || '',
        release_date: data.releaseDate,
        genres: data.genres,
        explicit: data.explicit,
        artist_id: data.artistId,
        main_artist_id: data.mainArtistId,
        featured_artist_ids: data.featuredArtistIds,
        cover_url: coverUrl,
      });
      if (albumError) throw albumError;

      for (const track of data.tracks) {
        const trackId = uuidv4();
        const audioUrl = await this.uploadTrackAudio(track.audioFile, data.artistId, trackId, albumId);

        const { error: trackError } = await supabase.from('tracks').insert({
          id: trackId,
          album_id: albumId,
          title: track.title.trim(),
          lyrics: track.lyrics || '',
          duration: track.duration || 0,
          explicit: track.explicit,
          track_number: track.trackNumber,
          featured_artist_ids: track.featuredArtistIds,
          audio_url: audioUrl,
        });
        if (trackError) throw trackError;
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to upload album');
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    // supply bucket name as second argument
    await deleteFile(path, 'audio-files');
  }
}

export const uploadService = new UploadService();
