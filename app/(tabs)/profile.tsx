import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMusic, Track } from '@/providers/MusicProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import {
  Edit3,
  LogOut,
  Camera,
  Play,
  Pause,
  Check,
  X,
  Music,
  User,
  List,
  Heart,
  Settings,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

interface Artist {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Playlist {
  id: string;
  title: string;
  cover_url?: string;
  track_count: number;
}

interface ProfileData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  show_top_songs: boolean;
  show_top_artists: boolean;
  show_playlists: boolean;
  top_songs?: string[];
  top_artists?: string[];
  featured_playlists?: string[];
}

interface EditableProfile {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  show_top_songs: boolean;
  show_top_artists: boolean;
  show_playlists: boolean;
  featured_playlists: string[];
}

// Database track interface to match your query structure
interface DatabaseTrack {
  id: string;
  title: string;
  duration: number | null;
  audio_url: string;
  cover_url: string;
  artist: { name: string } | { name: string }[] | null;
}

// Database artist interface
interface DatabaseArtist {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Editable fields
  const [editForm, setEditForm] = useState<EditableProfile>({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    show_top_songs: true,
    show_top_artists: true,
    show_playlists: true,
    featured_playlists: [],
  });

  // Data for showcase sections
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<Playlist[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  
  // Modal state
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      
      // Set edit form with current data
      setEditForm({
        username: profileData.username || '',
        display_name: profileData.display_name || '',
        bio: profileData.bio || '',
        avatar_url: profileData.avatar_url || '',
        show_top_songs: profileData.show_top_songs ?? true,
        show_top_artists: profileData.show_top_artists ?? true,
        show_playlists: profileData.show_playlists ?? true,
        featured_playlists: profileData.featured_playlists || [],
      });

      // Load showcase data if enabled
      await Promise.all([
        loadTopTracks(profileData.top_songs, profileData.show_top_songs),
        loadTopArtists(profileData.top_artists, profileData.show_top_artists),
        loadFeaturedPlaylists(profileData.featured_playlists, profileData.show_playlists),
        loadAllPlaylists(), // For playlist selector
      ]);

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadTopTracks = async (trackIds?: string[], enabled?: boolean) => {
    if (!enabled || !trackIds?.length) {
      setTopTracks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          duration,
          audio_url,
          cover_url,
          artist:artist_id(name)
        `)
        .in('id', trackIds);

      if (error) throw error;

      const tracks: Track[] =
        (data as DatabaseTrack[])?.map((track) => {
          const artistName = Array.isArray(track.artist)
            ? track.artist[0]?.name
            : track.artist?.name;

          return {
            id: track.id,
            title: track.title,
            artist: artistName || 'Unknown Artist',
            duration: track.duration || 0,
            audioUrl: apiService.getPublicUrl('audio-files', track.audio_url),
            coverUrl: apiService.getPublicUrl('images', track.cover_url),
            // Add required Track properties with defaults
            album: 'Unknown Album',
            isLiked: false,
            genre: 'Unknown',
            releaseDate: new Date().getFullYear().toString(),
          };
        }) || [];

      setTopTracks(tracks);
    } catch (error) {
      console.error('Error loading top tracks:', error);
    }
  };

  const loadTopArtists = async (artistIds?: string[], enabled?: boolean) => {
    if (!enabled || !artistIds?.length) {
      setTopArtists([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, avatar_url')
        .in('id', artistIds);

      if (error) throw error;

      const artists: Artist[] = (data as DatabaseArtist[])?.map(artist => ({
        id: artist.id,
        name: artist.name,
        avatar_url: artist.avatar_url 
          ? apiService.getPublicUrl('images', artist.avatar_url)
          : undefined,
      })) || [];

      setTopArtists(artists);
    } catch (error) {
      console.error('Error loading top artists:', error);
    }
  };

  const loadFeaturedPlaylists = async (playlistIds?: string[], enabled?: boolean) => {
    if (!enabled || !playlistIds?.length) {
      setFeaturedPlaylists([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          title,
          cover_url,
          playlist_tracks(track_id),
          featured_playlists
        `)
        .in('id', playlistIds)
        .eq('user_id', user?.id);

      if (error) throw error;

      const playlists: Playlist[] = (data || []).map(playlist => ({
        id: playlist.id,
        title: playlist.title,
        cover_url: playlist.cover_url 
          ? apiService.getPublicUrl('images', playlist.cover_url)
          : undefined,
        track_count: Array.isArray(playlist.playlist_tracks) ? playlist.playlist_tracks.length : 0,
      }));

      setFeaturedPlaylists(playlists);
    } catch (error) {
      console.error('Error loading featured playlists:', error);
    }
  };

