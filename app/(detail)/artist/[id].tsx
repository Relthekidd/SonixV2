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
  Play,
  Pause,
  MoreVertical,
  Users,
  UserPlus,
  UserCheck,
} from 'lucide-react-native';
import TrackList from '@/components/TrackList';

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

interface SingleRow {
  id: string;
  track?: TrackDetailsRow | null;
}

interface AlbumSummary {
  id: string;
  title: string;
  cover_url: string;
}

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
  const [looseTracks, setLooseTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<
    { id: string; title: string; cover_url: string }[]
  >([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  useEffect(() => {
    if (id) loadArtistDetails();
  }, [id]);

  const loadArtistDetails = async () => {
    setIsLoading(true);
    try {
      const [artistInfo, trackRows, singlesData, albumData] = (await Promise.all([
        apiService.getArtistDetails(id!, user?.id),
        apiService.getArtistTracks(id!),
        apiService.getArtistSingles(id!),
        apiService.getArtistAlbums(id!),
      ])) as [ArtistInfo, TrackDetailsRow[], SingleRow[], AlbumSummary[]];

      setArtist({
        id: String(artistInfo.id),
        stage_name: artistInfo.stage_name || artistInfo.name || 'Unknown Artist',
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

      const singleIds = singlesData
        .map((s) => s.track?.id)
        .filter(Boolean) as string[];
      const singleTracks = allTracks.filter((t) => singleIds.includes(t.id));
      const loose = allTracks.filter(
        (t) => !t.albumId && !singleIds.includes(t.id),
      );
      setSingles(singleTracks);
      setLooseTracks(loose);

      const top = [...allTracks]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 5);
      setTopTracks(top);

      setAlbums(albumData);
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
    isLiked: false,
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

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, tracks);
      }
    } else {
      playTrack(track, tracks);
    }
  };

  const handlePlayAll = () => {
    if (!tracks.length) return;
    const first = tracks[0];
    if (currentTrack?.id === first.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(first, tracks);
      }
    } else {
      playTrack(first, tracks);
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
          <TouchableOpacity>
            <MoreVertical color="#fff" size={24} />
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

        <View style={styles.playAllContainer}>
          <TouchableOpacity
            style={[
              styles.playAllButton,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
            onPress={handlePlayAll}
          >
            {currentTrack?.id === tracks[0]?.id && isPlaying ? (
              <Pause size={24} color="#8b5cf6" />
            ) : (
              <Play size={24} color="#8b5cf6" />
            )}
            <Text style={styles.playAllText}>
              {currentTrack?.id === tracks[0]?.id && isPlaying
                ? 'Pause'
                : 'Play All'}
            </Text>
          </TouchableOpacity>
        </View>

        {topTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Songs</Text>
            <TrackList
              tracks={topTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlay={handleTrackPress}
            />
          </View>
        )}

        {albums.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Albums</Text>
            <View style={styles.albumsContainer}>
              {albums.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.albumCard,
                    styles.glassCard,
                    styles.brutalBorder,
                    styles.brutalShadow,
                  ]}
                  onPress={() => router.push(`/album/${a.id}` as const)}
                >
                  <Image source={{ uri: a.cover_url }} style={styles.albumCover} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {a.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {singles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Singles</Text>
            <TrackList
              tracks={singles}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlay={handleTrackPress}
            />
          </View>
        )}

        {looseTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loose Tracks</Text>
            <TrackList
              tracks={looseTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlay={handleTrackPress}
            />
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
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 8,
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
  playAllContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  playAllText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 16,
  },
  albumsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumCard: {
    width: '48%',
    marginBottom: 16,
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

