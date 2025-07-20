import React, { useState, useEffect } from 'react';

export const unstable_settings = { href: null };
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { uploadService, SingleUploadData, AlbumUploadData } from '@/services/uploadService';
import { ArtistData } from '@/services/artistService';
import { ArtistAutocomplete } from '@/components/ArtistAutocomplete';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface Track {
  id: string;
  title: string;
  audioFile: any;
  lyrics: string;
  explicit: boolean;
  duration: number;
  description?: string;
  featuredArtists: ArtistData[];
}

interface UploadFormData {
  type: 'single' | 'album';
  title: string;
  mainArtist: ArtistData | null;
  featuredArtists: ArtistData[];
  releaseDate: string;
  coverFile: any;
  genres: string[];
  explicit: boolean;
  description: string;
  tracks: Track[];
}

const GENRES = [
  'Hip-Hop','R&B','Pop','Rock','Electronic','Jazz','Classical',
  'Country','Reggae','Blues','Folk','Indie','Alternative','Funk'
];

export default function AdminUploadScreen() {
  const { user, userId, hasUser, isLoading: authLoading } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<UploadFormData>({
    type: 'single',
    title: '',
    mainArtist: null,
    featuredArtists: [],
    releaseDate: new Date().toISOString().split('T')[0],
    coverFile: null,
    genres: [],
    explicit: false,
    description: '',
    tracks: [{
      id: '1', title: '', audioFile: null,
      lyrics: '', explicit: false,
      duration: 0, description: '', featuredArtists: []
    }],
  });

  useEffect(() => {
    console.log('[AdminUpload] initializing storage');
    uploadService.initializeStorage();
  }, []);

  const pickCoverImage = async () => {
    console.log('[AdminUpload] pickCoverImage start');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.8,
      });
      console.log('[AdminUpload] pickCoverImage result', res);
      if (!res.canceled && res.assets?.[0]) {
        setFormData(prev => ({ ...prev, coverFile: res.assets[0] }));
      }
    } catch (err) {
      console.error('[AdminUpload] pickCoverImage error', err);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const pickAudioFile = async (index: number) => {
    console.log('[AdminUpload] pickAudioFile start for track', index);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      console.log('[AdminUpload] pickAudioFile result', res);
      if (!res.canceled && res.assets?.[0]) {
        const tracks = [...formData.tracks];
        tracks[index].audioFile = res.assets[0];
        setFormData(prev => ({ ...prev, tracks }));
      }
    } catch (err) {
      console.error('[AdminUpload] pickAudioFile error', err);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const updateTrack = (index: number, field: keyof Track, value: any) => {
    console.log('[AdminUpload] updateTrack', index, field, value);
    const tracks = [...formData.tracks];
    (tracks[index] as any)[field] = value;
    setFormData(prev => ({ ...prev, tracks }));
  };

  const addTrack = () => {
    console.log('[AdminUpload] addTrack');
    setFormData(prev => ({
      ...prev,
      type: 'album',
      tracks: [
        ...prev.tracks,
        { id: Date.now().toString(), title: '', audioFile: null, lyrics: '', explicit: false, duration: 0, description: '', featuredArtists: [] }
      ]
    }));
  };

  const removeTrack = (index: number) => {
    console.log('[AdminUpload] removeTrack', index);
    const tracks = formData.tracks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, tracks }));
  };

  const toggleGenre = (genre: string) => {
    console.log('[AdminUpload] toggleGenre', genre);
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const validateForm = (): boolean => {
    console.log('[AdminUpload] validateForm', formData);
    if (!formData.title.trim()) { Alert.alert('Error','Title is required'); return false; }
    if (!formData.mainArtist) { Alert.alert('Error','Main artist is required'); return false; }
    if (!formData.genres.length) { Alert.alert('Error','At least one genre is required'); return false; }
    for (let i = 0; i < formData.tracks.length; i++) {
      const t = formData.tracks[i];
      if (!t.title.trim())    { Alert.alert('Error', `Track ${i+1} title is required`); return false; }
      if (!t.audioFile)       { Alert.alert('Error', `Track ${i+1} audio is required`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    console.log('[AdminUpload] handleSubmit start', { userId, hasUser, authLoading });
    if (authLoading) {
      console.log('[AdminUpload] auth still loading');
      return Alert.alert('Hold up','Still loading your account info.');
    }
    if (!hasUser || !userId) {
      console.warn('[AdminUpload] no user/session');
      return Alert.alert('Error','User session not ready');
    }
    if (!validateForm()) return;

    setIsUploading(true);
    try {
      if (formData.type === 'single') {
        const t = formData.tracks[0];
        console.log('[AdminUpload] uploading single', t, formData);
        await uploadService.uploadSingle({
          title: formData.title.trim(),
          lyrics: t.lyrics,
          duration: t.duration,
          genres: formData.genres,
          explicit: formData.explicit,
          coverFile: formData.coverFile,
          audioFile: t.audioFile,
          description: formData.description,
          releaseDate: formData.releaseDate,
          artistId: userId,
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
        } as SingleUploadData);
      } else {
        console.log('[AdminUpload] uploading album', formData);
        await uploadService.uploadAlbum({
          title: formData.title.trim(),
          description: formData.description,
          releaseDate: formData.releaseDate,
          coverFile: formData.coverFile,
          genres: formData.genres,
          explicit: formData.explicit,
          artistId: userId,
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
          tracks: formData.tracks.map((t, idx) => ({
            title: t.title.trim(),
            lyrics: t.lyrics,
            duration: t.duration,
            explicit: t.explicit,
            trackNumber: idx+1,
            featuredArtistIds: t.featuredArtists.map(a => a.id),
            audioFile: t.audioFile,
          })),
        } as AlbumUploadData);
      }
      console.log('[AdminUpload] uploadService success');
      Alert.alert('Success','Upload complete', [{ text: 'View uploads', onPress: () => router.push('/admin/uploads') }]);
    } catch (err) {
      console.error('[AdminUpload] handleSubmit error', err);
      Alert.alert('Error', (err as Error).message || 'Upload failed');
    } finally {
      setIsUploading(false);
      console.log('[AdminUpload] handleSubmit end, isUploading=false');
    }
  };

  if (authLoading) {
    console.log('[AdminUpload] auth loading screen');
    return (
      <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading your account...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!hasUser || user?.role !== 'admin') {
    console.log('[AdminUpload] access denied', { hasUser, role: user?.role });
    return (
      <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.error}>Access denied. Admin privileges required.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Music</Text>
        <TouchableOpacity onPress={() => router.push('/admin/uploads')} style={styles.viewBtn}>
          <Text style={styles.viewText}>View Uploads</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        ...
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  error: { color:'#ef4444', fontSize:18, textAlign:'center', paddingHorizontal:20 },
  loadingText: { color:'#fff', marginTop:16, fontSize:16 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:48, paddingBottom:16 },
  backBtn:{ padding:8 },
  headerTitle:{ fontSize:20, color:'#fff' },
  viewBtn:{ padding:8 },
  viewText:{ color:'#8b5cf6' },
  content:{ padding:16 },
  // ... other styles unchanged
});