  const loadAllPlaylists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          title,
          cover_url,
          playlist_tracks(track_id)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const playlists: Playlist[] = (data || []).map(playlist => ({
        id: playlist.id,
        title: playlist.title,
        cover_url: playlist.cover_url 
          ? apiService.getPublicUrl('images', playlist.cover_url)
          : undefined,
        track_count: Array.isArray(playlist.playlist_tracks) ? playlist.playlist_tracks.length : 0,
      }));

      setAllPlaylists(playlists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setImageUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(`avatars/${fileName}`, blob);

      if (uploadError) throw uploadError;

      const newAvatarUrl = `avatars/${fileName}`;
      setEditForm(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const updates = {
        username: editForm.username,
        display_name: editForm.display_name,
        bio: editForm.bio,
        avatar_url: editForm.avatar_url,
        show_top_songs: editForm.show_top_songs,
        show_top_artists: editForm.show_top_artists,
        show_playlists: editForm.show_playlists,
        featured_playlists: editForm.featured_playlists,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      setEditing(false);
      
      // Reload showcase data
      await Promise.all([
        loadTopTracks(profile.top_songs, editForm.show_top_songs),
        loadTopArtists(profile.top_artists, editForm.show_top_artists),
        loadFeaturedPlaylists(editForm.featured_playlists, editForm.show_playlists),
      ]);

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, topTracks);
      }
    } else {
      playTrack(track, topTracks);
    }
  };

  const togglePlaylistSelection = (playlistId: string) => {
    setEditForm(prev => ({
      ...prev,
      featured_playlists: prev.featured_playlists.includes(playlistId)
        ? prev.featured_playlists.filter(id => id !== playlistId)
        : [...prev.featured_playlists, playlistId]
    }));
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
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

  const renderArtistItem = ({ item }: { item: Artist }) => (
    <TouchableOpacity style={styles.artistItem}>
      <Image
        source={{
          uri: item.avatar_url || 'https://via.placeholder.com/100'
        }}
        style={styles.artistAvatar}
      />
      <Text style={styles.artistName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => router.push(`/library?playlist=${item.id}`)}
    >
      <Image
        source={{
          uri: item.cover_url || 'https://via.placeholder.com/100'
        }}
        style={styles.playlistCover}
      />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.playlistCount}>
          {item.track_count} tracks
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </LinearGradient>
    );
  }

  // Get the avatar URL with proper fallback
  const getAvatarUrl = () => {
    const avatarPath = editing ? editForm.avatar_url : profile.avatar_url;
    if (avatarPath) {
      return apiService.getPublicUrl('images', avatarPath);
    }
    return 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200';
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.header, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: getAvatarUrl() }}
              style={styles.avatar}
            />
            {editing && (
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleImagePick}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera color="#fff" size={16} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.editingForm}>
              <TextInput
                style={styles.input}
                value={editForm.username}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
                placeholder="Username"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={styles.input}
                value={editForm.display_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, display_name: text }))}
                placeholder="Display name"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                multiline
                value={editForm.bio}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, bio: text }))}
                placeholder="Bio"
                placeholderTextColor="#64748b"
              />
              
              {/* Showcase Settings */}
              <View style={styles.showcaseSettings}>
                <Text style={styles.settingsTitle}>Showcase Settings</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingLabelContainer}>
                    <Music color="#8b5cf6" size={20} />
                    <Text style={styles.settingLabel}>Show Top Songs</Text>
                  </View>
                  <Switch
                    value={editForm.show_top_songs}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, show_top_songs: value }))}
                    thumbColor="#8b5cf6"
                    trackColor={{ false: '#374151', true: 'rgba(139, 92, 246, 0.3)' }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingLabelContainer}>
                    <User color="#8b5cf6" size={20} />
                    <Text style={styles.settingLabel}>Show Top Artists</Text>
                  </View>
                  <Switch
                    value={editForm.show_top_artists}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, show_top_artists: value }))}
                    thumbColor="#8b5cf6"
                    trackColor={{ false: '#374151', true: 'rgba(139, 92, 246, 0.3)' }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingLabelContainer}>
                    <List color="#8b5cf6" size={20} />
                    <Text style={styles.settingLabel}>Show Playlists</Text>
                  </View>
                  <Switch
                    value={editForm.show_playlists}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, show_playlists: value }))}
                    thumbColor="#8b5cf6"
                    trackColor={{ false: '#374151', true: 'rgba(139, 92, 246, 0.3)' }}
                  />
                </View>

                {editForm.show_playlists && (
                  <TouchableOpacity
                    style={styles.selectPlaylistsButton}
                    onPress={() => setShowPlaylistSelector(true)}
                  >
                    <Text style={styles.selectPlaylistsText}>
                      Select Featured Playlists ({editForm.featured_playlists.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#a855f7']}
                    style={styles.buttonGradient}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Check color="#fff" size={16} />
                        <Text style={styles.buttonText}>Save</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setEditing(false);
                    // Reset form to current profile data
                    setEditForm({
                      username: profile.username || '',
                      display_name: profile.display_name || '',
                      bio: profile.bio || '',
                      avatar_url: profile.avatar_url || '',
                      show_top_songs: profile.show_top_songs ?? true,
                      show_top_artists: profile.show_top_artists ?? true,
                      show_playlists: profile.show_playlists ?? true,
                      featured_playlists: profile.featured_playlists || [],
                    });
                  }}
                >
                  <X color="#fff" size={16} />
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profile.display_name}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
              {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
              <Text style={styles.email}>{profile.email}</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.follower_count}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.following_count}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Edit3 color="#fff" size={16} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Showcase Sections */}
        {!editing && (
          <>
            {/* Top Songs */}
            {profile.show_top_songs && topTracks.length > 0 && (
              <View style={[styles.section, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
                <Text style={styles.sectionTitle}>Top Songs</Text>
                <FlatList
                  data={topTracks}
                  renderItem={renderTrackItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Top Artists */}
            {profile.show_top_artists && topArtists.length > 0 && (
              <View style={[styles.section, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
                <Text style={styles.sectionTitle}>Top Artists</Text>
                <FlatList
                  data={topArtists}
                  renderItem={renderArtistItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            )}

            {/* Featured Playlists */}
            {profile.show_playlists && featuredPlaylists.length > 0 && (
              <View style={[styles.section, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
                <Text style={styles.sectionTitle}>Featured Playlists</Text>
                <FlatList
                  data={featuredPlaylists}
                  renderItem={renderPlaylistItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}

        {/* Settings Section */}
        <View style={[styles.section, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.settingLabelContainer}>
              <Settings color="#8b5cf6" size={20} />
              <Text style={styles.settingLabel}>Account Settings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/library')}
          >
            <View style={styles.settingLabelContainer}>
              <Heart color="#8b5cf6" size={20} />
              <Text style={styles.settingLabel}>Liked Songs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={logout}>
            <View style={styles.settingLabelContainer}>
              <LogOut color="#ef4444" size={20} />
              <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Playlist Selector Modal */}
      <Modal
        visible={showPlaylistSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Featured Playlists</Text>
            <TouchableOpacity
              onPress={() => setShowPlaylistSelector(false)}
              style={styles.modalCloseButton}
            >
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {allPlaylists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={[
                  styles.playlistSelectorItem,
                  editForm.featured_playlists.includes(playlist.id) && styles.selectedPlaylistItem
                ]}
                onPress={() => togglePlaylistSelection(playlist.id)}
              >
                <Image
                  source={{
                    uri: playlist.cover_url || 'https://via.placeholder.com/50'
                  }}
                  style={styles.playlistSelectorCover}
                />
                <View style={styles.playlistSelectorInfo}>
                  <Text style={styles.playlistSelectorTitle}>{playlist.title}</Text>
                  <Text style={styles.playlistSelectorCount}>
                    {playlist.track_count} tracks
                  </Text>
                </View>
                {editForm.featured_playlists.includes(playlist.id) && (
                  <Check color="#8b5cf6" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
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
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  displayName: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
    marginTop: 4,
  },
  bio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  editingForm: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginBottom: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  showcaseSettings: {
    width: '100%',
    marginTop: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#fff',
  },
  selectPlaylistsButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  selectPlaylistsText: {
    color: '#8b5cf6',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    // Gradient styling handled by LinearGradient component
  },
  cancelButton: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  section: {
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
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
    color: '#fff',
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  playButton: {
    padding: 8,
  },
  artistItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  artistName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  horizontalList: {
    paddingHorizontal: 4,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  playlistCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  playlistCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: '#374151',
    borderRadius: 16,
  },
  brutalShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  playlistSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  selectedPlaylistItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  playlistSelectorCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  playlistSelectorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistSelectorTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  playlistSelectorCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
});