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
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { 
  Edit3, 
  Settings, 
  LogOut, 
  User as UserIcon, 
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

function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: '',
    firstName: '',
    lastName: '',
    bio: '',
    isPrivate: false,
    statusText: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<ProfileFormData>>({});

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

  useEffect(() => {
    if (user) loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (profile && !isLoading) {
      setShowSetupPrompt(!profile.display_name || !profile.bio);
    }
  }, [profile, isLoading]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_profile_with_stats', { target_user_id: user!.id });
      if (error) { Alert.alert('Error', 'Failed to load profile'); return; }
      if (data?.length) setProfile(data[0]);
      else await createInitialProfile();
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally { setIsLoading(false); }
  };

  const createInitialProfile = async () => {
    if (!user) return;
    await supabase.from('profiles').insert({$1id: user!.id,
      display_name: user.displayName || 'User',
      is_private: false,
      profile_completed: false,
    });
    loadUserProfile();
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadUserProfile();
    setIsRefreshing(false);
  }, []);

  const validateForm = (): boolean => {
    const errs: Partial<ProfileFormData> = {};
    if (!formData.displayName.trim()) errs.displayName = 'Required';
    if (formData.bio.length > 500) errs.bio = 'Max 500 chars';
    if (formData.statusText.length > 200) errs.statusText = 'Max 200 chars';
    setFormErrors(errs);
    return !Object.keys(errs).length;
  };

  const updateFormData = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1] });
    if (!res.canceled) setAvatarFile(res.assets[0]);
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return Alert.alert('Fix errors');
    setIsSaving(true);
    let avatarUrl = profile?.profile_picture_url;
    if (avatarFile && user) {
      const ext = avatarFile.name?.split('.').pop() || 'jpg';
      const { url } = await uploadImage(avatarFile, `images/avatars/${user!.id}.${ext}`);
      avatarUrl = url;
    }
    await supabase.from('profiles').update({
      display_name: formData.displayName,
      first_name: formData.firstName,
      last_name: formData.lastName,
      bio: formData.bio,
      is_private: formData.isPrivate,
      profile_picture_url: avatarUrl,
      status_text: formData.statusText || null,
      profile_completed: true,
    }) .eq('id', user!.id);
    await updateProfile({ displayName: formData.displayName, firstName: formData.firstName, lastName: formData.lastName, bio: formData.bio, isPrivate: formData.isPrivate, profile_picture_url: avatarUrl });
    setIsEditing(false);
    setAvatarFile(null);
    setShowSetupPrompt(false);
    loadUserProfile();
    setIsSaving(false);
    Alert.alert('Success','Profile updated!');
  };

  const handleLogout = () => Alert.alert('Logout','Sure?',[{ text:'Cancel'},{ text:'Logout', onPress:logout }]);
  const handleTrackPress = (track: any) => {
    if (currentTrack?.id===track.id) isPlaying ? pauseTrack() : playTrack(track, profile?.top_songs||[]);
    else playTrack(track, profile?.top_songs||[]);
  };

  if (isLoading) return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <ActivityIndicator size="large" color="#8b5cf6" />
    </LinearGradient>
  );

  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
        {showSetupPrompt && (
          <View style={styles.setupPrompt}>{/* ... */}</View>
        )}
        {/* rest of profile UI... */}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex:1,justifyContent:'center',alignItems:'center' },
  setupPrompt: { padding:20, backgroundColor:'rgba(245,158,11,0.1)', margin:16, borderRadius:12 },
  /* ... include all other needed style definitions from original file ... */
});

export default withAuthGuard(ProfileScreen);
