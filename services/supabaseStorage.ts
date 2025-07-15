// services/supabaseStorage.ts

import { supabase } from '@/providers/AuthProvider';

export async function uploadImage(
  file: { uri: string },
  fileName: string
): Promise<{ url: string; path: string }> {
  // 1. Fetch the file as a Blob
  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image blob: ${response.status}`);
  }
  const blob = await response.blob();

  // 2. Build a storage path
  const path = `covers/${Date.now()}_${fileName}`;

  // 3. Upload to the 'images' bucket
  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });
  if (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }

  // 4. Generate a public URL (no error returned by getPublicUrl)
  const { data: publicData } = supabase.storage
    .from('images')
    .getPublicUrl(path);
  if (!publicData || !publicData.publicUrl) {
    throw new Error('Failed to retrieve public URL for image');
  }

  return { url: publicData.publicUrl, path: data.path };
}

export async function uploadAudio(
  file: { uri: string },
  fileName: string
): Promise<{ url: string; path: string }> {
  // 1. Fetch the file as a Blob
  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio blob: ${response.status}`);
  }
  const blob = await response.blob();

  // 2. Build a storage path
  const path = `audio/${Date.now()}_${fileName}`;

  // 3. Upload to the 'audio' bucket
  const { data, error } = await supabase.storage
    .from('audio')
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });
  if (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }

  // 4. Generate a public URL
  const { data: publicData } = supabase.storage
    .from('audio')
    .getPublicUrl(path);
  if (!publicData || !publicData.publicUrl) {
    throw new Error('Failed to retrieve public URL for audio');
  }

  return { url: publicData.publicUrl, path: data.path };
}

export async function deleteFile(
  path: string,
  bucket: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error) {
    console.error('Supabase delete file error:', error);
    throw error;
  }
}
