import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import { apiService } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { 
  Upload, 
  Music, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Plus,
  X,
  Check,
  AlertCircle
} from 'lucide-react-native';

interface UploadFormData {
  title: string;
  lyrics: string;
  duration: string;
  genres: string[];
  isExplicit: boolean;
  price: string;
}

export default function ArtistDashboardScreen() {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();
  
  // Artist profile state
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [artistTracks, setArtistTracks] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<any>(null);
  const [coverFile, setCoverFile] = useState<any>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    lyrics: '',
    duration: '',
    genres: [],
    isExplicit: false,
    price: '0',
  });
  const [newGenre, setNewGenre] = useState('');

  useEffect(() => {
    loadArtistProfile();
  }, []);

  useEffect(() => {
    if (artistProfile) {
      loadArtistTracks();
    }
  }, [artistProfile]);

  const loadArtistProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await apiService.getMyArtistProfile();
      setArtistProfile(profile);
    } catch (error) {
      console.error('Error loading artist profile:', error);
      // If no artist profile exists, we'll show a create profile option
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadArtistTracks = async () => {
    if (!artistProfile) return;
    
    try {
      setIsLoadingTracks(true);
      const tracks = await apiService.getArtistTracks(artistProfile.id);
      setArtistTracks(tracks);
    } catch (error) {
      console.error('Error loading artist tracks:', error);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setAudioFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file');
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
        setCoverFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const addGenre = () => {
    if (newGenre.trim() && !formData.genres.includes(newGenre.trim())) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, newGenre.trim()]
      }));
      setNewGenre('');
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  const createFileFromUri = async (uri: string, name: string, type: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new File([blob], name, { type });
    } else {
      // For mobile platforms, we'll need to handle this differently
      // This is a simplified version for web compatibility
      return { uri, name, type } as any;
    }
  };

  const handleUpload = async () => {
    if (!audioFile || !formData.title.trim()) {
      Alert.alert('Error', 'Please provide at least a title and audio file');
      return;
    }

    if (!artistProfile) {
      Alert.alert('Error', 'Artist profile required to upload tracks');
      return;
    }

    try {
      setIsUploading(true);

      // Create FormData for track creation
      const trackFormData = new FormData();
      
      // Add audio file
      const audioFileForUpload = await createFileFromUri(
        audioFile.uri, 
        audioFile.name || 'audio.mp3', 
        audioFile.mimeType || 'audio/mpeg'
      );
      trackFormData.append('audio', audioFileForUpload as any);

      // Add cover file if provided
      if (coverFile) {
        const coverFileForUpload = await createFileFromUri(
          coverFile.uri,
          coverFile.fileName || 'cover.jpg',
          coverFile.mimeType || 'image/jpeg'
        );
        trackFormData.append('cover', coverFileForUpload as any);
      }

      // Add track metadata
      trackFormData.append('title', formData.title);
      trackFormData.append('lyrics', formData.lyrics);
      trackFormData.append('duration', formData.duration || '180'); // Default 3 minutes
      trackFormData.append('genres', JSON.stringify(formData.genres));
      trackFormData.append('isExplicit', formData.isExplicit.toString());
      trackFormData.append('price', formData.price);

      // Upload track
      await apiService.createTrack(trackFormData);

      Alert.alert('Success', 'Track uploaded successfully!');
      
      // Reset form
      setFormData({
        title: '',
        lyrics: '',
        duration: '',
        genres: [],
        isExplicit: false,
        price: '0',
      });
      setAudioFile(null);
      setCoverFile(null);
      setShowUploadForm(false);
      
      // Reload tracks
      await loadArtistTracks();
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload track. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, artistTracks);
      }
    } else {
      playTrack(track, artistTracks);
    }
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackStatus}>
          {item.is_published ? 'Published' : 'Draft'} • {item.play_count || 0} plays
        </Text>
        <Text style={styles.trackGenres}>
          {Array.isArray(item.genres) ? item.genres.join(', ') : 'No genres'}
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton}>
        {currentTrack?.id === item.id && isPlaying ? (
          <Pause color="#8b5cf6" size={20} />
        ) : (
          <Play color="#8b5cf6" size={20} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoadingProfile) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading artist dashboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!artistProfile) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.noProfileContainer}>
          <AlertCircle color="#ef4444" size={64} />
          <Text style={styles.noProfileTitle}>Artist Profile Required</Text>
          <Text style={styles.noProfileText}>
            You need to create an artist profile to upload music and access the artist dashboard.
          </Text>
          <TouchableOpacity style={styles.createProfileButton}>
            <LinearGradient
              colors={['#8b5cf6', '#a855f7']}
              style={styles.createProfileGradient}
            >
              <Text style={styles.createProfileText}>Create Artist Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Artist Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {artistProfile.stage_name}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{artistTracks.length}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{artistProfile.total_plays || 0}</Text>
            <Text style={styles.statLabel}>Total Plays</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{artistProfile.monthly_listeners || 0}</Text>
            <Text style={styles.statLabel}>Monthly Listeners</Text>
          </View>
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upload Music</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => setShowUploadForm(true)}
            >
              <Plus color="#ffffff" size={20} />
              <Text style={styles.uploadButtonText}>New Track</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Tracks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Tracks</Text>
          {isLoadingTracks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.loadingText}>Loading tracks...</Text>
            </View>
          ) : artistTracks.length > 0 ? (
            <FlatList
              data={artistTracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Music color="#64748b" size={48} />
              <Text style={styles.emptyText}>No tracks uploaded yet</Text>
              <Text style={styles.emptySubtext}>Upload your first track to get started</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Upload Modal */}
      {showUploadForm && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Track</Text>
              <TouchableOpacity
                onPress={() => setShowUploadForm(false)}
                style={styles.closeButton}
              >
                <X color="#ffffff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Audio File */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Audio File *</Text>
                <TouchableOpacity
                  style={[styles.fileButton, audioFile && styles.fileButtonSelected]}
                  onPress={pickAudioFile}
                >
                  <Music color={audioFile ? "#8b5cf6" : "#64748b"} size={20} />
                  <Text style={[styles.fileButtonText, audioFile && styles.fileButtonTextSelected]}>
                    {audioFile ? audioFile.name : 'Select Audio File'}
                  </Text>
                  {audioFile && <Check color="#8b5cf6" size={20} />}
                </TouchableOpacity>
              </View>

              {/* Cover Image */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cover Image</Text>
                <TouchableOpacity
                  style={[styles.fileButton, coverFile && styles.fileButtonSelected]}
                  onPress={pickCoverImage}
                >
                  <ImageIcon color={coverFile ? "#8b5cf6" : "#64748b"} size={20} />
                  <Text style={[styles.fileButtonText, coverFile && styles.fileButtonTextSelected]}>
                    {coverFile ? 'Cover Selected' : 'Select Cover Image'}
                  </Text>
                  {coverFile && <Check color="#8b5cf6" size={20} />}
                </TouchableOpacity>
                {coverFile && (
                  <Image source={{ uri: coverFile.uri }} style={styles.coverPreview} />
                )}
              </View>

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter track title"
                  placeholderTextColor="#64748b"
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                />
              </View>

              {/* Lyrics */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Lyrics</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter lyrics (optional)"
                  placeholderTextColor="#64748b"
                  value={formData.lyrics}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lyrics: text }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Duration (seconds)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 180"
                  placeholderTextColor="#64748b"
                  value={formData.duration}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, duration: text }))}
                  keyboardType="numeric"
                />
              </View>

              {/* Genres */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Genres</Text>
                <View style={styles.genreInputContainer}>
                  <TextInput
                    style={styles.genreInput}
                    placeholder="Add genre"
                    placeholderTextColor="#64748b"
                    value={newGenre}
                    onChangeText={setNewGenre}
                  />
                  <TouchableOpacity style={styles.addGenreButton} onPress={addGenre}>
                    <Plus color="#8b5cf6" size={20} />
                  </TouchableOpacity>
                </View>
                <View style={styles.genreList}>
                  {formData.genres.map((genre, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.genreTag}
                      onPress={() => removeGenre(genre)}
                    >
                      <Text style={styles.genreTagText}>{genre}</Text>
                      <X color="#8b5cf6" size={16} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price ($)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Explicit Content */}
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData(prev => ({ ...prev, isExplicit: !prev.isExplicit }))}
                >
                  <View style={[styles.checkbox, formData.isExplicit && styles.checkboxChecked]}>
                    {formData.isExplicit && <Check color="#ffffff" size={16} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Explicit Content</Text>
                </TouchableOpacity>
              </View>

              {/* Upload Button */}
              <TouchableOpacity
                style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
                onPress={handleUpload}
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
                    {isUploading ? 'Uploading...' : 'Upload Track'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 16,
  },
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  noProfileTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  noProfileText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createProfileButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createProfileGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createProfileText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  uploadButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 2,
  },
  trackGenres: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
  modalScrollView: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
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
    marginLeft: 12,
  },
  fileButtonTextSelected: {
    color: '#8b5cf6',
  },
  coverPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 12,
  },
  genreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginRight: 12,
  },
  addGenreButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
    marginRight: 6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 120,
  },
});