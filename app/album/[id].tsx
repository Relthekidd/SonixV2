import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  MoreVertical,
  Share as ShareIcon,
} from 'lucide-react-native';

function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    toggleLike,
    likedSongs,
    addToPlaylist,
    playlists,
  } = useMusic();

  useEffect(() => {
    if (id) loadAlbumDetails();
  }, [id]);

  const loadAlbumDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // fetch album with new apiService.getAlbumById
      const albumData = await apiService.getAlbumById(id!);
      setAlbum(albumData);

      const transformed = (albumData.tracks || []).map(
        (t: any, idx: number) =>
          ({
            id: t.id,
            title: t.title,
            artist: albumData.artist || 'Unknown',
            artistId: t.artist_id || albumData.artist_id,
            album: albumData.title,
            duration: t.duration || 0,
            coverUrl: apiService.getPublicUrl('cover-images', albumData.cover_url),
            audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
            isLiked: likedSongs.some((l) => l.id === t.id),
            trackNumber: t.track_number ?? idx + 1,
            playCount: t.play_count,
            likeCount: t.like_count,
            lyrics: t.lyrics,
          }) as Track,
      );

      // sort with explicit any types
      transformed.sort((a: any, b: any) => a.trackNumber - b.trackNumber);

      setTracks(transformed);
    } catch (err) {
      console.error(err);
      setError('Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, tracks);
    } else {
      playTrack(track, tracks);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading album...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !album) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Album not found'}</Text>
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

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            /* more options */
          }}
          style={styles.headerButton}
        >
          <MoreVertical size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tracks.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.trackItem}
            onPress={() => handleTrackPress(item)}
          >
            <View style={styles.trackNumber}>
              <Text style={styles.trackNumberText}>{item.trackNumber}</Text>
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.trackMeta}>
                <Text style={styles.trackDuration}>
                  {Math.floor(item.duration / 60)}:
                  {(item.duration % 60).toString().padStart(2, '0')}
                </Text>
                {item.playCount != null && (
                  <Text style={styles.trackStats}>• {item.playCount}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => toggleLike(item.id)}
            >
              <Heart
                color={item.isLiked ? '#ef4444' : '#94a3b8'}
                size={20}
                fill={item.isLiked ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton}>
              {currentTrack?.id === item.id && isPlaying ? (
                <Pause size={20} color="#8b5cf6" />
              ) : (
                <Play size={20} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

export default withAuthGuard(AlbumDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
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
    padding: 20,
    paddingTop: 60,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
  },
  trackNumber: { width: 24, alignItems: 'center' },
  trackNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#ffffff' },
  trackMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trackDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  trackStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginLeft: 4,
  },
  likeButton: { padding: 8 },
  playButton: { padding: 8 },
});
