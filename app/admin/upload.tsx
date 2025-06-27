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
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMusic } from '@/providers/MusicProvider';
import { uploadService, SingleUploadData, AlbumUploadData } from '@/services/uploadService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Upload, Music, Image as ImageIcon, Plus, X, Check, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react-native';

interface UploadFormData {
  type: 'single' | 'album';
  title: string;
  releaseDate: string;
  coverFile: any;
  genres: string[];
  moods: string[];
  explicit: boolean;
  isPublic: boolean;
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
  featuringArtists: string[];
  duration: number;
}

const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 
  'Country', 'Reggae', 'Blues', 'Folk', 'Indie', 'Alternative', 'Funk'
];

const MOODS = [
  'Chill', 'Hype', 'Emotional', 'Romantic', 'Energetic', 'Melancholic',
  'Uplifting', 'Dark', 'Peaceful', 'Aggressive', 'Nostalgic', 'Dreamy'
];

export default function AdminUploadScreen() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<UploadFormData>({
    type: 'single',
    title: '',
    releaseDate: new Date().toISOString().split('T')[0],
    coverFile: null,
    genres: [],
    moods: [],
    explicit: false,
    isPublic: true,
    description: '',
    tracks: [{
      id: '1',
      title: '',
      audioFile: null,
      lyrics: '',
      explicit: false,
      trackNumber: 1,
      featuringArtists: [],
      duration: 0,
    }],
  });

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
      featuringArtists: [],
      duration: 0,
    };
    setFormData(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
  };

  const removeTrack = (trackIndex: number) => {
    if (formData.tracks.length > 1) {
      const updatedTracks = formData.tracks.filter((_, index) => index !== trackIndex);
      // Renumber tracks to maintain proper order
      const renumberedTracks = updatedTracks.map((track, index) => ({
        ...track,
        trackNumber: index + 1
      }));
      setFormData(prev => ({ ...prev, tracks: renumberedTracks }));
    }
  };

  const moveTrack = (trackIndex: number, direction: 'up' | 'down') => {
    const tracks = [...formData.tracks];
    const newIndex = direction === 'up' ? trackIndex - 1 : trackIndex + 1;
    
    if (newIndex >= 0 && newIndex < tracks.length) {
      // Swap tracks
      [tracks[trackIndex], tracks[newIndex]] = [tracks[newIndex], tracks[trackIndex]];
      
      // Renumber tracks to maintain proper order
      const renumberedTracks = tracks.map((track, index) => ({
        ...track,
        trackNumber: index + 1
      }));
      
      setFormData(prev => ({ ...prev, tracks: renumberedTracks }));
    }
  };

  const updateTrack = (trackIndex: number, field: keyof Track, value: any) => {
    const updatedTracks = [...formData.tracks];
    updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], [field]: value };
    setFormData(prev => ({ ...prev, tracks: updatedTracks }));
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const toggleMood = (mood: string) => {
    setFormData(prev => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter(m => m !== mood)
        : [...prev.moods, mood]
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return false;
    }

    if (formData.genres.length === 0) {
      Alert.alert('Error', 'At least one genre is required');
      return false;
    }

    if (!formData.coverFile) {
      Alert.alert('Error', 'Cover art is required');
      return false;
    }

    for (let i = 0; i < formData.tracks.length; i++) {
      const track = formData.tracks[i];
      if (!track.title.trim()) {
        Alert.alert('Error', `Track ${i + 1} title is required`);
        return false;
      }
      if (!track.audioFile) {
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
      console.log('🚀 Starting upload process...');
      
      if (formData.type === 'single') {
        // Prepare single upload data
        const track = formData.tracks[0];
        const singleData: SingleUploadData = {
          title: formData.title,
          lyrics: track.lyrics,
          duration: track.duration || 180,
          genres: formData.genres,
          explicit: formData.explicit,
          coverFile: formData.coverFile,
          audioFile: track.audioFile,
          description: formData.description,
          releaseDate: formData.releaseDate,
          artistId: user?.id || '', // Use admin's user ID as artist ID
        };

        console.log('📀 Uploading single...');
        await uploadService.uploadSingle(singleData);
      } else {
        // Prepare album upload data
        const albumData: AlbumUploadData = {
          title: formData.title,
          description: formData.description,
          releaseDate: formData.releaseDate,
          coverFile: formData.coverFile,
          genres: formData.genres,
          explicit: formData.explicit,
          artistId: user?.id || '', // Use admin's user ID as artist ID
          tracks: formData.tracks.map(track => ({
            title: track.title,
            audioFile: track.audioFile,
            lyrics: track.lyrics,
            explicit: track.explicit,
            trackNumber: track.trackNumber,
            duration: track.duration || 180,
          })),
        };

        console.log('💿 Uploading album...');
        await uploadService.uploadAlbum(albumData);
      }

      console.log('✅ Upload successful');

      Alert.alert(
        'Success', 
        `${formData.type === 'single' ? 'Single' : 'Album'} uploaded successfully!`,
        [
          {
            text: 'View Uploads',
            onPress: () => router.push('/admin/uploads')
          }
        ]
      );
      
      // Reset form
      setFormData({
        type: 'single',
        title: '',
        releaseDate: new Date().toISOString().split('T')[0],
        coverFile: null,
        genres: [],
        moods: [],
        explicit: false,
        isPublic: true,
        description: '',
        tracks: [{
          id: '1',
          title: '',
          audioFile: null,
          lyrics: '',
          explicit: false,
          trackNumber: 1,
          featuringArtists: [],
          duration: 0,
        }],
      });
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Check if the error is due to invalid token
      if (error instanceof Error && error.message === 'Invalid token') {
        Alert.alert(
          'Session Expired', 
          'Your session has expired. Please log out and log back in to continue uploading content.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('Error', (error instanceof Error ? error.message : 'An unexpected error occurred') || `Failed to upload ${formData.type}. Please try again.`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (user?.role !== 'admin') {
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Content</Text>
        <TouchableOpacity
          style={styles.uploadsButton}
          onPress={() => router.push('/admin/uploads')}
        >
          <Text style={styles.uploadsButtonText}>View Uploads</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Upload Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                formData.type === 'single' && styles.typeOptionSelected
              ]}
              onPress={() => setFormData(prev => ({ ...prev, type: 'single' }))}
            >
              <Music color={formData.type === 'single' ? '#8b5cf6' : '#64748b'} size={20} />
              <Text style={[
                styles.typeOptionText,
                formData.type === 'single' && styles.typeOptionTextSelected
              ]}>Single</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeOption,
                formData.type === 'album' && styles.typeOptionSelected
              ]}
              onPress={() => setFormData(prev => ({ ...prev, type: 'album' }))}
            >
              <Music color={formData.type === 'album' ? '#8b5cf6' : '#64748b'} size={20} />
              <Text style={[
                styles.typeOptionText,
                formData.type === 'album' && styles.typeOptionTextSelected
              ]}>Album</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* General Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${formData.type} title`}
              placeholderTextColor="#64748b"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Release Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
              value={formData.releaseDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, releaseDate: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cover Art *</Text>
            <TouchableOpacity
              style={[styles.fileButton, formData.coverFile && styles.fileButtonSelected]}
              onPress={pickCoverImage}
            >
              <ImageIcon color={formData.coverFile ? "#8b5cf6" : "#64748b"} size={20} />
              <Text style={[styles.fileButtonText, formData.coverFile && styles.fileButtonTextSelected]}>
                {formData.coverFile ? 'Cover Selected' : 'Select Cover Image'}
              </Text>
              {formData.coverFile && <Check color="#8b5cf6" size={20} />}
            </TouchableOpacity>
            {formData.coverFile && (
              <Image source={{ uri: formData.coverFile.uri }} style={styles.coverPreview} />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional description or caption"
              placeholderTextColor="#64748b"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Genres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genres *</Text>
          <View style={styles.tagContainer}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.tag,
                  formData.genres.includes(genre) && styles.tagSelected
                ]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[
                  styles.tagText,
                  formData.genres.includes(genre) && styles.tagTextSelected
                ]}>{genre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Moods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moods</Text>
          <View style={styles.tagContainer}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.tag,
                  formData.moods.includes(mood) && styles.tagSelected
                ]}
                onPress={() => toggleMood(mood)}
              >
                <Text style={[
                  styles.tagText,
                  formData.moods.includes(mood) && styles.tagTextSelected
                ]}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tracks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {formData.type === 'single' ? 'Track' : 'Tracks'}
            </Text>
            {formData.type === 'album' && (
              <TouchableOpacity style={styles.addTrackButton} onPress={addTrack}>
                <Plus color="#8b5cf6" size={20} />
                <Text style={styles.addTrackText}>Add Track</Text>
              </TouchableOpacity>
            )}
          </View>

          {formData.tracks.map((track, index) => (
            <View key={track.id} style={styles.trackCard}>
              <View style={styles.trackHeader}>
                <Text style={styles.trackNumber}>Track {track.trackNumber}</Text>
                <View style={styles.trackControls}>
                  {formData.type === 'album' && formData.tracks.length > 1 && (
                    <>
                      <TouchableOpacity
                        style={[styles.trackControlButton, index === 0 && styles.trackControlButtonDisabled]}
                        onPress={() => moveTrack(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp color={index === 0 ? "#64748b" : "#8b5cf6"} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.trackControlButton, index === formData.tracks.length - 1 && styles.trackControlButtonDisabled]}
                        onPress={() => moveTrack(index, 'down')}
                        disabled={index === formData.tracks.length - 1}
                      >
                        <ArrowDown color={index === formData.tracks.length - 1 ? "#64748b" : "#8b5cf6"} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeTrackButton}
                        onPress={() => removeTrack(index)}
                      >
                        <X color="#ef4444" size={16} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Track Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter track title"
                  placeholderTextColor="#64748b"
                  value={track.title}
                  onChangeText={(text) => updateTrack(index, 'title', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Audio File *</Text>
                <TouchableOpacity
                  style={[styles.fileButton, track.audioFile && styles.fileButtonSelected]}
                  onPress={() => pickAudioFile(index)}
                >
                  <Music color={track.audioFile ? "#8b5cf6" : "#64748b"} size={20} />
                  <Text style={[styles.fileButtonText, track.audioFile && styles.fileButtonTextSelected]}>
                    {track.audioFile ? track.audioFile.name : 'Select Audio File'}
                  </Text>
                  {track.audioFile && <Check color="#8b5cf6" size={20} />}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Lyrics (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter lyrics"
                  placeholderTextColor="#64748b"
                  value={track.lyrics}
                  onChangeText={(text) => updateTrack(index, 'lyrics', text)}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Duration (seconds)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 180"
                  placeholderTextColor="#64748b"
                  value={track.duration.toString()}
                  onChangeText={(text) => updateTrack(index, 'duration', parseInt(text) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isUploading}
          >
            <LinearGradient
              colors={isUploading ? ['#64748b', '#64748b'] : ['#8b5cf6', '#a855f7']}
              style={styles.submitButtonGradient}
            >
              {isUploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Upload color="#ffffff" size={20} />
              )}
              <Text style={styles.submitButtonText}>
                {isUploading ? 'Uploading...' : `Upload ${formData.type === 'single' ? 'Single' : 'Album'}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  uploadsButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  uploadsButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  typeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  typeOptionTextSelected: {
    color: '#8b5cf6',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 12,
  },
  fileButtonSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  fileButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  fileButtonTextSelected: {
    color: '#8b5cf6',
  },
  coverPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: '#8b5cf6',
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
  },
  tagTextSelected: {
    color: '#8b5cf6',
  },
  addTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 6,
  },
  addTrackText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackNumber: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
  },
  trackControls: {
    flexDirection: 'row',
    gap: 8,
  },
  trackControlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackControlButtonDisabled: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  removeTrackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 120,
  },
});