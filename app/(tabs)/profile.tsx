import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, supabase } from '@/providers/AuthProvider';
import { useMusic } from '@/providers/MusicProvider';
import { router } from 'expo-router';
import { 
  Edit3, 
  Settings, 
  LogOut, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  Camera, 
  Save, 
  X, 
  Users, 
  Music, 
  Heart, 
  Calendar, 
  Lock, 
  Globe, 
  Play, 
  Pause,
  Check,
  AlertCircle
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/services/supabaseStorage';

interface UserProfile {
  id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_picture_url?: string;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
  top_artists: any[];
  top_songs: any[];
  status_text?: string;
  pinned_content_type?: string;
  pinned_content_id?: string;
  profile_completed?: boolean;
}

interface ProfileFormData {
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  isPrivate: boolean;
  statusText: string;
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();
  
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: '',
    firstName: '',
    lastName: '',
    bio: '',
    isPrivate: false,
    statusText: '',
  });

  // Validation state
  const [formErrors, setFormErrors] = useState<Partial<ProfileFormData>>({});

  // Initialize form data when user or profile changes
  useEffect(() => {
    if (user && profile) {
      setFormData({
        displayName: profile.display_name || user.displayName || '',
        firstName: profile.first_name || user.firstName || '',
        lastName: profile.last_name || user.lastName || '',
        bio: profile.bio || user.bio || '',
        isPrivate: profile.is_private || user.isPrivate || false,
        statusText: profile.status_text || '',
      });
    }
  }, [user, profile]);

  // Load profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  // Check if profile setup is needed
  useEffect(() => {
    if (profile && !isLoading) {
      const needsSetup = !profile.display_name || !profile.bio;
      setShowSetupPrompt(needsSetup);
    }
  }, [profile, isLoading]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_user_profile_with_stats', { target_user_id: user.id });

      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
      } else {
        // Create initial profile if doesn't exist
        await createInitialProfile();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            display_name: user.displayName || user.email?.split('@')[0] || 'User',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            bio: '',
            is_private: false,
            profile_completed: false,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      // Reload profile after creation
      await loadUserProfile();
    } catch (error) {
      console.error('Error creating initial profile:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadUserProfile();
    setIsRefreshing(false);
  }, []);

  const validateForm = (): boolean => {
    const errors: Partial<ProfileFormData> = {};

    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    if (formData.bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }

    if (formData.statusText.length > 200) {
      errors.statusText = 'Status must be less than 200 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateFormData = (field: keyof ProfileFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setAvatarFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking avatar:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setIsSaving(true);
      
      let avatarUrl: string | undefined = profile?.profile_picture_url;
      
      // Upload avatar if changed
      if (avatarFile && user) {
        const ext = avatarFile.name?.split('.').pop() || 'jpg';
        const path = `images/avatars/${user.id}.${ext}`;
        const { url } = await uploadImage(avatarFile, path);
        avatarUrl = url;
      }

      // Update profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          is_private: formData.isPrivate,
          profile_picture_url: avatarUrl,
          status_text: formData.statusText || null,
          profile_completed: true,
        })
        .eq('id', user?.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        Alert.alert('Error', 'Failed to update profile');
        return;
      }

      // Update auth provider with new data
      await updateProfile({
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        isPrivate: formData.isPrivate,
        profile_picture_url: avatarUrl,
      });

      // Reset states
      setIsEditing(false);
      setAvatarFile(null);
      setShowSetupPrompt(false);
      
      // Reload profile
      await loadUserProfile();
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, profile?.top_songs || []);
      }
    } else {
      playTrack(track, profile?.top_songs || []);
    }
  };

  const renderTopTrack = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.topTrackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Text style={styles.topTrackRank}>{index + 1}</Text>
      <Image source={{ uri: item.cover_url }} style={styles.topTrackCover} />
      <View style={styles.topTrackInfo}>
        <Text style={styles.topTrackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.topTrackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.topTrackPlays}>
          {item.play_count} plays
        </Text>
      </View>
      <TouchableOpacity style={styles.topTrackPlayButton}>
        {currentTrack?.id === item.id && isPlaying ? (
          <Pause color="#8b5cf6" size={16} />
        ) : (
          <Play color="#8b5cf6" size={16} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderTopArtist = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.topArtistItem}>
      <Image source={{ uri: item.avatar_url }} style={styles.topArtistAvatar} />
      <Text style={styles.topArtistName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.topArtistPlays}>
        {item.play_count} plays
      </Text>
    </TouchableOpacity>
  );

  const renderSetupPrompt = () => (
    <View style={styles.setupPrompt}>
      <View style={styles.setupPromptContent}>
        <AlertCircle color="#f59e0b" size={24} />
        <Text style={styles.setupPromptTitle}>Complete Your Profile</Text>
        <Text style={styles.setupPromptText}>
          Add a display name and bio to help others discover you
        </Text>
        <TouchableOpacity
          style={styles.setupPromptButton}
          onPress={() => setIsEditing(true)}
        >
          <LinearGradient
            colors={['#8b5cf6', '#a855f7']}
            style={styles.setupPromptButtonGradient}
          >
            <Text style={styles.setupPromptButtonText}>Complete Setup</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormField = (
    field: keyof ProfileFormData,
    placeholder: string,
    icon?: React.ReactNode,
    multiline = false,
    numberOfLines = 1
  ) => (
    <View style={styles.fieldContainer}>
      <View style={[styles.inputContainer, formErrors[field] && styles.inputError]}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          value={formData[field] as string}
          onChangeText={(text) => updateFormData(field, text)}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
      {formErrors[field] && (
        <Text style={styles.errorText}>{formErrors[field]}</Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
                setAvatarFile(null);
                setFormErrors({});
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? (
              <X color="#ffffff" size={24} />
            ) : (
              <Edit3 color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Setup Prompt */}
        {showSetupPrompt && !isEditing && renderSetupPrompt()}

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  avatarFile?.uri ||
                  profile?.profile_picture_url ||
                  user?.profilePictureUrl ||
                  'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400'
              }}
              style={styles.avatar}
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton} onPress={pickAvatar}>
                <Camera color="#ffffff" size={20} />
              </TouchableOpacity>
            )}
          </View>

          {/* Profile Content */}
          {isEditing ? (
            <View style={styles.editForm}>
              {/* Display Name */}
              {renderFormField('displayName', 'Display Name', <User color="#8b5cf6" size={20} />)}

              {/* First and Last Name */}
              <View style={styles.nameRow}>
                <View style={styles.nameInput}>
                  {renderFormField('firstName', 'First Name')}
                </View>
                <View style={styles.nameInput}>
                  {renderFormField('lastName', 'Last Name')}
                </View>
              </View>

              {/* Bio */}
              {renderFormField('bio', 'Tell us about yourself...', undefined, true, 3)}

              {/* Status */}
              {renderFormField('statusText', "What's on your mind?", undefined, true, 2)}

              {/* Privacy Toggle */}
              <View style={styles.switchContainer}>
                <View style={styles.switchInfo}>
                  {formData.isPrivate ? (
                    <Lock color="#8b5cf6" size={20} />
                  ) : (
                    <Globe color="#8b5cf6" size={20} />
                  )}
                  <View style={styles.switchTextContainer}>
                    <Text style={styles.switchLabel}>
                      {formData.isPrivate ? 'Private Profile' : 'Public Profile'}
                    </Text>
                    <Text style={styles.switchDescription}>
                      {formData.isPrivate 
                        ? 'Require approval for followers' 
                        : 'Anyone can follow you'
                      }
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.isPrivate}
                  onValueChange={(value) => updateFormData('isPrivate', value)}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor={formData.isPrivate ? '#ffffff' : '#9ca3af'}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={isSaving ? ['#6b7280', '#6b7280'] : ['#8b5cf6', '#a855f7']}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Save color="#ffffff" size={20} style={styles.saveIcon} />
                  )}
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Display Info */}
              <Text style={styles.displayName}>{profile?.display_name || 'User'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              {/* Status */}
              {profile?.status_text && (
                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>{profile.status_text}</Text>
                </View>
              )}

              {/* Privacy Indicator */}
              <View style={styles.privacyIndicator}>
                {profile?.is_private ? (
                  <>
                    <Lock color="#8b5cf6" size={16} />
                    <Text style={styles.privacyText}>Private Account</Text>
                  </>
                ) : (
                  <>
                    <Globe color="#10b981" size={16} />
                    <Text style={[styles.privacyText, { color: '#10b981' }]}>Public Account</Text>
                  </>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.follower_count || 0}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.following_count || 0}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {user?.role === 'artist' ? 'Artist' : 'Listener'}
                  </Text>
                  <Text style={styles.statLabel}>Role</Text>
                </View>
              </View>

              {/* Join Date */}
              <View style={styles.joinDate}>
                <Calendar color="#94a3b8" size={16} />
                <Text style={styles.joinDateText}>
                  Joined {new Date(profile?.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Content Sections - Only show when not editing */}
        {!isEditing && (
          <>
            {/* Top Artists */}
            {profile?.top_artists && profile.top_artists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Artists</Text>
                <FlatList
                  data={profile.top_artists.slice(0, 5)}
                  renderItem={renderTopArtist}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            )}

            {/* Top Songs */}
            {profile?.top_songs && profile.top_songs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Songs</Text>
                <FlatList
                  data={profile.top_songs.slice(0, 5)}
                  renderItem={renderTopTrack}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Menu Section */}
            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <Settings color="#8b5cf6" size={24} />
                  <Text style={styles.menuItemText}>Settings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <Eye color="#8b5cf6" size={24} />
                  <Text style={styles.menuItemText}>Privacy</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <View style={styles.menuItemContent}>
                  <LogOut color="#ef4444" size={24} />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupPrompt: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  setupPromptContent: {
    padding: 20,
    alignItems: 'center',
  },
  setupPromptTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#f59e0b',
    marginTop: 8,
    marginBottom: 8,
  },
  setupPromptText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  setupPromptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  setupPromptButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  setupPromptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#8b5cf6',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8b5cf6',
    textAlign: 'center',
    lineHeight: 20,
  },
  privacyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  privacyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  joinDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  joinDateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  editForm: {
    width: '100%',
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  fieldContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  multilineInput: {
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
        gap: 12,
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  switchDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 8,
  },
  saveIcon: {
    marginRight: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  horizontalList: {
    gap: 16,
  },
  topArtistItem: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  topArtistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    marginBottom: 8,
  },
  topArtistName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
  },
  topArtistPlays: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  topTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  topTrackRank: {
    width: 24,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginRight: 12,
    textAlign: 'center',
  },
  topTrackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  topTrackInfo: {
    flex: 1,
  },
  topTrackTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  topTrackArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
  },
  topTrackPlays: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  topTrackPlayButton: {
    paddingHorizontal: 8,
  },
  menuSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  menuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  logoutText: {
    color: '#ef4444',
  },
  bottomPadding: {
    height: 60,
  },
});
