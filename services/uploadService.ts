import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
// Use the shared Supabase client with persisted auth session
import { supabase } from './supabase';
import {
  uploadAudio,
  uploadImage,
  deleteFile as removeFromStorage,
} from './supabaseStorage';

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
  isPublished?: boolean;
  scheduledPublishAt?: string | null;
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
  isPublished?: boolean;
  scheduledPublishAt?: string | null;
}

export interface UploadPermissions {
  userId: string;
  isAdmin: boolean;
}

class UploadService {
  /** No-op initializer to ensure imports are loaded */
  initializeStorage(): void {
    console.log('[UploadService] initializeStorage called');
  }

  /**
   * Check if the current user has upload permissions
   * @returns Promise with user ID and admin status
   */
  async checkUploadPermissions(): Promise<UploadPermissions> {
    console.log('[UploadService] checkUploadPermissions start');
    const perms = await this.checkAuthAndRole();
    console.log('[UploadService] checkUploadPermissions result', perms);
    return perms;
  }

  private validateSingle(data: SingleUploadData): void {
    console.log('[UploadService] validateSingle', data);
    if (!data.title.trim()) throw new Error('Track title is required');
    if (!data.audioFile?.uri) throw new Error('Audio file is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
  }

  private async checkAuthAndRole(): Promise<UploadPermissions> {
    console.log('[UploadService] checkAuthAndRole start');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error('[UploadService] checkAuthAndRole authError', authError);
      throw new Error('User not authenticated');
    }
    const userId = authData.user.id;
    console.log('[UploadService] authenticated user', userId);

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (profileError) {
      console.error('[UploadService] fetching profile error', profileError);
      throw profileError;
    }

    const isAdmin = profile?.role === 'admin';
    console.log(
      '[UploadService] user role',
      profile?.role,
      'isAdmin=',
      isAdmin,
    );
    return { userId, isAdmin };
  }

  private validateAlbum(data: AlbumUploadData): void {
    console.log('[UploadService] validateAlbum', data);
    if (!data.title.trim()) throw new Error('Album title is required');
    if (!data.artistId) throw new Error('Uploader ID is required');
    if (!data.mainArtistId) throw new Error('Main artist is required');
    if (data.tracks.length < 1)
      throw new Error('At least one track is required');

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
    prefix: 'singles' | 'albums',
  ): Promise<string | null> {
    console.log(
      `[UploadService] uploadCover start for ${prefix}/${entityId}`,
      file,
    );
    if (!file?.uri) {
      console.log('[UploadService] no cover file provided');
      return null;
    }

    const ext = file.name?.split('.').pop() || 'jpg';
    const path = `images/${artistId}/${prefix}/${entityId}-cover.${ext}`;
    console.log('[UploadService] cover path', path);

    try {
      const { url } = await uploadImage(file, path);
      console.log('[UploadService] cover upload success:', url);
      return url;
    } catch (err) {
      console.error('[UploadService] cover upload failed:', err);
      throw new Error('Failed to upload cover image');
    }
  }

  private async uploadTrackAudio(
    file: { uri: string; name?: string; type?: string },
    artistId: string,
    trackId: string,
    albumId?: string,
  ): Promise<string> {
    const base = albumId
      ? `audio/${artistId}/albums/${albumId}`
      : `audio/${artistId}/singles`;
    const path = `${base}/${trackId}.mp3`;
    console.log('[UploadService] uploadTrackAudio start, path=', path, file);

    try {
      const { url } = await uploadAudio(file, path);
      console.log('[UploadService] audio upload success:', url);
      return url;
    } catch (err) {
      console.error('[UploadService] audio upload failed:', err);
      throw new Error('Failed to upload audio file');
    }
  }

  async uploadSingle(data: SingleUploadData): Promise<string> {
    console.log('[UploadService] uploadSingle start', data);
    this.validateSingle(data);
    const id = uuidv4();
    console.log('[UploadService] generated track ID', id);

    try {
      const { userId, isAdmin } = await this.checkUploadPermissions();
      console.log('[UploadService] permissions for uploadSingle', {
        userId,
        isAdmin,
      });

      console.log('[UploadService] comparing created_by');
      console.log('Current user:', userId);
      console.log('Data.artistId:', data.artistId);
      console.log('Match?', userId === data.artistId);

      const audioUrl = await this.uploadTrackAudio(
        data.audioFile,
        data.artistId,
        id,
      );
      const coverUrl = await this.uploadCover(
        data.coverFile,
        data.artistId,
        id,
        'singles',
      );

      console.log('[UploadService] inserting track record');
      const { error } = await supabase.from('tracks').insert({
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
        is_published: data.isPublished ?? false,
        scheduled_publish_at: data.scheduledPublishAt ?? null,
      });
      if (error) {
        console.error('[UploadService] supabase.insert track error', error);
        throw error;
      }
      console.log('[UploadService] uploadSingle complete');
      return id;
    } catch (err: any) {
      console.error('[UploadService] uploadSingle error:', err);
      throw new Error(err.message || 'Failed to upload single');
    }
  }

  async uploadAlbum(
    data: AlbumUploadData,
  ): Promise<{ albumId: string; trackIds: string[] }> {
    console.log('[UploadService] uploadAlbum start', data);
    this.validateAlbum(data);
    const albumId = uuidv4();
    console.log('[UploadService] generated album ID', albumId);

    try {
      const { userId, isAdmin } = await this.checkUploadPermissions();
      console.log('[UploadService] permissions for uploadAlbum', {
        userId,
        isAdmin,
      });

      const coverUrl = await this.uploadCover(
        data.coverFile,
        data.artistId,
        albumId,
        'albums',
      );
      console.log('[UploadService] inserting album record');
      const { error: albumError } = await supabase.from('albums').insert({
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
        is_published: data.isPublished ?? false,
        scheduled_publish_at: data.scheduledPublishAt ?? null,
      });
      if (albumError) {
        console.error(
          '[UploadService] supabase.insert album error',
          albumError,
        );
        throw albumError;
      }
      console.log('[UploadService] album record inserted');

      const trackIds: string[] = [];
      for (const track of data.tracks) {
        const trackId = uuidv4();
        console.log(
          '[UploadService] processing track',
          track.trackNumber,
          track,
        );
        const audioUrl = await this.uploadTrackAudio(
          track.audioFile,
          data.artistId,
          trackId,
          albumId,
        );

        console.log('[UploadService] inserting track for album');
        const { error: trackError } = await supabase.from('tracks').insert({
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
          is_published: data.isPublished ?? false,
          scheduled_publish_at: data.scheduledPublishAt ?? null,
        });
        if (trackError) {
          console.error(
            '[UploadService] supabase.insert track for album error',
            trackError,
          );
          throw trackError;
        }
        trackIds.push(trackId);
      }
      console.log('[UploadService] uploadAlbum complete');
      return { albumId, trackIds };
    } catch (err: any) {
      console.error('[UploadService] uploadAlbum error:', err);
      throw new Error(err.message || 'Failed to upload album');
    }
  }

  async deleteFile(path: string, bucket = 'audio-files'): Promise<void> {
    console.log('[UploadService] deleteFile start', { path, bucket });
    try {
      await removeFromStorage(path, bucket);
      console.log('[UploadService] deleteFile success');
    } catch (err) {
      console.error('[UploadService] deleteFile error:', err);
      throw new Error('Failed to delete file');
    }
  }
}

export const uploadService = new UploadService();
