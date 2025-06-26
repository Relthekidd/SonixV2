import React, { useState, useEffect } from 'react';
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
  Pause
} from 'lucide-react-native';

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
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editedProfile, setEditedProfile] = useState({
    displayName: user?.displayName || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    isPrivate: user?.isPrivate || false,
    statusText: '',
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_user_profile_with_stats', { target_user_id: user.id });

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
        setEditedProfile({
          displayName: data[0].display_name || '',
          firstName: data[0].first_name || '',
          lastName: data[0].last_name || '',
          bio: data[0].bio || '',
          isPrivate: data[0].is_private || false,
          statusText: data[0].status_text || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        displayName: editedProfile.displayName,
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        bio: editedProfile.bio,
        isPrivate: editedProfile.isPrivate,
      });

      // Update status if changed
      if (editedProfile.statusText !== profile?.status_text) {
        await supabase.rpc('update_user_status', {
          status_text: editedProfile.statusText || null,
        });
      }

      setIsEditing(false);
      await loadUserProfile();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X color="#ffffff" size={24} />
            ) : (
              <Edit3 color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ 
                uri: profile?.profile_picture_url || user?.profilePictureUrl || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400' 
              }} 
              style={styles.avatar} 
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton}>
                <Camera color="#ffffff" size={20} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputContainer}>
                <User color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#64748b"
                  value={editedProfile.displayName}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, displayName: text }))}
                />
              </View>

              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor="#64748b"
                    value={editedProfile.firstName}
                    onChangeText={(text) => setEditedProfile(prev => ({ ...prev, firstName: text }))}
                  />
                </View>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor="#64748b"
                    value={editedProfile.lastName}
                    onChangeText={(text) => setEditedProfile(prev => ({ ...prev, lastName: text }))}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Bio"
                  placeholderTextColor="#64748b"
                  value={editedProfile.bio}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Status (What's on your mind?)"
                  placeholderTextColor="#64748b"
                  value={editedProfile.statusText}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, statusText: text }))}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchInfo}>
                  {editedProfile.isPrivate ? (
                    <Lock color="#8b5cf6" size={20} />
                  ) : (
                    <Globe color="#8b5cf6" size={20} />
                  )}
                  <View style={styles.switchTextContainer}>
                    <Text style={styles.switchLabel}>
                      {editedProfile.isPrivate ? 'Private Profile' : 'Public Profile'}
                    </Text>
                    <Text style={styles.switchDescription}>
                      {editedProfile.isPrivate 
                        ? 'Require approval for followers' 
                        : 'Anyone can follow you'
                      }
                    </Text>
                  </View>
                </View>
                <Switch
                  value={editedProfile.isPrivate}
                  onValueChange={(value) => setEditedProfile(prev => ({ ...prev, isPrivate: value }))}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor={editedProfile.isPrivate ? '#ffffff' : '#9ca3af'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#a855f7']}
                  style={styles.saveButtonGradient}
                >
                  <Save color="#ffffff" size={20} style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.displayName}>{profile?.display_name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              {/* Status Section */}
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
                  <Text style={styles.statValue}>{user?.role === 'admin' ? 'Admin' : user?.role === 'artist' ? 'Artist' : 'Listener'}</Text>
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  bioInput: {
    paddingVertical: 12,
    minHeight: 80,
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
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  horizontalList: {
    paddingHorizontal: 24,
  },
  topArtistItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  topArtistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  topArtistName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  topArtistPlays: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  topTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  topTrackRank: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#8b5cf6',
    width: 24,
    textAlign: 'center',
  },
  topTrackCover: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 12,
  },
  topTrackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topTrackTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  topTrackArtist: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 2,
  },
  topTrackPlays: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  topTrackPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuSection: {
    paddingHorizontal: 24,
  },
  menuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 16,
  },
  logoutText: {
    color: '#ef4444',
  },
  bottomPadding: {
    height: 120,
  },
});