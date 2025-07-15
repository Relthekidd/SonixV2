import { supabase } from './supabase';
import { uploadAudio, uploadImage, deleteFile } from './supabaseStorage';
import { v4 as uuidv4 } from 'uuid'; // npm install --save-dev @types/uuid

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
  /**
   * Upload a single track using Supabase Storage and Database
   */
  async uploadSingle(data: SingleUploadData): Promise<void> {
    const id = uuidv4();
    // Upload audio
    const audioResult = await uploadAudio(
      data.audioFile,
      `singles/${data.artistId}/${id}.mp3`
    );
    const audioUrl = audioResult.url;

    // Upload cover image if provided
    let coverUrl: string | null = null;
    if (data.coverFile) {
      const ext = data.coverFile.name?.split('.').pop() || 'jpg';
      const coverResult = await uploadImage(
        data.coverFile,
        `singles/${data.artistId}/${id}-cover.${ext}`
      );
      coverUrl = coverResult.url;
    }

    // Insert metadata into database
    const { error } = await supabase.from('singles').insert({
      id,
      title: data.title,
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

    if (error) {
      throw new Error(`Failed to upload single: ${error.message}`);
    }
  }

  /**
   * Upload an album and its tracks
   */
  async uploadAlbum(data: AlbumUploadData): Promise<void> {
    const albumId = uuidv4();
    // Upload cover image if provided
    let coverUrl: string | null = null;
    if (data.coverFile) {
      const ext = data.coverFile.name?.split('.').pop() || 'jpg';
      const coverResult = await uploadImage(
        data.coverFile,
        `albums/${data.artistId}/${albumId}-cover.${ext}`
      );
      coverUrl = coverResult.url;
    }

    // Create album record
    const { error: albumError } = await supabase.from('albums').insert({
      id: albumId,
      title: data.title,
      description: data.description || '',
      release_date: data.releaseDate,
      genres: data.genres,
      explicit: data.explicit,
      artist_id: data.artistId,
      main_artist_id: data.mainArtistId,
      featured_artist_ids: data.featuredArtistIds,
      cover_url: coverUrl,
    });

    if (albumError) {
      throw new Error(`Failed to create album: ${albumError.message}`);
    }

    // Upload each track
    for (const track of data.tracks) {
      const trackId = uuidv4();
      const audioResult = await uploadAudio(
        track.audioFile,
        `albums/${data.artistId}/${albumId}/${trackId}.mp3`
      );
      const audioUrl = audioResult.url;

      const { error: trackError } = await supabase.from('tracks').insert({
        id: trackId,
        album_id: albumId,
        title: track.title,
        lyrics: track.lyrics || '',
        duration: track.duration || 0,
        explicit: track.explicit,
        track_number: track.trackNumber,
        featured_artist_ids: track.featuredArtistIds,
        audio_url: audioUrl,
      });

      if (trackError) {
        throw new Error(`Failed to upload track "${track.title}": ${trackError.message}`);
      }
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
