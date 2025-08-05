import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusic, Track, TrackRow } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Play, Pause, MoreVertical, Users } from 'lucide-react-native';

interface Artist {
  id: string;
  stage_name: string;
  avatar_url?: string;
  bio?: string;
  monthly_listeners?: number;
  total_plays?: number;
  genres?: string[];
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  useEffect(() => {
    if (id) loadArtistDetails();
  }, [id]);

  const loadArtistDetails = async () => {
    setIsLoading(true);
    try {
      const [artistData, tracksData] = await Promise.all([
        apiService.getArtistById(id!),
        apiService.getArtistTracks(id!),
      ]);

      type RawArtist = {
        id?: string | number;
        stage_name?: string | null;
        name?: string | null;
        avatar_url?: string | null;
        bio?: string | null;
        monthly_listeners?: number | null;
        total_plays?: number | null;
        genres?: unknown;
      };

      const artistRaw = artistData as RawArtist;
      setArtist({
        id: String(artistRaw.id),
        stage_name: artistRaw.stage_name || artistRaw.name || 'Unknown Artist',
        avatar_url: artistRaw.avatar_url || undefined,
        bio: artistRaw.bio || undefined,
        monthly_listeners: artistRaw.monthly_listeners ?? 0,
        total_plays: artistRaw.total_plays ?? 0,
        genres: Array.isArray(artistRaw.genres)
          ? artistRaw.genres.map(String)
          : [],
      });

      setTracks((tracksData as TrackRow[]).map(transformTrack));
    } catch (err) {
      console.error(err);
      setError('Failed to load artist data');
    } finally {
      setIsLoading(false);
    }
  };

  const transformTrack = (t: TrackRow): Track => ({
    id: t.id,
    title: t.title,
    artist: t.artist?.name || t.artist_name || 'Unknown',
    album: t.album?.title || t.album_title || 'Unknown Album',
    duration: t.duration ?? 0,
    coverUrl:
      t.cover_url ||
      t.album?.cover_url ||
      'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
    isLiked: false,
    genre: Array.isArray(t.genres)
      ? String(t.genres[0])
      : typeof t.genres === 'string'
        ? t.genres
        : '',
    releaseDate: t.release_date || '',
    playCount: t.play_count ?? 0,
    likeCount: t.like_count ?? 0,
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
        <Text style={styles.artistStats}>
          {artist.monthly_listeners?.toLocaleString()} listeners •{' '}
          {artist.total_plays?.toLocaleString()} plays
        </Text>
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

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.trackItem}
            onPress={() => handleTrackPress(item)}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
            <View style={styles.trackDetails}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.trackAlbum} numberOfLines={1}>
                {item.album}
              </Text>
            </View>
            <TouchableOpacity>
              {currentTrack?.id === item.id && isPlaying ? (
                <Pause color="#8b5cf6" size={20} />
              ) : (
                <Play color="#8b5cf6" size={20} />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.trackList}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  artistStats: {
    fontSize: 14,
    color: '#ccc',
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
  trackList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  trackAlbum: {
    fontSize: 12,
    color: '#aaa',
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
