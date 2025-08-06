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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { Track, Playlist } from '@/providers/MusicProvider';
import { supabase } from '@/services/supabase';
import { CreditCard as Edit3, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  bio?: string;
  profile_picture_url?: string;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  show_top_songs?: boolean;
  show_playlists?: boolean;
}

function ProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showTopSongs, setShowTopSongs] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [topSongs, setTopSongs] = useState<Track[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) throw new Error('No user');

      const { data, error } = await supabase.rpc(
        'get_user_profile_with_stats',
        { target_user_id: uid },
      );
      if (error) throw error;
      const profileData = data && data.length > 0 ? data[0] : null;
      if (!profileData) throw new Error('Profile not found');

      setProfile(profileData);
      setDisplayName(profileData.display_name ?? '');
      setAvatarUrl(profileData.profile_picture_url ?? '');
      setBio(profileData.bio ?? '');
      setIsPrivate(profileData.is_private ?? false);
      setShowTopSongs(profileData.show_top_songs ?? true);
      setShowPlaylists(profileData.show_playlists ?? true);
      setFollowers(profileData.follower_count ?? 0);
      setFollowing(profileData.following_count ?? 0);
      setTopSongs(profileData.top_songs || []);

      const { data: playlistsRes } = await supabase
        .from('playlists')
        .select('id,title,cover_url')
        .eq('user_id', uid)
        .eq('is_public', true);

      const publicPls = (playlistsRes || []).map((p) => ({
        id: p.id,
        title: p.title,
        tracks: [],
        coverUrl: p.cover_url || '',
      }));
      setPublicPlaylists(publicPls);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const profileUpdates = {
        bio,
        profile_picture_url: avatarUrl,
        is_private: isPrivate,
        show_top_songs: showTopSongs,
        show_playlists: showPlaylists,
      };
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profile.id);
      if (error) throw error;

      if (displayName !== profile.display_name) {
        const { error: userErr } = await supabase
          .from('users')
          .update({ display_name: displayName })
          .eq('id', profile.id);
        if (userErr) throw userErr;
      }

      setProfile({ ...profile, ...profileUpdates, display_name: displayName });
      setEditing(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacy = async () => {
    if (!profile) return;
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    const { error } = await supabase
      .from('profiles')
      .update({ is_private: newVal })
      .eq('id', profile.id);
    if (!error) setProfile({ ...profile, is_private: newVal });
  };

  const toggleShowTopSongs = async () => {
    if (!profile) return;
    const newVal = !showTopSongs;
    setShowTopSongs(newVal);
    const { error } = await supabase
      .from('profiles')
      .update({ show_top_songs: newVal })
      .eq('id', profile.id);
    if (!error) setProfile({ ...profile, show_top_songs: newVal });
  };

  const toggleShowPlaylists = async () => {
    if (!profile) return;
    const newVal = !showPlaylists;
    setShowPlaylists(newVal);
    const { error } = await supabase
      .from('profiles')
      .update({ show_playlists: newVal })
      .eq('id', profile.id);
    if (!error) setProfile({ ...profile, show_playlists: newVal });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
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

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.header,
            styles.glassCard,
            styles.brutalBorder,
            styles.brutalShadow,
          ]}
        >
          <Image
            source={{
              uri:
                avatarUrl ||
                profile.profile_picture_url ||
                'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200',
            }}
            style={styles.avatar}
          />
          {editing ? (
            <>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                placeholder="Avatar URL"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={bio}
                onChangeText={setBio}
                placeholder="Bio"
                placeholderTextColor="#64748b"
              />
              <View style={styles.editRow}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: '#8b5cf6' }]}
                  onPress={saveProfile}
                >
                  <Text style={styles.editText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.editText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>{displayName}</Text>
              {bio ? <Text style={styles.bio}>{bio}</Text> : null}
              <Text style={styles.email}>{profile.email}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statText}>{followers} Followers</Text>
                <Text style={styles.statText}>{following} Following</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Edit3 color="#fff" size={16} />
                <Text style={styles.editText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {topSongs.length > 0 && showTopSongs && (
          <View
            style={[
              styles.section,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
          >
            <Text style={styles.sectionTitle}>Top Songs</Text>
            {topSongs.map((s) => (
              <Text key={s.id} style={{ color: '#fff' }}>
                {s.title} - {s.artist}
              </Text>
            ))}
          </View>
        )}

        {publicPlaylists.length > 0 && showPlaylists && (
          <View
            style={[
              styles.section,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
          >
            <Text style={styles.sectionTitle}>Public Playlists</Text>
            {publicPlaylists.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => router.push(`/library?playlist=${p.id}`)}
              >
                <Text style={{ color: '#8b5cf6' }}>{p.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View
          style={[
            styles.section,
            styles.glassCard,
            styles.brutalBorder,
            styles.brutalShadow,
          ]}
        >
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Private Account</Text>
            <Switch value={isPrivate} onValueChange={togglePrivacy} />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show Top Songs</Text>
            <Switch value={showTopSongs} onValueChange={toggleShowTopSongs} />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show Playlists</Text>
            <Switch value={showPlaylists} onValueChange={toggleShowPlaylists} />
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
  content: { padding: 24, paddingBottom: 80 },
  header: { alignItems: 'center', padding: 24, paddingTop: 60 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#fff' },
  email: { color: '#94a3b8', fontFamily: 'Inter-Regular', marginTop: 4 },
  bio: {
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statText: {
    color: '#fff',
    fontFamily: 'Inter-Medium',
  },
  editRow: { flexDirection: 'row', gap: 12 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
  },
  editText: { color: '#fff', fontFamily: 'Inter-Medium', marginLeft: 6 },
  section: { marginBottom: 32, padding: 24 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 16,
  },
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
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brutalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default withAuthGuard(ProfileScreen);
