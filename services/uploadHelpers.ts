import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/services/supabase';
import mime from 'mime';

export const uploadToSupabase = async (
  fileUri: string,
  path: string,
  bucket: string,
): Promise<string | null> => {
  try {
    const blob = await fetch(fileUri).then((res) => res.blob());
    const contentType = mime.getType(fileUri) || 'application/octet-stream';

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

    if (error) {
      console.error('Upload failed:', error);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data.publicUrl;
    console.log('✅ Upload success:', publicUrl);
    return publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
};

export const pickAndUploadImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (!result.canceled && result.assets && result.assets[0]) {
    const uri = result.assets[0].uri;
    const fileName = uri.split('/').pop();
    const uploadPath = `covers/${fileName}`;
    return uploadToSupabase(uri, uploadPath, 'images');
  }
  return null;
};

export const pickAndUploadAudio = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
  if (!result.canceled && result.assets && result.assets[0]) {
    const asset = result.assets[0];
    const uploadPath = `track/${asset.name}`;
    return uploadToSupabase(asset.uri, uploadPath, 'audio-files');
  }
  return null;
};
