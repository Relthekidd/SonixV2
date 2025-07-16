import { useState } from 'react';
import { Alert } from 'react-native';
import { uploadService, SingleUploadData, AlbumUploadData, UploadPermissions } from '@/services/uploadService';

interface UseUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadSingle: (data: SingleUploadData) => Promise<any>;
  uploadAlbum: (data: AlbumUploadData) => Promise<any>;
  checkPermissions: () => Promise<boolean>;
  getUploadPermissions: () => Promise<UploadPermissions>;
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadSingle = async (data: SingleUploadData) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Check permissions first
      const permissions = await uploadService.checkUploadPermissions();
      
      // Simulate progress updates
      setUploadProgress(25);
      
      const result = await uploadService.uploadSingle(data);
      
      setUploadProgress(100);
      
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadAlbum = async (data: AlbumUploadData) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Check permissions first
      const permissions = await uploadService.checkUploadPermissions();
      
      // Simulate progress updates
      setUploadProgress(25);
      
      const result = await uploadService.uploadAlbum(data);
      
      setUploadProgress(100);
      
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const permissions = await uploadService.checkUploadPermissions();
      // Return true if user is authenticated (has userId)
      return !!permissions.userId;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  const getUploadPermissions = async (): Promise<UploadPermissions> => {
    return await uploadService.checkUploadPermissions();
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