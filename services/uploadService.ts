import { supabase } from '@/providers/AuthProvider';
import { apiService } from './api';

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
  mainArtist: string;
  featuredArtists: string[];
}

export interface AlbumUploadData {
  title: string;
  description?: string;
  releaseDate?: string;
  coverFile?: any;
  genres: string[];
  explicit: boolean;
  artistId: string;
  mainArtist: string;
  featuredArtists: string[];
  tracks: Array<{
    title: string;
    audioFile: any;
    lyrics?: string;
    explicit: boolean;
    trackNumber: number;
    duration?: number;
    featuringArtists: string[];
  }>;
}

class UploadService {
  /**
   * Upload a single track using Supabase authentication
   */
  async uploadSingle(singleData: SingleUploadData): Promise<any> {
    try {
      // Get the current session and token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.access_token) {
        throw new Error('Not authenticated - please log in again');
      }

      console.log('🎵 Uploading single with Supabase auth...');

      // Create FormData for the upload
      const formData = new FormData();
      
      // Add REQUIRED fields first (these are what the backend expects)
      formData.append('title', singleData.title); // REQUIRED
      formData.append('created_by', singleData.artistId); // REQUIRED - who created it
      
      // Artist information (REQUIRED for proper attribution)
      formData.append('main_artist', singleData.mainArtist); // REQUIRED
      formData.append('featured_artists', JSON.stringify(singleData.featuredArtists || []));
      
      // Set artist_id to null since we're using main_artist name
      formData.append('artist_id', ''); // Empty string instead of 'null'
      
      // Add optional metadata with proper defaults to avoid undefined values
      formData.append('lyrics', singleData.lyrics || '');
      formData.append('duration', (singleData.duration || 180).toString());
      formData.append('genres', JSON.stringify(singleData.genres || []));
      formData.append('explicit', singleData.explicit ? 'true' : 'false');
      formData.append('description', singleData.description || '');
      formData.append('release_date', singleData.releaseDate || new Date().toISOString().split('T')[0]);
      formData.append('is_single', 'true'); // Mark as single
      formData.append('is_published', 'false'); // Default to unpublished
      formData.append('track_number', '1'); // Singles are track 1
      
      // Add price if provided
      if (singleData.price !== undefined && singleData.price !== '') {
        formData.append('price', singleData.price);
      } else {
        formData.append('price', '0');
      }

      // Add cover file if provided
      if (singleData.coverFile) {
        const coverFile = await this.createFileFromUri(
          singleData.coverFile.uri,
          singleData.coverFile.fileName || 'cover.jpg',
          singleData.coverFile.mimeType || 'image/jpeg'
        );
        formData.append('cover', coverFile as any);
      }

      // Add REQUIRED audio file
      const audioFile = await this.createFileFromUri(
        singleData.audioFile.uri,
        singleData.audioFile.name || 'audio.mp3',
        singleData.audioFile.mimeType || 'audio/mpeg'
      );
      formData.append('audio', audioFile as any); // REQUIRED

      // Set the auth token for the API service
      apiService.setAuthToken(session.access_token);

      // Upload using the API service
      const result = await apiService.createTrack(formData);
      
      console.log('✅ Single upload successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Single upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload an album with multiple tracks, maintaining track order
   */
  async uploadAlbum(albumData: AlbumUploadData): Promise<any> {
    try {
      // Get the current session and token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get authentication session');
      }
      
      if (!session?.access_token) {
        throw new Error('Not authenticated - please log in again');
      }

      console.log('💿 Uploading album with Supabase auth...');

      // Create FormData for the upload
      const formData = new FormData();
      
      // Add REQUIRED album metadata
      formData.append('type', 'album');
      formData.append('title', albumData.title); // REQUIRED
      formData.append('created_by', albumData.artistId); // REQUIRED - who created it
      
      // Artist information (REQUIRED for proper attribution)
      formData.append('main_artist', albumData.mainArtist); // REQUIRED
      formData.append('featured_artists', JSON.stringify(albumData.featuredArtists || []));
      
      // Set artist_id to null since we're using main_artist name
      formData.append('artist_id', ''); // Empty string instead of 'null'
      
      // Add optional album metadata with proper defaults
      formData.append('description', albumData.description || '');
      formData.append('release_date', albumData.releaseDate || new Date().toISOString().split('T')[0]);
      formData.append('genres', JSON.stringify(albumData.genres || []));
      formData.append('explicit', albumData.explicit ? 'true' : 'false');
      formData.append('track_count', albumData.tracks.length.toString());
      formData.append('is_published', 'false'); // Default to unpublished

      // Add cover file if provided
      if (albumData.coverFile) {
        const coverFile = await this.createFileFromUri(
          albumData.coverFile.uri,
          albumData.coverFile.fileName || 'cover.jpg',
          albumData.coverFile.mimeType || 'image/jpeg'
        );
        formData.append('cover', coverFile as any);
      }

      // Add tracks with proper ordering
      for (let i = 0; i < albumData.tracks.length; i++) {
        const track = albumData.tracks[i];
        
        // Add REQUIRED track metadata
        formData.append(`tracks[${i}][title]`, track.title); // REQUIRED
        formData.append(`tracks[${i}][track_number]`, track.trackNumber.toString()); // REQUIRED
        
        // Add optional track metadata with proper defaults
        formData.append(`tracks[${i}][lyrics]`, track.lyrics || '');
        formData.append(`tracks[${i}][explicit]`, track.explicit ? 'true' : 'false');
        formData.append(`tracks[${i}][duration]`, (track.duration || 180).toString());
        formData.append(`tracks[${i}][position]`, i.toString()); // Upload order position
        formData.append(`tracks[${i}][featuring_artists]`, JSON.stringify(track.featuringArtists || []));
        formData.append(`tracks[${i}][is_published]`, 'false'); // Default to unpublished

        // Add REQUIRED audio file for this track
        const audioFile = await this.createFileFromUri(
          track.audioFile.uri,
          track.audioFile.name || `track-${track.trackNumber}.mp3`,
          track.audioFile.mimeType || 'audio/mpeg'
        );
        formData.append(`tracks[${i}][audio]`, audioFile as any); // REQUIRED
      }

      // Set the auth token for the API service
      apiService.setAuthToken(session.access_token);

      // Upload using the API service
      const result = await apiService.createAlbum(formData);
      
      console.log('✅ Album upload successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Album upload failed:', error);
      throw error;
    }
  }

  /**
   * Create a File object from URI for web compatibility
   */
  private async createFileFromUri(uri: string, name: string, type: string): Promise<File | any> {
    try {
      if (typeof window !== 'undefined' && window.File) {
        // Web environment
        const response = await fetch(uri);
        const blob = await response.blob();
        return new File([blob], name, { type });
      } else {
        // React Native environment
        return { uri, name, type };
      }
    } catch (error) {
      console.error('Error creating file from URI:', error);
      throw new Error('Failed to process file for upload');
    }
  }

  /**
   * Check if user is authenticated and has upload permissions
   * Currently restricted to admin users only to match backend API restrictions
   */
  async checkUploadPermissions(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return false;
      }

      // Check if user has admin role - only admins can upload per backend restrictions
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking user permissions:', error);
        return false;
      }

      // Only allow admins to upload (matching backend API restrictions)
      return user.role === 'admin';

    } catch (error) {
      console.error('Error checking upload permissions:', error);
      return false;
    }
  }

  /**
   * Get upload progress (placeholder for future implementation)
   */
  onUploadProgress(callback: (progress: number) => void) {
    // This would be implemented with actual upload progress tracking
    // For now, it's a placeholder for future enhancement
  }
}

export const uploadService = new UploadService();