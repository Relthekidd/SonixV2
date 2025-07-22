import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/services/supabase';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import mime from 'mime';

export const uploadToSupabase = async (
  fileUri: string,
  path: string,
  bucket: string,
): Promise<string | null> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer], {
      type: mime.getType(fileUri) || 'application/octet-stream',
    });
    const contentType = blob.type;

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
