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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { supabase } from '@/services/supabase';
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

export default function TrackDetailScreen() {

  const router = useRouter();
  const { id } = useLocalSearchParams();
  if (!id || typeof id !== 'string') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  const [track, setTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack, toggleLike, likedSongs } = useMusic();

  useEffect(() => {
    if (id) loadTrackDetails();
  }, [id]);

  const loadTrackDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`*, artist:artist_id(*), album:album_id(*)`)
        .eq('id', id)
        .single();

      if (error || !data) throw error;

      // If this track isn't part of an album, check if it's registered as a single
      let singleExtra: any = null;
      if (!data.album_id) {
        const { data: s } = await supabase
          .from('singles')
          .select('*')
          .eq('track_id', data.id)
          .single();
        singleExtra = s || null;
      }

      const transformedTrack: Track = {
        id: data.id,
        title: data.title,
        artist:
          data.artist?.name ||
          data.artist_name ||
          data.artist ||
          'Unknown Artist',
        artistId: data.artist_id,
        album: data.album?.title || data.album_title || 'Single',
        duration: data.duration || 180,
        coverUrl: apiService.getPublicUrl(
          'images',
          data.cover_url || data.album?.cover_url || '',
        ),
        audioUrl: apiService.getPublicUrl('audio-files', data.audio_url),
        isLiked: likedSongs.some((l) => l.id === data.id),
        genre: Array.isArray(data.genres) ? data.genres[0] : data.genre || 'Unknown',
        releaseDate:
          data.release_date || singleExtra?.release_date || data.created_at,
        playCount: data.play_count,
        likeCount: data.like_count,
        lyrics: data.lyrics || singleExtra?.lyrics || '',
        description: data.description || singleExtra?.description || '',
        genres: data.genres,
      };
      setTrack(transformedTrack);
    } catch (err) {
      console.error('Error loading track details:', err);
      setError('Failed to load track details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!track?.audioUrl) return;

    if (currentTrack?.id === track.id) {
      if (isPlaying) pauseTrack();
      else playTrack(track, [track]);
    } else {
      playTrack(track, [track]);
    }
  };

  const handleLike = () => {
    if (!track) return;
    toggleLike(track.id);
    setTrack((prev) => (prev ? { ...prev, isLiked: !prev.isLiked } : prev));
  };

  const handleAddToQueue = () => {
    if (!track) return;
    Alert.alert('Added to Queue', `"${track.title}" added to your queue`);
  };

  const handleShare = async () => {
    if (!track) return;
    try {
      await Share.share({
        message: `Check out "${track.title}" by ${track.artist}`,
        url: `https://sonix.app/track/${id}`,
      });
    } catch (err) {
      console.error('Error sharing track:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading track...</Text>
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Track not found'}</Text>
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
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <MoreVertical color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.trackHeader}>
          <Image source={{ uri: track.coverUrl }} style={styles.trackCover} />
          <Text style={styles.trackTitle}>{track.title}</Text>
          <Text style={styles.trackArtist}>{track.artist}</Text>
          {track.description && (
            <Text style={styles.trackDescription}>{track.description}</Text>
          )}
          <View style={styles.trackMeta}>
            <View style={styles.metaItem}>
              <Calendar color="#94a3b8" size={16} />
              <Text style={styles.metaText}>
                {formatDate(track.releaseDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Clock color="#94a3b8" size={16} />
              <Text style={styles.metaText}>
                {formatDuration(track.duration)}
              </Text>
            </View>
            {track.playCount && (
              <View style={styles.metaItem}>
                <Music color="#94a3b8" size={16} />
                <Text style={styles.metaText}>
                  {track.playCount.toLocaleString()} plays
                </Text>
              </View>
            )}
          </View>
          {track.genres && track.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {track.genres.map((genre, idx) => (
                <View key={idx} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart
              color={track.isLiked ? '#ef4444' : '#ffffff'}
              size={24}
              fill={track.isLiked ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <LinearGradient
              colors={['#8b5cf6', '#a855f7']}
              style={styles.playButtonGradient}
            >
              {currentTrack?.id === track.id && isPlaying ? (
                <Pause color="#ffffff" size={32} />
              ) : (
                <Play color="#ffffff" size={32} />
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToQueue}
          >
            <Plus color="#ffffff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <ShareIcon color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionRow} onPress={handleAddToQueue}>
            <Plus color="#8b5cf6" size={20} />
            <Text style={styles.actionText}>Add to Queue</Text>
          </TouchableOpacity>
        </View>

        {track.lyrics && (
          <View style={styles.lyricsSection}>
            <Text style={styles.lyricsTitle}>Lyrics</Text>
            <Text style={styles.lyricsText}>{track.lyrics}</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

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
  content: { flex: 1 },
  trackHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  trackCover: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  trackTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  trackDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#94a3b8' },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  genreText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#8b5cf6' },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    marginHorizontal: 16,
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsSection: { paddingHorizontal: 24, marginBottom: 32 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  actionText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#ffffff' },
  lyricsSection: { paddingHorizontal: 24, marginBottom: 32 },
  lyricsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  lyricsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    lineHeight: 24,
  },
  bottomPadding: { height: 120 },
});
