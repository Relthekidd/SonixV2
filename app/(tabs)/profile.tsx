import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { useMusic } from '@/providers/MusicProvider';
import { Edit3, LogOut, Play, Pause } from 'lucide-react-native';

interface UserProfile {
  id: string;
  display_name: string;
  bio?: string;
  profile_picture_url?: string;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  top_artists: any[];
  top_songs: any[];
}

function ProfileScreen() {
  const { user, logout } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || user?.id;
      if (uid) {
        await loadProfile(uid);
      } else {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  const loadProfile = async (uid: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'get_user_profile_with_stats',
        { target_user_id: uid },
      );
      if (error) throw error;
      if (data && data.length) {
        const p = data[0] as UserProfile;
        setProfile(p);
        setIsPrivate(p.is_private);
        setNewName(p.display_name);
        setNewBio(p.bio || '');
        return;
      }
      // fallback to basic profile
      const { data: prof } = await supabase
        .from('users')
        .select(
          'id, email, display_name, bio, profile_picture_url, is_private'
        )
        .eq('id', uid)
        .single();
      if (prof) {
        setProfile({
          id: prof.id,
          display_name: prof.display_name || prof.email,
          bio: prof.bio || '',
          profile_picture_url: prof.profile_picture_url || '',
          is_private: prof.is_private || false,
          follower_count: 0,
          following_count: 0,
          top_artists: [],
          top_songs: [],
        });
        setIsPrivate(!!prof.is_private);
        setNewName(prof.display_name || prof.email);
        setNewBio(prof.bio || '');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  }, []);

  const togglePrivacy = async () => {
    if (!user) return;
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    await supabase
      .from('users')
      .update({ is_private: newVal })
      .eq('id', user.id);
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, profile?.top_songs || []);
    } else {
      playTrack(track, profile?.top_songs || []);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>Profile not found</Text>
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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={{
              uri:
                profile.profile_picture_url ||
                'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200',
            }}
            style={styles.avatar}
          />
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Display name"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={newBio}
                onChangeText={setNewBio}
                placeholder="Bio"
                placeholderTextColor="#64748b"
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: '#8b5cf6' }]}
                  onPress={async () => {
                    if (!user) return;
                    await supabase
                      .from('users')
                      .update({ display_name: newName, bio: newBio })
                      .eq('id', user.id);
                    setProfile({
                      ...(profile as UserProfile),
                      display_name: newName,
                      bio: newBio,
                    });
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.editText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.editText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>{profile.display_name}</Text>
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Edit3 color="#fff" size={16} />
                <Text style={styles.editText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Favorites */}
        {profile.top_songs?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Songs</Text>
            {profile.top_songs.slice(0, 5).map((song) => (
              <TouchableOpacity
                key={song.id}
                style={styles.songRow}
                onPress={() => handleTrackPress(song)}
              >
                <Image
                  source={{ uri: song.cover_url }}
                  style={styles.songCover}
                />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
                <TouchableOpacity>
                  {currentTrack?.id === song.id && isPlaying ? (
                    <Pause color="#8b5cf6" size={20} />
                  ) : (
                    <Play color="#8b5cf6" size={20} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {profile.top_artists?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Followed Artists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.top_artists.slice(0, 5).map((artist) => (
                <View key={artist.id} style={styles.artistCard}>
                  <Image
                    source={{ uri: artist.avatar_url }}
                    style={styles.artistAvatar}
                  />
                  <Text style={styles.artistName} numberOfLines={1}>
                    {artist.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Private Account</Text>
            <Switch value={isPrivate} onValueChange={togglePrivacy} />
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={logout}>
            <LogOut color="#ef4444" size={20} />
            <Text
              style={[styles.settingLabel, { color: '#ef4444', marginLeft: 8 }]}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff' },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', padding: 24, paddingTop: 60 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#fff' },
  bio: {
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
  },
  editText: { color: '#fff', fontFamily: 'Inter-Medium', marginLeft: 6 },
  section: { marginBottom: 32, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
  },
  songCover: { width: 50, height: 50, borderRadius: 6 },
  songInfo: { flex: 1, marginLeft: 12 },
  songTitle: { color: '#fff', fontFamily: 'Inter-SemiBold' },
  songArtist: { color: '#94a3b8', fontFamily: 'Inter-Regular', fontSize: 12 },
  artistCard: { alignItems: 'center', marginRight: 16, width: 80 },
  artistAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  artistName: { color: '#fff', fontSize: 12, textAlign: 'center' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLabel: { color: '#fff', fontFamily: 'Inter-Regular', fontSize: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
    width: '100%',
  },
});

export default withAuthGuard(ProfileScreen);
