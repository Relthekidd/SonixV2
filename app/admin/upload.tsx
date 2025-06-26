import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { 
  ArrowLeft, 
  Upload, 
  Music, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Check,
  Calendar,
  User,
  FileText,
  Settings,
  Save
} from 'lucide-react-native';

interface Artist {
  id: string;
  name: string;
  stage_name: string;
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
  primaryArtist: string;
  featuringArtists: string[];
  tracks: Track[];
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
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewArtistModal, setShowNewArtistModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');

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
    primaryArtist: '',
    featuringArtists: [],
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

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      setIsLoading(true);
      const artistsData = await apiService.getArtists({ limit: 100 });
      setArtists(artistsData);
    } catch (error) {
      console.error('Error loading artists:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      setFormData(prev => ({ ...prev, tracks: updatedTracks }));
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

  const createNewArtist = async () => {
    if (!newArtistName.trim()) {
      Alert.alert('Error', 'Please enter an artist name');
      return;
    }

    try {
      // Mock artist creation - replace with actual API call
      const newArtist: Artist = {
        id: Date.now().toString(),
        name: newArtistName,
        stage_name: newArtistName,
      };
      
      setArtists(prev => [...prev, newArtist]);
      setFormData(prev => ({ ...prev, primaryArtist: newArtist.id }));
      setNewArtistName('');
      setShowNewArtistModal(false);
      Alert.alert('Success', 'Artist created successfully!');
    } catch (error) {
      console.error('Error creating artist:', error);
      Alert.alert('Error', 'Failed to create artist');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return false;
    }

    if (!formData.primaryArtist) {
      Alert.alert('Error', 'Primary artist is required');
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
      // Create FormData for upload
      const uploadFormData = new FormData();
      
      // Add metadata
      uploadFormData.append('type', formData.type);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('releaseDate', formData.releaseDate);
      uploadFormData.append('genres', JSON.stringify(formData.genres));
      uploadFormData.append('moods', JSON.stringify(formData.moods));
      uploadFormData.append('explicit', formData.explicit.toString());
      uploadFormData.append('isPublic', formData.isPublic.toString());
      uploadFormData.append('description', formData.description);
      uploadFormData.append('primaryArtist', formData.primaryArtist);
      uploadFormData.append('featuringArtists', JSON.stringify(formData.featuringArtists));

      // Add cover file
      if (formData.coverFile) {
        const coverFileForUpload = await createFileFromUri(
          formData.coverFile.uri,
          formData.coverFile.fileName || 'cover.jpg',
          formData.coverFile.mimeType || 'image/jpeg'
        );
        uploadFormData.append('cover', coverFileForUpload as any);
      }

      // Add tracks
      for (let i = 0; i < formData.tracks.length; i++) {
        const track = formData.tracks[i];
        
        // Add track metadata
        uploadFormData.append(`tracks[${i}][title]`, track.title);
        uploadFormData.append(`tracks[${i}][lyrics]`, track.lyrics);
        uploadFormData.append(`tracks[${i}][explicit]`, track.explicit.toString());
        uploadFormData.append(`tracks[${i}][trackNumber]`, track.trackNumber.toString());
        uploadFormData.append(`tracks[${i}][featuringArtists]`, JSON.stringify(track.featuringArtists));

        // Add audio file
        if (track.audioFile) {
          const audioFileForUpload = await createFileFromUri(
            track.audioFile.uri,
            track.audioFile.name || `track-${i + 1}.mp3`,
            track.audioFile.mimeType || 'audio/mpeg'
          );
          uploadFormData.append(`tracks[${i}][audio]`, audioFileForUpload as any);
        }
      }

      // Upload to backend
      const endpoint = formData.type === 'single' ? '/singles' : '/albums';
      await apiService.request(endpoint, {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: uploadFormData,
      });

      Alert.alert('Success', `${formData.type === 'single' ? 'Single' : 'Album'} uploaded successfully!`);
      router.back();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload content. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const createFileFromUri = async (uri: string, name: string, type: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new File([blob], name, { type });
    } else {
      return { uri, name, type } as any;
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
        <View style={styles.placeholder} />
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

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Explicit Content</Text>
            <Switch
              value={formData.explicit}
              onValueChange={(value) => setFormData(prev => ({ ...prev, explicit: value }))}
              trackColor={{ false: '#374151', true: '#8b5cf6' }}
              thumbColor={formData.explicit ? '#ffffff' : '#9ca3af'}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Public Release</Text>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isPublic: value }))}
              trackColor={{ false: '#374151', true: '#8b5cf6' }}
              thumbColor={formData.isPublic ? '#ffffff' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Artist Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Artist Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Primary Artist *</Text>
            <View style={styles.artistSelector}>
              <View style={styles.selectContainer}>
                {/* Mock select - replace with proper dropdown */}
                <TouchableOpacity style={styles.selectButton}>
                  <User color="#8b5cf6" size={20} />
                  <Text style={styles.selectButtonText}>
                    {formData.primaryArtist 
                      ? artists.find(a => a.id === formData.primaryArtist)?.stage_name || 'Select Artist'
                      : 'Select Primary Artist'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.newArtistButton}
                onPress={() => setShowNewArtistModal(true)}
              >
                <Plus color="#8b5cf6" size={20} />
              </TouchableOpacity>
            </View>
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
                <Text style={styles.trackNumber}>Track {index + 1}</Text>
                {formData.type === 'album' && formData.tracks.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeTrackButton}
                    onPress={() => removeTrack(index)}
                  >
                    <X color="#ef4444" size={20} />
                  </TouchableOpacity>
                )}
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

              <View style={styles.toggleRow}>
                <Text style={styles.label}>Explicit</Text>
                <Switch
                  value={track.explicit}
                  onValueChange={(value) => updateTrack(index, 'explicit', value)}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor={track.explicit ? '#ffffff' : '#9ca3af'}
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

      {/* New Artist Modal */}
      {showNewArtistModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Artist</Text>
              <TouchableOpacity
                onPress={() => setShowNewArtistModal(false)}
                style={styles.closeButton}
              >
                <X color="#ffffff" size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Artist name"
              placeholderTextColor="#64748b"
              value={newArtistName}
              onChangeText={setNewArtistName}
              autoFocus
            />

            <TouchableOpacity
              style={styles.createArtistButton}
              onPress={createNewArtist}
            >
              <LinearGradient
                colors={['#8b5cf6', '#a855f7']}
                style={styles.createArtistGradient}
              >
                <Text style={styles.createArtistText}>Create Artist</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  placeholder: {
    width: 44,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  artistSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  selectContainer: {
    flex: 1,
  },
  selectButton: {
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
  selectButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  newArtistButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
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
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  createArtistButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createArtistGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  createArtistText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 120,
  },
});