// services/supabaseStorage.ts

import { supabase } from '@/providers/AuthProvider';

export async function uploadImage(
  file: { uri: string },
  fileName: string
): Promise<{ url: string; path: string }> {
  // 1. fetch the file at the given local URI
  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image blob: ${response.status}`);
  }

  // 2. convert to a Blob so supabase can consume it
  const blob = await response.blob();

  // 3. build a path under the 'images' bucket
  //    e.g. 'covers/abcd1234_my_pic.jpg'
  const path = `covers/${Date.now()}_${fileName}`;

  // 4. actually upload with explicit contentType
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

  // 5. generate a public URL for the newly uploaded file
  const { publicUrl, error: urlError } = supabase.storage
    .from('images')
    .getPublicUrl(data.path);

  if (urlError) {
    console.error('Supabase publicUrl error:', urlError);
    throw urlError;
  }

  return { url: publicUrl, path: data.path };
}
