// Use the shared Supabase client from the AuthProvider so uploads are
// authenticated with the current user session.
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

/**
 * Upload a file to Supabase Storage and return its public URL
 */
async function uploadFile(
  file: { uri: string; name?: string; type?: string },
  path: string,
  bucket: string = 'audio-files',
): Promise<{ url: string }> {
  // Fetch the file URI as a blob (React Native)
  const info = await FileSystem.getInfoAsync(file.uri);
  console.log('[supabaseStorage] local file size', (info as any).size ?? 'unknown');
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: file.type });
  console.log('[supabaseStorage] blob size', blob.size);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Retrieve public URL (no error returned)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) {
    throw new Error(`Failed to get public URL for path: ${path}`);
  }

  return { url: publicUrl };
}

/**
 * Upload an audio file to the default audio bucket
 */
export async function uploadAudio(
  file: { uri: string; name?: string; type?: string },
  path: string,
): Promise<{ url: string }> {
  return uploadFile(file, path, 'audio-files');
}

/**
 * Upload an image file to the default images bucket
 */
export async function uploadImage(
  file: { uri: string; name?: string; type?: string },
  path: string,
): Promise<{ url: string }> {
  return uploadFile(file, path, 'images');
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  bucket: string = 'audio-files',
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/** Convenience object for easier imports */
export const supabaseStorage = {
  uploadAudio,
  uploadImage,
  deleteFile,
};
