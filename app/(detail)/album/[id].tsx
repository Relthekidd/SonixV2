import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService, AlbumDetails, TrackData } from '@/services/api';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import TrackItem from '@/components/TrackItem';

function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pauseTrack, likedSongIds } =
    useMusic();

  useEffect(() => {
    if (id) loadAlbumDetails();
  }, [id]);

  const loadAlbumDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const albumData = await apiService.getAlbumById(id!);
      setAlbum(albumData);

      const transformed = (albumData.tracks || []).map(
        (t: TrackData, idx: number): Track => ({
          id: t.id,
          title: t.title,
          artist: albumData.artist || 'Unknown',
          artistId: albumData.artist_id || undefined,
          album: albumData.title,
          duration: t.duration,
          coverUrl: apiService.getPublicUrl('images', albumData.cover_url),
          audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
          isLiked: likedSongIds.includes(t.id),
          trackNumber: t.track_number ?? idx + 1,
          releaseDate: albumData.release_date || '',
          playCount: t.play_count ?? undefined,
          likeCount: t.like_count ?? undefined,
          lyrics: t.lyrics || undefined,
          genre: '',
          year: albumData.release_date
            ? new Date(albumData.release_date).getFullYear().toString()
            : undefined,
          description: '',
        }),
      );

      transformed.sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
      setTracks(transformed);
    } catch (err) {
      console.error(err);
      setError('Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPlay = (track: Track) => {
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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
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
          <Text style={styles.loadingText}>Loading album...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !album) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
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
        <View
          style={[
            styles.albumHeader,
            styles.glassCard,
            styles.brutalBorder,
            styles.brutalShadow,
          ]}
        >
          <Image
            source={{ uri: apiService.getPublicUrl('images', album.cover_url) }}
            style={styles.albumCover}
          />
          <Text style={styles.albumTitle}>{album.title}</Text>
          <Text style={styles.albumArtist}>{album.artist}</Text>
          {album.description && (
            <Text style={styles.albumDescription}>{album.description}</Text>
          )}
          {album.release_date && (
            <View style={styles.albumMeta}>
              <Calendar color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{formatDate(album.release_date)}</Text>
            </View>
          )}
        </View>

        <View style={styles.trackList}>
          {tracks.map((t) => (
            <TrackItem
              key={t.id}
              track={t}
              isCurrent={currentTrack?.id === t.id}
              isPlaying={isPlaying}
              onPlay={() => handleTrackPlay(t)}
            />
          ))}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

export default withAuthGuard(AlbumDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  albumHeader: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 30 },
  albumCover: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  albumTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  albumArtist: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  albumDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  albumMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#94a3b8' },
  trackList: { paddingHorizontal: 20 },
  bottomPadding: { height: 80 },
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
});
