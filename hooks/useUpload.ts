import { useState } from 'react';
import { Alert } from 'react-native';
import { uploadService, SingleUploadData, AlbumUploadData, UploadPermissions } from '@/services/uploadService';

interface UseUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadSingle: (data: SingleUploadData) => Promise<string>;
  uploadAlbum: (
    data: AlbumUploadData,
  ) => Promise<{ albumId: string; trackIds: string[] }>;
  checkPermissions: () => Promise<boolean>;
  getUploadPermissions: () => Promise<UploadPermissions>;
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadSingle = async (data: SingleUploadData): Promise<string> => {
    console.log('[useUpload] uploadSingle start', data);
    try {
      setIsUploading(true);
      setUploadProgress(0);

      console.log('[useUpload] Checking upload permissions...');
      const permissions = await uploadService.checkUploadPermissions();
      console.log('[useUpload] Permissions result', permissions);

      console.log('[useUpload] Simulating progress 25%');
      setUploadProgress(25);

      const result = await uploadService.uploadSingle(data);
      console.log('[useUpload] uploadSingle success', result);

      setUploadProgress(100);
      console.log('[useUpload] uploadProgress set to 100');

      return result;
    } catch (error) {
      console.error('[useUpload] uploadSingle error', error);
      Alert.alert('Upload error', (error as Error).message);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      console.log('[useUpload] uploadSingle end, reset state');
    }
  };

  const uploadAlbum = async (
    data: AlbumUploadData,
  ): Promise<{ albumId: string; trackIds: string[] }> => {
    console.log('[useUpload] uploadAlbum start', data);
    try {
      setIsUploading(true);
      setUploadProgress(0);

      console.log('[useUpload] Checking upload permissions...');
      const permissions = await uploadService.checkUploadPermissions();
      console.log('[useUpload] Permissions result', permissions);

      console.log('[useUpload] Simulating progress 25%');
      setUploadProgress(25);

      const result = await uploadService.uploadAlbum(data);
      console.log('[useUpload] uploadAlbum success', result);

      setUploadProgress(100);
      console.log('[useUpload] uploadProgress set to 100');

      return result;
    } catch (error) {
      console.error('[useUpload] uploadAlbum error', error);
      Alert.alert('Upload error', (error as Error).message);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      console.log('[useUpload] uploadAlbum end, reset state');
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    console.log('[useUpload] checkPermissions start');
    try {
      const permissions = await uploadService.checkUploadPermissions();
      console.log('[useUpload] checkPermissions result', permissions);
      return !!permissions.userId;
    } catch (error) {
      console.error('[useUpload] checkPermissions error', error);
      return false;
    }
  };

  const getUploadPermissions = async (): Promise<UploadPermissions> => {
    console.log('[useUpload] getUploadPermissions');
    const permissions = await uploadService.checkUploadPermissions();
    console.log('[useUpload] getUploadPermissions result', permissions);
    return permissions;
  };

  return {
    isUploading,
    uploadProgress,
    uploadSingle,
    uploadAlbum,
    checkPermissions,
    getUploadPermissions,
  };
}
