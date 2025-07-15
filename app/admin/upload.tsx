import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { uploadService, SingleUploadData, AlbumUploadData } from '@/services/uploadService';
import { ArtistData } from '@/services/artistService';
import { ArtistAutocomplete } from '@/components/ArtistAutocomplete';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Upload, Music, Image as ImageIcon, Plus, X, Check, ArrowUp, ArrowDown, ArrowLeft, User } from 'lucide-react-native';

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

interface Track {
  id: string;
  title: string;
  audioFile: any;
  lyrics: string;
  explicit: boolean;
  trackNumber: number;
  featuredArtists: ArtistData[];
  duration: number;
}

const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Blues', 'Folk', 'Indie', 'Alternative', 'Funk'
];

export default function AdminUploadScreen() {
  const { user } = useAuth();
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
      id: '1',
      title: '',
      audioFile: null,
      lyrics: '',
      explicit: false,
      trackNumber: 1,
      featuredArtists: [],
      duration: 0,
    }],
  });

  useEffect(() => {
    // Initialize storage on component mount
    uploadService.initializeStorage();
  }, []);

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, coverFile: result.assets[0] }));
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const pickAudioFile = async (trackIndex: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const updatedTracks = [...formData.tracks];
        updatedTracks[trackIndex].audioFile = result.assets[0];
        setFormData(prev => ({ ...prev, tracks: updatedTracks }));
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const addTrack = () => {
    const newTrack: Track = {
      id: Date.now().toString(),
      title: '',
      audioFile: null,
      lyrics: '',
      explicit: false,
      trackNumber: formData.tracks.length + 1,
      featuredArtists: [],
      duration: 0,
    };
    setFormData(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
  };

  const removeTrack = (trackIndex: number) => {
    if (formData.tracks.length > 1) {
      const updatedTracks = formData.tracks.filter((_, index) => index !== trackIndex);
      const renumbered = updatedTracks.map((t, i) => ({ ...t, trackNumber: i + 1 }));
      setFormData(prev => ({ ...prev, tracks: renumbered }));
    }
  };

  const moveTrack = (idx: number, dir: 'up' | 'down') => {
    const tracks = [...formData.tracks];
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= tracks.length) return;
    [tracks[idx], tracks[newIdx]] = [tracks[newIdx], tracks[idx]];
    setFormData(prev => ({ ...prev, tracks: tracks.map((t, i) => ({ ...t, trackNumber: i + 1 })) }));
  };

  const updateTrack = (idx: number, field: keyof Track, value: any) => {
    const tracks = [...formData.tracks];
    tracks[idx] = { ...tracks[idx], [field]: value };
    setFormData(prev => ({ ...prev, tracks }));
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const addFeaturedArtist = (artist: ArtistData) => {
    setFormData(prev => ({
      ...prev,
      featuredArtists: prev.featuredArtists.some(a => a.id === artist.id)
        ? prev.featuredArtists
        : [...prev.featuredArtists, artist]
    }));
  };

  const removeFeaturedArtist = (id: string) => {
    setFormData(prev => ({
      ...prev,
      featuredArtists: prev.featuredArtists.filter(a => a.id !== id)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return false;
    }
    if (!formData.mainArtist) {
      Alert.alert('Error', 'Main artist is required');
      return false;
    }
    if (!formData.genres.length) {
      Alert.alert('Error', 'At least one genre is required');
      return false;
    }
    for (let i = 0; i < formData.tracks.length; i++) {
      const t = formData.tracks[i];
      if (!t.title.trim()) {
        Alert.alert('Error', `Track ${i + 1} title is required`);
        return false;
      }
      if (!t.audioFile) {
        Alert.alert('Error', `Track ${i + 1} audio file is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsUploading(true);

    try {
      console.log('🚀 Starting upload...');
      if (formData.type === 'single') {
        const t = formData.tracks[0];
        const payload: SingleUploadData = {
          title: formData.title.trim(),
          lyrics: t.lyrics,
          duration: t.duration,
          genres: formData.genres,
          explicit: formData.explicit,
          coverFile: formData.coverFile,
          audioFile: t.audioFile,
          description: formData.description,
          releaseDate: formData.releaseDate,
          artistId: user?.id || '',
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
        };
        await uploadService.uploadSingle(payload);
      } else {
        const albumPayload: AlbumUploadData = {
          title: formData.title.trim(),
          description: formData.description,
          releaseDate: formData.releaseDate,
          coverFile: formData.coverFile,
          genres: formData.genres,
          explicit: formData.explicit,
          artistId: user?.id || '',
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
          tracks: formData.tracks.map(t => ({
            title: t.title.trim(),
            lyrics: t.lyrics,
            duration: t.duration,
            explicit: t.explicit,
            trackNumber: t.trackNumber,
            featuredArtistIds: t.featuredArtists.map(a => a.id),
            audioFile: t.audioFile,
          }))
        };
        await uploadService.uploadAlbum(albumPayload);
      }

      Alert.alert('Success', `${formData.type === 'single' ? 'Single' : 'Album'} uploaded!`, [
        { text: 'View', onPress: () => router.push('/admin/uploads') }
      ]);
      // reset
      setFormData({
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
          id: '1',
          title: '',
          audioFile: null,
          lyrics: '',
          explicit: false,
          trackNumber: 1,
          featuredArtists: [],
          duration: 0,
        }],
      });
    } catch (err) {
      console.error('❌ Upload failed:', err);
      Alert.alert('Error', (err as Error).message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ——— HERE’S THE FIXED CHECK ———
  if ((user?.role as string) !== 'admin') {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. Admin only.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Music</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Track or album title"
            placeholderTextColor="#64748b"
            value={formData.title}
            onChangeText={t => setFormData(prev => ({ ...prev, title: t }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Main Artist</Text>
          <ArtistAutocomplete
            onArtistSelect={artist => setFormData(prev => ({ ...prev, mainArtist: artist }))}
            initialValue={formData.mainArtist?.name || ''}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Cover Image</Text>
          <TouchableOpacity style={styles.fileButton} onPress={pickCoverImage}>
            <Text style={styles.fileButtonText}>{formData.coverFile ? 'Change Cover' : 'Select Cover'}</Text>
          </TouchableOpacity>
        </View>

        {formData.tracks.map((track, idx) => (
          <View key={track.id} style={styles.trackSection}>
            <Text style={styles.label}>Track {idx + 1} Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Track title"
              placeholderTextColor="#64748b"
              value={track.title}
              onChangeText={t => updateTrack(idx, 'title', t)}
            />
            <TouchableOpacity style={styles.fileButton} onPress={() => pickAudioFile(idx)}>
              <Text style={styles.fileButtonText}>{track.audioFile ? 'Change Audio' : 'Select Audio'}</Text>
            </TouchableOpacity>
            {formData.tracks.length > 1 && (
              <TouchableOpacity onPress={() => removeTrack(idx)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remove Track</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addTrackButton} onPress={addTrack}>
          <Text style={styles.addTrackButtonText}>Add Track</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Upload</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#fff' },
  uploadsButton: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  uploadsButtonText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#8b5cf6' },
  scrollView: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#ef4444', textAlign: 'center' },
  content: { padding: 20 },
  section: { marginBottom: 20 },
  label: { color: '#fff', marginBottom: 6, fontFamily: 'Inter-SemiBold' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: '#fff',
    fontFamily: 'Inter-Regular',
  },
  fileButton: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  fileButtonText: { color: '#8b5cf6', fontFamily: 'Inter-SemiBold' },
  trackSection: { marginBottom: 20 },
  removeButton: { marginTop: 8, alignSelf: 'flex-end' },
  removeButtonText: { color: '#ef4444' },
  addTrackButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addTrackButtonText: { color: '#fff', fontFamily: 'Inter-SemiBold' },
  submitButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
