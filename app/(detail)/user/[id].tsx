import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { useMusic, Track } from '@/providers/MusicProvider';
import {
  ArrowLeft,
  Settings,
  UserPlus,
  UserMinus,
  Lock,
  Play,
  Pause,
  Calendar,
  Globe,
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
  top_artists: { id: string; name: string; avatar_url: string }[];
  top_songs: Track[];
  status_text?: string;
  pinned_content_type?: string;
  pinned_content_id?: string;
  is_following: boolean;
  has_pending_request: boolean;
  can_view: boolean;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc(
        'get_user_profile_with_stats',
        { target_user_id: id },
      );

      if (error) {
        console.error('Error loading user profile:', error);
        setError('Failed to load user profile');
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || !user) return;

    setIsFollowLoading(true);
    try {
      if (profile.is_following) {
        // Unfollow
        const { error } = await supabase.rpc('unfollow_user', {
          target_user_id: profile.id,
        });

        if (error) throw error;

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                follower_count: Math.max(prev.follower_count - 1, 0),
              }
            : null,
        );
      } else {
        // Follow or send follow request
        const { error } = await supabase.rpc('send_follow_request', {
          target_user_id: profile.id,
        });

        if (error) throw error;

        if (profile.is_private) {
          setProfile((prev) =>
            prev ? { ...prev, has_pending_request: true } : null,
          );
          Alert.alert('Request Sent', 'Your follow request has been sent');
        } else {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  is_following: true,
                  follower_count: prev.follower_count + 1,
                }
              : null,
          );
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error handling follow:', err);
      Alert.alert('Error', err.message || 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const renderTopTrack = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.topTrackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Text style={styles.topTrackRank}>{index + 1}</Text>
      <Image source={{ uri: item.coverUrl }} style={styles.topTrackCover} />
      <View style={styles.topTrackInfo}>
        <Text style={styles.topTrackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.topTrackArtist} numberOfLines={1}>
          {item.artist}
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

  const renderTopArtist = ({
    item,
  }: {
    item: { id: string; name: string; avatar_url: string };
  }) => (
    <TouchableOpacity style={styles.topArtistItem}>
      <Image source={{ uri: item.avatar_url }} style={styles.topArtistAvatar} />
      <Text style={styles.topArtistName} numberOfLines={1}>
        {item.name}
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

  if (error || !profile) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Check if user can view this profile
  if (profile.is_private && !profile.can_view && !isOwnProfile) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#ffffff" size={24} />
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.privateContainer}>
          <Lock color="#64748b" size={64} />
          <Text style={styles.privateTitle}>This Account is Private</Text>
          <Text style={styles.privateText}>
            Follow {profile.display_name} to see their profile
          </Text>

          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowLoading && styles.followButtonDisabled,
            ]}
            onPress={handleFollow}
            disabled={isFollowLoading || profile.has_pending_request}
          >
            <LinearGradient
              colors={
                profile.has_pending_request
                  ? ['#64748b', '#64748b']
                  : ['#8b5cf6', '#a855f7']
              }
              style={styles.followButtonGradient}
            >
              <UserPlus color="#ffffff" size={20} />
              <Text style={styles.followButtonText}>
                {profile.has_pending_request
                  ? 'Request Sent'
                  : 'Request to Follow'}
              </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>

        {isOwnProfile && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Settings color="#ffffff" size={24} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri:
                profile.profile_picture_url ||
                'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            style={styles.profilePicture}
          />

          <Text style={styles.displayName}>{profile.display_name}</Text>

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Privacy Indicator */}
          <View style={styles.privacyIndicator}>
            {profile.is_private ? (
              <>
                <Lock color="#f59e0b" size={16} />
                <Text style={styles.privacyText}>Private Account</Text>
              </>
            ) : (
              <>
                <Globe color="#10b981" size={16} />
                <Text style={[styles.privacyText, { color: '#10b981' }]}>
                  Public Account
                </Text>
              </>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.follower_count}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Join Date */}
          <View style={styles.joinDate}>
            <Calendar color="#94a3b8" size={16} />
            <Text style={styles.joinDateText}>
              Joined {formatDate(profile.created_at)}
            </Text>
          </View>

          {/* Follow Button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowLoading && styles.followButtonDisabled,
              ]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              <LinearGradient
                colors={
                  profile.is_following
                    ? ['#ef4444', '#dc2626']
                    : ['#8b5cf6', '#a855f7']
                }
                style={styles.followButtonGradient}
              >
                {profile.is_following ? (
                  <UserMinus color="#ffffff" size={20} />
                ) : (
                  <UserPlus color="#ffffff" size={20} />
                )}
                <Text style={styles.followButtonText}>
                  {isFollowLoading
                    ? 'Loading...'
                    : profile.is_following
                      ? 'Unfollow'
                      : 'Follow'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Showcase Status */}
        {profile.status_text && (
          <View style={styles.showcaseSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.showcaseCard}>
              <Text style={styles.showcaseStatus}>{profile.status_text}</Text>
            </View>
          </View>
        )}

        {/* Top Artists */}
        {profile.top_artists && profile.top_artists.length > 0 && (
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

        {/* Top Tracks */}
        {profile.top_songs && profile.top_songs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Tracks</Text>
            <FlatList
              data={profile.top_songs.slice(0, 5)}
              renderItem={renderTopTrack}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
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
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  backButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  privateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  privateTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  privateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#8b5cf6',
  },
  displayName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
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
    color: '#f59e0b',
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
  followButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  followButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  showcaseSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  showcaseCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  showcaseStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    lineHeight: 22,
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
  },
  topTrackPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 120,
  },
});
