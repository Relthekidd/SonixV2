import { supabase } from '@/providers/AuthProvider';

export interface UploadResult {
  url: string;
  path: string;
}

class SupabaseStorageService {
  private readonly AUDIO_BUCKET = 'audio-files';
  private readonly IMAGE_BUCKET = 'images';

  /**
   * Upload audio file to Supabase Storage
   */
  async uploadAudio(file: File | any, fileName: string): Promise<UploadResult> {
    try {
      console.log('📁 Uploading audio file to Supabase Storage:', fileName);

      // Create a unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tracks/${timestamp}_${sanitizedFileName}`;

      // Convert file for upload
      const fileToUpload = await this.prepareFileForUpload(file, fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.AUDIO_BUCKET)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Audio upload error:', error);
        throw new Error(`Audio upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.AUDIO_BUCKET)
        .getPublicUrl(data.path);

      console.log('✅ Audio uploaded successfully:', urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload image file to Supabase Storage
   */
  async uploadImage(file: File | any, fileName: string): Promise<UploadResult> {
    try {
      console.log('🖼️ Uploading image file to Supabase Storage:', fileName);

      // Create a unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `covers/${timestamp}_${sanitizedFileName}`;

      // Convert file for upload
      const fileToUpload = await this.prepareFileForUpload(file, fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.IMAGE_BUCKET)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Image upload error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.IMAGE_BUCKET)
        .getPublicUrl(data.path);

      console.log('✅ Image uploaded successfully:', urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('❌ File deletion error:', error);
        throw new Error(`File deletion failed: ${error.message}`);
      }

      console.log('✅ File deleted successfully:', filePath);
    } catch (error) {
      console.error('❌ File deletion failed:', error);
      throw error;
    }
  }

  /**
   * Prepare file for upload (handle both web File objects and React Native file objects)
   */
  private async prepareFileForUpload(file: any, fileName: string): Promise<File | Blob> {
    if (typeof window !== 'undefined' && file instanceof File) {
      // Web environment - file is already a File object
      return file;
    } else if (file.uri) {
      // React Native environment - convert URI to blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File-like object for Supabase
      return new File([blob], fileName, { 
        type: file.mimeType || file.type || 'application/octet-stream' 
      });
    } else {
      throw new Error('Invalid file format for upload');
    }
  }

  /**
   * Get file URL from storage
   */
  getPublicUrl(bucket: string, filePath: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Check if storage buckets exist and create them if needed
   */
  async initializeBuckets(): Promise<void> {
    try {
      console.log('ℹ️ Storage buckets should be created manually in the Supabase dashboard');
      console.log(`ℹ️ Required buckets: ${this.AUDIO_BUCKET}, ${this.IMAGE_BUCKET}`);
    } catch (error) {
      console.error('❌ Error checking storage configuration:', error);
    }
  }
}

export const supabaseStorage = new SupabaseStorageService();