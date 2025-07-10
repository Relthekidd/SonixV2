import { supabase } from '@/providers/AuthProvider';
import { supabaseStorage } from './supabaseStorage';

export interface SingleUploadData {
  title: string;
  lyrics?: string;
  duration?: number;
  genres: string[];
  explicit: boolean;
  coverFile?: any;
  audioFile: any;
  description?: string;
  releaseDate?: string;
  price?: string;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
}

export interface AlbumUploadData {
  title: string;
  description?: string;
  releaseDate?: string;
  coverFile?: any;
  genres: string[];
  explicit: boolean;
  artistId: string;
  mainArtistId: string;
  featuredArtistIds: string[];
  tracks: Array<{
    title: string;
    audioFile: any;
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
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      console.log('🎵 Uploading single with Supabase Storage...');

      // Step 1: Upload audio file to Supabase Storage
      const audioFileName = singleData.audioFile.name || `${singleData.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      const audioUpload = await supabaseStorage.uploadAudio(singleData.audioFile, audioFileName);

      // Step 2: Upload cover image if provided
      let coverUpload = null;
      if (singleData.coverFile) {
        const coverFileName = singleData.coverFile.fileName || singleData.coverFile.name || `${singleData.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.jpg`;
        coverUpload = await supabaseStorage.uploadImage(singleData.coverFile, coverFileName);
      }

      // Step 3: Create track record in database
      const trackData = {
        title: singleData.title,
        artist_id: singleData.mainArtistId,
        audio_url: audioUpload.url,
        cover_url: coverUpload?.url || null,
        lyrics: singleData.lyrics || '',
        duration: singleData.duration || 180,
        genres: singleData.genres,
        explicit: singleData.explicit,
        description: singleData.description || '',
        release_date: singleData.releaseDate || new Date().toISOString().split('T')[0],
        price: parseFloat(singleData.price || '0'),
        is_published: false, // Admin approval required
        track_number: 1,
        created_by: session.user.id,
        featured_artist_ids: singleData.featuredArtistIds,
      };

      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert(trackData)
        .select()
        .single();

      if (trackError) {
        // Clean up uploaded files if database insert fails
        await this.cleanupFiles(audioUpload.path, coverUpload?.path);
        throw new Error(`Database error: ${trackError.message}`);
      }

      console.log('✅ Single upload successful:', track);
      return track;

    } catch (error) {
      console.error('❌ Single upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload an album with multiple tracks
   */
  async uploadAlbum(albumData: AlbumUploadData): Promise<any> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      console.log('💿 Uploading album with Supabase Storage...');

      // Step 1: Upload album cover if provided
      let albumCoverUpload = null;
      if (albumData.coverFile) {
        const coverFileName = albumData.coverFile.fileName || albumData.coverFile.name || `${albumData.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.jpg`;
        albumCoverUpload = await supabaseStorage.uploadImage(albumData.coverFile, coverFileName);
      }

      // Step 2: Create album record
      const albumRecord = {
        title: albumData.title,
        artist_id: albumData.mainArtistId,
        cover_url: albumCoverUpload?.url || null,
        description: albumData.description || '',
        release_date: albumData.releaseDate || new Date().toISOString().split('T')[0],
        genres: albumData.genres,
        explicit: albumData.explicit,
        track_count: albumData.tracks.length,
        is_published: false, // Admin approval required
        created_by: session.user.id,
        featured_artist_ids: albumData.featuredArtistIds,
      };

      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert(albumRecord)
        .select()
        .single();

      if (albumError) {
        // Clean up uploaded cover if album creation fails
        if (albumCoverUpload) {
          await this.cleanupFiles(null, albumCoverUpload.path);
        }
        throw new Error(`Album creation failed: ${albumError.message}`);
      }

      // Step 3: Upload tracks
      const uploadedTracks = [];
      const uploadedFiles: string[] = [];

      try {
        for (let i = 0; i < albumData.tracks.length; i++) {
          const track = albumData.tracks[i];
          
          // Upload audio file
          const audioFileName = track.audioFile.name || `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
          const audioUpload = await supabaseStorage.uploadAudio(track.audioFile, audioFileName);
          uploadedFiles.push(audioUpload.path);

          // Create track record
          const trackData = {
            title: track.title,
            artist_id: albumData.mainArtistId,
            album_id: album.id,
            audio_url: audioUpload.url,
            cover_url: album.cover_url, // Use album cover for tracks
            lyrics: track.lyrics || '',
            duration: track.duration || 180,
            genres: albumData.genres,
            explicit: track.explicit,
            track_number: track.trackNumber,
            is_published: false, // Admin approval required
            created_by: session.user.id,
            featured_artist_ids: track.featuredArtistIds,
          };

          const { data: trackRecord, error: trackError } = await supabase
            .from('tracks')
            .insert(trackData)
            .select()
            .single();

          if (trackError) {
            throw new Error(`Track ${i + 1} creation failed: ${trackError.message}`);
          }

          uploadedTracks.push(trackRecord);
        }

        console.log('✅ Album upload successful:', album);
        return { album, tracks: uploadedTracks };

      } catch (error) {
        // Clean up all uploaded files if any track fails
        await this.cleanupFiles(...uploadedFiles, albumCoverUpload?.path);
        
        // Also delete the album record
        await supabase.from('albums').delete().eq('id', album.id);
        
        throw error;
      }

    } catch (error) {
      console.error('❌ Album upload failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has upload permissions
   */
  async checkUploadPermissions(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return false;
      }

      // Check if user has admin role or is a verified artist
      const { data: user, error } = await supabase
        .from('users')
        .select('role, artist_verified')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking user permissions:', error);
        return false;
      }

      // Allow admins and verified artists to upload
      return user.role === 'admin' || (user.role === 'artist' && user.artist_verified);

    } catch (error) {
      console.error('Error checking upload permissions:', error);
      return false;
    }
  }

  /**
   * Clean up uploaded files in case of errors
   */
  private async cleanupFiles(...filePaths: (string | null | undefined)[]): Promise<void> {
    for (const filePath of filePaths) {
      if (filePath) {
        try {
          // Determine bucket based on file path
          const bucket = filePath.includes('covers/') ? 'images' : 'audio-files';
          await supabaseStorage.deleteFile(bucket, filePath);
        } catch (error) {
          console.error('Error cleaning up file:', filePath, error);
        }
      }
    }
  }

  /**
   * Initialize storage buckets on app start
   */
  async initializeStorage(): Promise<void> {
    await supabaseStorage.initializeBuckets();
  }
}

export const uploadService = new UploadService();
