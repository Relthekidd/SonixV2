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
    console.log('🧠 Full singleData:', singleData);
    console.log('🧠 MainArtistId:', singleData.mainArtistId);

    // Step 0: Validate artist existence (debugging FK errors)
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', singleData.mainArtistId);

    if (artistError) {
      console.error('❌ Error fetching artist:', artistError);
    } else {
      console.log('✅ Artist exists:', artistData.length > 0);
    }

    // Step 1: Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error('Failed to get authentication session');
    }

    if (!session?.user) {
      throw new Error('Not authenticated - please log in again');
    }

    // Check if uploader is an admin so we can auto publish
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    const isAdmin = userRecord?.role === 'admin';

    console.log('🎵 Uploading single with Supabase Storage...');

    // Step 2: Upload audio file
    const audioFileName = singleData.audioFile.name || `${singleData.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
    const audioUpload = await supabaseStorage.uploadAudio(singleData.audioFile, audioFileName);
    console.log('🎧 Audio uploaded:', audioUpload.url);

    // Step 3: Upload cover (optional)
    let coverUpload = null;
    if (singleData.coverFile) {
      const coverFileName =
        singleData.coverFile.fileName || singleData.coverFile.name ||
        `${singleData.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.jpg`;
      coverUpload = await supabaseStorage.uploadImage(singleData.coverFile, coverFileName);
      console.log('🖼️ Cover uploaded:', coverUpload.url);
    }

    // Step 4: Create track in DB
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
      // Auto publish if the uploader is an admin
      is_published: isAdmin,
      track_number: 1,
      created_by: session.user.id,
      featured_artist_ids: singleData.featuredArtistIds,
    };

    console.log('📤 Inserting track data:', trackData);

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert(trackData)
      .select()
      .single();

    if (trackError) {
      console.error('❌ Track insert error:', trackError);
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

      // Determine if uploader is an admin for auto publishing
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      const isAdmin = userRecord?.role === 'admin';

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
        // Auto publish if the uploader is an admin
        is_published: isAdmin,
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
            // Auto publish track if the uploader is an admin
            is_published: isAdmin,
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
   * Publish a track that's currently in draft/pending state
   */
  async publishTrack(trackId: string): Promise<any> {
    try {
      console.log('📤 Publishing track:', trackId);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      // Check if user has permission to publish (admin or track owner)
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('created_by, title')
        .eq('id', trackId)
        .single();

      if (trackError) {
        throw new Error('Track not found');
      }

      // Check if user is admin or owns the track
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!user || (user.role !== 'admin' && track.created_by !== session.user.id)) {
        throw new Error('You do not have permission to publish this track');
      }

      // Update track to published status
      const { data: updatedTrack, error: updateError } = await supabase
        .from('tracks')
        .update({ is_published: true })
        .eq('id', trackId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to publish track: ${updateError.message}`);
      }

      console.log('✅ Track published successfully:', updatedTrack.title);
      return updatedTrack;

    } catch (error) {
      console.error('❌ Track publishing failed:', error);
      throw error;
    }
  }

  /**
   * Unpublish a track (set back to draft)
   */
  async unpublishTrack(trackId: string): Promise<any> {
    try {
      console.log('📥 Unpublishing track:', trackId);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      // Check if user has permission (admin only for unpublishing)
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!user || user.role !== 'admin') {
        throw new Error('Only administrators can unpublish tracks');
      }

      // Update track to unpublished status
      const { data: updatedTrack, error: updateError } = await supabase
        .from('tracks')
        .update({ is_published: false })
        .eq('id', trackId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to unpublish track: ${updateError.message}`);
      }

      console.log('✅ Track unpublished successfully:', updatedTrack.title);
      return updatedTrack;

    } catch (error) {
      console.error('❌ Track unpublishing failed:', error);
      throw error;
    }
  }

  /**
   * Delete a track completely (both from database and storage)
   */
  async deleteTrack(trackId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting track:', trackId);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated - please log in again');
      }

      // Fetch track info first to get file paths
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('audio_url, cover_url, title, created_by')
        .eq('id', trackId)
        .single();

      if (trackError || !track) {
        console.error('Track not found or error fetching track:', trackError);
        throw new Error('Track not found');
      }

      // Check if user has permission to delete (admin or track owner)
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!user || (user.role !== 'admin' && track.created_by !== session.user.id)) {
        throw new Error('You do not have permission to delete this track');
      }

      // Extract file paths from URLs
      const audioPath = this.extractPathFromUrl(track.audio_url);
      const coverPath = track.cover_url ? this.extractPathFromUrl(track.cover_url) : null;

      // Delete files from storage
      if (audioPath) {
        try {
          await supabaseStorage.deleteFile('audio-files', audioPath);
          console.log('✅ Audio file deleted:', audioPath);
        } catch (error) {
          console.error('Error deleting audio file:', error);
          // Continue with deletion even if file deletion fails
        }
      }

      if (coverPath) {
        try {
          await supabaseStorage.deleteFile('images', coverPath);
          console.log('✅ Cover file deleted:', coverPath);
        } catch (error) {
          console.error('Error deleting cover file:', error);
          // Continue with deletion even if file deletion fails
        }
      }

      // Delete track record from database
      const { error: deleteError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (deleteError) {
        console.error('Failed to delete track record:', deleteError);
        throw new Error('Failed to delete track record');
      }

      console.log('✅ Track deleted successfully:', track.title);

    } catch (error) {
      console.error('❌ Track deletion failed:', error);
      throw error;
    }
  }

  /**
   * Helper function to extract the path from a Supabase storage URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      // Supabase URLs look like: https://xyz.supabase.co/storage/v1/object/public/bucket_name/path/to/file.ext
      const publicIndex = parts.indexOf('public');
      if (publicIndex === -1) return null;
      // Skip 'public' and bucket_name segments to get the actual file path
      return parts.slice(publicIndex + 2).join('/');
    } catch {
      return null;
    }
  }
}
  /**
   * Check if a track should be automatically published based on release date
   */
 isReadyForRelease(releaseDate); {
  const now = new Date();
  const release = new Date(releaseDate);
  return release <= now;
}

  /**
   * Initialize storage buckets on app start
   */
  async initializeStorage(): Promise<void> {
    await supabaseStorage.initializeBuckets();
  }
}

export const uploadService = new UploadService();
