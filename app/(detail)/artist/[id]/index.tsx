import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusic, Track } from '@/providers/MusicProvider';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserCheck,
  Play,
  Pause,
} from 'lucide-react-native';
import MiniTrackCard from '@/components/MiniTrackCard';

interface Artist {
  id: string;
  stage_name: string;
  avatar_url?: string;
  bio?: string;
  monthly_listeners?: number;
  total_plays?: number;
  genres?: string[];
}

interface TrackDetailsRow {
  id: string;
  title: string;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  album_id?: string | null;
  album?: { title?: string; cover_url?: string | null } | null;
  duration?: number | null;
  cover_url?: string | null;
  audio_url: string;
  genres?: string[] | string | null;
  release_date?: string | null;
  play_count?: number | null;
  track_number?: number | null;
  like_count?: number | null;
  lyrics?: string | null;
  featured_artists?: { id: string; name: string }[];
}

interface AlbumSummary {
  id: string;
  title: string;
  cover_url: string;
  release_date: string;
}

type RecentRelease =
  | { type: 'album'; item: AlbumSummary }
  | { type: 'track'; item: Track };

interface ArtistInfo extends Artist {
  follower_count?: number | null;
  is_following?: boolean;
  name?: string | null;
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [singles, setSingles] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [appearsOn, setAppearsOn] = useState<Track[]>([]);
  const [recentRelease, setRecentRelease] = useState<RecentRelease | null>(
    null,
  );
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack, likedSongIds } =
    useMusic();

  useEffect(() => {
    if (id) loadArtistDetails();
  }, [id]);

  const loadArtistDetails = async () => {
    setIsLoading(true);
    try {
      const [artistInfo, trackRows, albumData, appearsData] =
        (await Promise.all([
          apiService.getArtistDetails(id!, user?.id),
          apiService.getArtistTracks(id!),
          apiService.getArtistAlbums(id!),
          apiService.getArtistAppearances(id!),
        ])) as [
          ArtistInfo,
          TrackDetailsRow[],
          AlbumSummary[],
          TrackDetailsRow[],
        ];

      setArtist({
        id: String(artistInfo.id),
        stage_name:
          artistInfo.stage_name || artistInfo.name || 'Unknown Artist',
        avatar_url: artistInfo.avatar_url || undefined,
        bio: artistInfo.bio || undefined,
        monthly_listeners: artistInfo.monthly_listeners ?? 0,
        total_plays: artistInfo.total_plays ?? 0,
        genres: Array.isArray(artistInfo.genres)
          ? artistInfo.genres.map(String)
          : [],
      });
      setFollowerCount(artistInfo.follower_count || 0);
      setIsFollowing(artistInfo.is_following || false);

      const allTracks = trackRows.map(transformTrack);
      setTracks(allTracks);

      const singleTracks = allTracks
        .filter((t) => !t.albumId)
        .sort(
          (a, b) =>
            new Date(b.releaseDate).getTime() -
            new Date(a.releaseDate).getTime(),
        );
      setSingles(singleTracks);

      const top = [...allTracks]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10);
      setTopTracks(top);

      setAlbums(albumData);

      const appears = appearsData.map(transformTrack);
      setAppearsOn(appears);

      const latestTrack = allTracks
        .slice()
        .sort(
          (a, b) =>
            new Date(b.releaseDate).getTime() -
            new Date(a.releaseDate).getTime(),
        )[0];
      const latestAlbum = albumData[0];
      let recent: RecentRelease | null = null;
      if (latestAlbum && latestTrack) {
        const albumDate = new Date(latestAlbum.release_date).getTime();
        const trackDate = new Date(latestTrack.releaseDate).getTime();
        if (albumDate >= trackDate) {
          recent = { type: 'album', item: latestAlbum };
        } else {
          recent = { type: 'track', item: latestTrack };
        }
      } else if (latestAlbum) {
        recent = { type: 'album', item: latestAlbum };
      } else if (latestTrack) {
        recent = { type: 'track', item: latestTrack };
      }
      setRecentRelease(recent);
    } catch (err) {
      console.error(err);
      setError('Failed to load artist data');
    } finally {
      setIsLoading(false);
    }
  };

  const transformTrack = (t: TrackDetailsRow): Track => ({
    id: t.id,
    title: t.title,
    artist: t.artist?.name || 'Unknown',
    artistId: t.artist_id || undefined,
    album: t.album?.title || 'Unknown Album',
    albumId: t.album_id || undefined,
    duration: t.duration ?? 0,
    coverUrl:
      t.cover_url ||
      t.album?.cover_url ||
      'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: t.audio_url,
    isLiked: likedSongIds.includes(t.id),
    genre: Array.isArray(t.genres)
      ? String(t.genres[0] || '')
      : typeof t.genres === 'string'
        ? t.genres
        : '',
    genres: Array.isArray(t.genres) ? t.genres : t.genres ? [t.genres] : [],
    releaseDate: t.release_date || '',
    playCount: t.play_count ?? 0,
    likeCount: t.like_count ?? 0,
    trackNumber: t.track_number ?? undefined,
    lyrics: t.lyrics ?? undefined,
    featuredArtists: t.featured_artists || [],
  });

  const handleTrackPress = (track: Track, list: Track[] = tracks) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, list);
      }
    } else {
      playTrack(track, list);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) return;
    try {
      await apiService.toggleArtistFollow(user.id, id!, isFollowing);
      setIsFollowing(!isFollowing);
      setFollowerCount((c) => c + (isFollowing ? -1 : 1));
    } catch (err) {
      console.error(err);
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

  if (error || !artist) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <Text style={styles.errorText}>{error || 'Artist not found'}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.artistInfo}>
          {artist.avatar_url ? (
            <Image source={{ uri: artist.avatar_url }} style={styles.avatar} />
          ) : (
            <Users color="#fff" size={80} />
          )}
          <Text style={styles.artistName}>{artist.stage_name}</Text>
          {artist.bio && <Text style={styles.artistBio}>{artist.bio}</Text>}
          <Text style={styles.artistStats}>
            {followerCount.toLocaleString()} followers •{' '}
            {artist.monthly_listeners?.toLocaleString()} listeners •{' '}
            {artist.total_plays?.toLocaleString()} plays
          </Text>
          <TouchableOpacity
            style={[
              styles.followButton,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
            onPress={handleToggleFollow}
          >
            {isFollowing ? (
              <UserCheck color="#8b5cf6" size={20} />
            ) : (
              <UserPlus color="#8b5cf6" size={20} />
            )}
            <Text style={styles.followText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {recentRelease && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most Recent Release</Text>
            {recentRelease.type === 'track' ? (
              <View
                style={[
                  styles.featuredContainer,
                  styles.glassCard,
                  styles.brutalBorder,
                  styles.brutalShadow,
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/track/${recentRelease.item.id}` as const)
                  }
                >
                  <Image
                    source={{ uri: recentRelease.item.coverUrl }}
                    style={styles.featuredCover}
                  />
                </TouchableOpacity>
                <Text style={styles.featuredTitle}>
                  {recentRelease.item.title}
                </Text>
                <Text style={styles.featuredArtist}>
                  {recentRelease.item.artist}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    styles.brutalBorder,
                    styles.brutalShadow,
                  ]}
                  onPress={() =>
                    handleTrackPress(recentRelease.item, [recentRelease.item])
                  }
                >
                  {currentTrack?.id === recentRelease.item.id && isPlaying ? (
                    <Pause color="#fff" size={24} />
                  ) : (
                    <Play color="#fff" size={24} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.featuredContainer,
                  styles.glassCard,
                  styles.brutalBorder,
                  styles.brutalShadow,
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/album/${recentRelease.item.id}` as const)
                  }
                >
                  <Image
                    source={{ uri: recentRelease.item.cover_url }}
                    style={styles.featuredCover}
                  />
                </TouchableOpacity>
                <Text style={styles.featuredTitle}>
                  {recentRelease.item.title}
                </Text>
                <Text style={styles.featuredArtist}>{artist?.stage_name}</Text>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    styles.brutalBorder,
                    styles.brutalShadow,
                  ]}
                  onPress={() =>
                    router.push(`/album/${recentRelease.item.id}` as const)
                  }
                >
                  <Play color="#fff" size={24} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {topTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Songs</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalScroll, { paddingHorizontal: spacing.md }]}
            >
              {topTracks.slice(0, 5).map((t) => (
                <MiniTrackCard
                  key={t.id}
                  track={t}
                  isCurrent={currentTrack?.id === t.id}
                  isPlaying={isPlaying}
                  onPlay={() => handleTrackPress(t, topTracks)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {singles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Singles</Text>
              <TouchableOpacity
                onPress={() => router.push(`/artist/${id}/singles` as const)}
              >
                <Text style={styles.showAll}>Show All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalScroll, { paddingHorizontal: spacing.md }]}
            >
              {singles.slice(0, 5).map((t) => (
                <MiniTrackCard
                  key={t.id}
                  track={t}
                  isCurrent={currentTrack?.id === t.id}
                  isPlaying={isPlaying}
                  onPlay={() => handleTrackPress(t, singles)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {albums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Albums</Text>
              <TouchableOpacity
                onPress={() => router.push(`/artist/${id}/albums` as const)}
              >
                <Text style={styles.showAll}>Show All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalScroll, { paddingHorizontal: spacing.md }]}
            >
              {albums.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.albumCard,
                    styles.glassCard,
                    styles.brutalBorder,
                    styles.brutalShadow,
                  ]}
                  onPress={() => router.push(`/album/${item.id}` as const)}
                >
                  <Image
                    source={{ uri: item.cover_url }}
                    style={styles.albumCover}
                  />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.albumDate}>
                    {new Date(item.release_date).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {appearsOn.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Appears On</Text>
              <TouchableOpacity
                onPress={() => router.push(`/artist/${id}/appears-on` as const)}
              >
                <Text style={styles.showAll}>Show All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalScroll, { paddingHorizontal: spacing.md }]}
            >
              {appearsOn.slice(0, 5).map((t) => (
                <MiniTrackCard
                  key={t.id}
                  track={t}
                  isCurrent={currentTrack?.id === t.id}
                  isPlaying={isPlaying}
                  onPlay={() => handleTrackPress(t, appearsOn)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  scroll: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  artistInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  artistBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  followText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  showAll: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
  },
  featuredContainer: {
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  featuredCover: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  featuredArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  playButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  horizontalScroll: {
    paddingRight: spacing.md,
  },
  albumCard: {
    width: 160,
    marginRight: 16,
    borderRadius: 12,
    padding: 8,
  },
  albumCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  albumDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 4,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
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
