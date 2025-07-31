import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  Share as ShareIcon,
  Plus,
  Calendar,
  Music,
  Clock,
  MoveVertical as MoreVertical,
} from 'lucide-react-native';

interface SingleData extends Track {}

export default function SingleDetailScreen() {
  const { id } = useLocalSearchParams();
  if (!id || typeof id !== 'string') {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }
  const [single, setSingle] = useState<SingleData | null>(null);
  const [track, setTrack] = useState<SingleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack, toggleLike, likedSongs } = useMusic();

  useEffect(() => {
    if (id) loadSingleDetails();
  }, [id]);

  async function loadSingleDetails() {
    setIsLoading(true);
    setError(null);
    try {
      const singleData = await apiService.getSingleById(id as string);
      setSingle(singleData);
      const prepared: SingleData = {
        id: singleData.id,
        title: singleData.title,
        artist:
          singleData.artist?.name || singleData.artist_name || 'Unknown Artist',
        artistId: singleData.artist_id,
        album: singleData.album?.title || singleData.album || 'Single',
        duration: singleData.duration || 0,
        coverUrl: apiService.getPublicUrl(
          'cover-images',
          singleData.cover_url || singleData.album?.cover_url || '',
        ),
        audioUrl: apiService.getPublicUrl('audio-files', singleData.audio_url),
        isLiked: likedSongs.some((l) => l.id === singleData.id),
        genre: Array.isArray(singleData.genres)
          ? singleData.genres[0]
          : singleData.genre || '',
        releaseDate: singleData.release_date || '',
        playCount: singleData.play_count,
        likeCount: singleData.like_count,
        lyrics: singleData.lyrics,
        description: singleData.description,
        genres: singleData.genres,
      };
      setTrack(prepared);
    } catch (err) {
      console.error(err);
      setError('Failed to load single details');
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlayPause() {
    if (!track?.audioUrl) return;
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, [track]);
    } else {
      playTrack(track, [track]);
    }
  }

  function handleLike() {
    if (track) {
      toggleLike(track.id);
      setTrack({ ...track, isLiked: !track.isLiked });
    }
  }

  function handleAddToQueue() {
    Alert.alert('Added to Queue', `"${track?.title}" added to your queue`);
  }

  function handleShare() {
    if (!single) return;
    Share.share({
      message: `Check out "${single.title}" by ${single.artist}`,
      url: `https://sonix.app/single/${id}`,
    });
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading single...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !track) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Single not found'}</Text>
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

  const formatDuration = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <MoreVertical color="#fff" size={24} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverContainer}>
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>
        </View>
        <View style={styles.metaRow}>
          <Calendar color="#94a3b8" size={16} />
          <Text style={styles.metaText}>{formatDate(track.releaseDate)}</Text>
          <Clock color="#94a3b8" size={16} />
          <Text style={styles.metaText}>{formatDuration(track.duration)}</Text>
          {track.playCount != null && (
            <>
              <Music color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{track.playCount}</Text>
            </>
          )}
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleLike} style={styles.controlBtn}>
            <Heart color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
            {currentTrack?.id === track.id && isPlaying ? (
              <Pause color="#fff" size={32} />
            ) : (
              <Play color="#fff" size={32} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddToQueue}
            style={styles.controlBtn}
          >
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.controlBtn}>
            <ShareIcon color="#fff" size={24} />
          </TouchableOpacity>
        </View>
        {track.lyrics && (
          <View style={styles.lyricsSection}>
            <Text style={styles.lyricsTitle}>Lyrics</Text>
            <Text style={styles.lyricsText}>{track.lyrics}</Text>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 16 },
  errorText: { color: '#ef4444', marginBottom: 16 },
  backButton: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  backButtonText: { color: '#8b5cf6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  iconBtn: { padding: 8 },
  content: { flex: 1 },
  coverContainer: { alignItems: 'center', padding: 24 },
  cover: { width: 280, height: 280, borderRadius: 16, marginBottom: 24 },
  title: { color: '#fff', fontSize: 28, textAlign: 'center', marginBottom: 8 },
  artist: {
    color: '#a855f7',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  metaText: { color: '#94a3b8', marginHorizontal: 6 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsSection: { padding: 24 },
  lyricsTitle: { color: '#fff', fontSize: 20, marginBottom: 12 },
  lyricsText: { color: '#cbd5e1', lineHeight: 24 },
  bottomSpacer: { height: 120 },
});
