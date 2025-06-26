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
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { 
  ArrowLeft, 
  Settings, 
  UserPlus, 
  UserMinus, 
  Lock, 
  Music, 
  Play, 
  Pause,
  Heart,
  Users,
  Calendar,
  Edit3
} from 'lucide-react-native';

interface UserProfile {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePictureUrl?: string;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  topArtists: any[];
  topTracks: any[];
  showcaseStatus?: string;
  showcaseNowPlaying?: string;
  publicPlaylists: any[];
  isFollowing?: boolean;
  hasRequestedFollow?: boolean;
  canView?: boolean;
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
      const profileData = await apiService.getUserProfile(id!);
      setProfile(profileData);
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
      if (profile.isPrivate && !profile.isFollowing) {
        // Send follow request for private accounts
        await apiService.sendFollowRequest(profile.id);
        setProfile(prev => prev ? { ...prev, hasRequestedFollow: true } : null);
        Alert.alert('Request Sent', 'Your follow request has been sent');
      } else if (profile.isFollowing) {
        // Unfollow
        await apiService.unfollowUser(profile.id);
        setProfile(prev => prev ? { 
          ...prev, 
          isFollowing: false, 
          followerCount: Math.max(prev.followerCount - 1, 0) 
        } : null);
      } else {
        // Follow public account
        await apiService.followUser(profile.id);
        setProfile(prev => prev ? { 
          ...prev, 
          isFollowing: true, 
          followerCount: prev.followerCount + 1 
        } : null);
      }
    } catch (error) {
      console.error('Error handling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, profile?.topTracks || []);
      }
    } else {
      playTrack(track, profile?.topTracks || []);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const renderTopTrack = ({ item, index }: { item: any; index: number }) => (
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

  const renderTopArtist = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.topArtistItem}>
      <Image source={{ uri: item.avatarUrl }} style={styles.topArtistAvatar} />
      <Text style={styles.topArtistName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaylist = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.playlistItem}>
      <Image source={{ uri: item.coverUrl }} style={styles.playlistCover} />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistDescription} numberOfLines={1}>
          {item.tracks.length} songs
        </Text>
      </View>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Check if user can view this profile
  if (profile.isPrivate && !profile.canView && !isOwnProfile) {
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
            Follow {profile.displayName} to see their profile
          </Text>
          
          <TouchableOpacity
            style={[styles.followButton, isFollowLoading && styles.followButtonDisabled]}
            onPress={handleFollow}
            disabled={isFollowLoading || profile.hasRequestedFollow}
          >
            <LinearGradient
              colors={profile.hasRequestedFollow ? ['#64748b', '#64748b'] : ['#8b5cf6', '#a855f7']}
              style={styles.followButtonGradient}
            >
              <UserPlus color="#ffffff" size={20} />
              <Text style={styles.followButtonText}>
                {profile.hasRequestedFollow ? 'Request Sent' : 'Request to Follow'}
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
            onPress={() => router.push('/profile/edit')}
          >
            <Edit3 color="#ffffff" size={24} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ 
              uri: profile.profilePictureUrl || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400' 
            }} 
            style={styles.profilePicture} 
          />
          
          <Text style={styles.displayName}>{profile.displayName}</Text>
          
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.publicPlaylists.length}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
          </View>

          {/* Join Date */}
          <View style={styles.joinDate}>
            <Calendar color="#94a3b8" size={16} />
            <Text style={styles.joinDateText}>
              Joined {formatDate(profile.createdAt)}
            </Text>
          </View>

          {/* Follow Button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followButton, isFollowLoading && styles.followButtonDisabled]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              <LinearGradient
                colors={profile.isFollowing ? ['#ef4444', '#dc2626'] : ['#8b5cf6', '#a855f7']}
                style={styles.followButtonGradient}
              >
                {profile.isFollowing ? (
                  <UserMinus color="#ffffff" size={20} />
                ) : (
                  <UserPlus color="#ffffff" size={20} />
                )}
                <Text style={styles.followButtonText}>
                  {isFollowLoading ? 'Loading...' : profile.isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Showcase Status */}
        {profile.showcaseStatus && (
          <View style={styles.showcaseSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.showcaseCard}>
              <Text style={styles.showcaseStatus}>{profile.showcaseStatus}</Text>
              {profile.showcaseNowPlaying && (
                <View style={styles.nowPlayingContainer}>
                  <Music color="#8b5cf6" size={16} />
                  <Text style={styles.nowPlayingText}>{profile.showcaseNowPlaying}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Top Artists */}
        {profile.topArtists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Artists</Text>
            <FlatList
              data={profile.topArtists.slice(0, 5)}
              renderItem={renderTopArtist}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Top Tracks */}
        {profile.topTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Tracks</Text>
            <FlatList
              data={profile.topTracks.slice(0, 5)}
              renderItem={renderTopTrack}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Public Playlists */}
        {profile.publicPlaylists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Public Playlists</Text>
            <FlatList
              data={profile.publicPlaylists}
              renderItem={renderPlaylist}
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
    marginBottom: 24,
    lineHeight: 22,
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
    marginBottom: 8,
  },
  nowPlayingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nowPlayingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
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
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
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
    color: '#ffffff',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  bottomPadding: {
    height: 120,
  },
});