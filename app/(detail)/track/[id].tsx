import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { supabase } from '@/services/supabase';
import { ArrowLeft, Play, Pause } from 'lucide-react-native';
import TrackMenu from '@/components/TrackMenu';
import HeroCard from '@/components/HeroCard';

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

  const { currentTrack, isPlaying, playTrack, pauseTrack, likedSongIds } =
    useMusic();

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
      let singleExtra: {
        release_date?: string;
        lyrics?: string;
        description?: string;
      } | null = null;
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
        isLiked: likedSongIds.includes(data.id),
        genre: Array.isArray(data.genres)
          ? data.genres[0]
          : data.genre || 'Unknown',
        releaseDate:
          data.release_date || singleExtra?.release_date || data.created_at,
        year:
          data.release_date || singleExtra?.release_date
            ? new Date(
                data.release_date ||
                  singleExtra?.release_date ||
                  data.created_at,
              )
                .getFullYear()
                .toString()
            : undefined,
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
        colors={['#0f172a', '#1e293b', '#0f172a']}
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
        colors={['#0f172a', '#1e293b', '#0f172a']}
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
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <HeroCard
          coverUrl={track.coverUrl}
          title={track.title}
          subtitle={track.artist}
          description={track.description}
          releaseDate={formatDate(track.releaseDate)}
          duration={formatDuration(track.duration)}
          playCount={track.playCount}
          genres={track.genres}
          moreMenu={<TrackMenu track={track} />}
        />

        <View
          style={[
            styles.controlsSection,
            styles.glassCard,
            styles.brutalBorder,
            styles.brutalShadow,
          ]}
        >
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
          <TrackMenu track={track} onShare={handleShare} />
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
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 36,
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
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
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
