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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService, AlbumDetails, TrackData } from '@/services/api';
import { ArrowLeft } from 'lucide-react-native';
import TrackList from '@/components/TrackList';
import TrackMenu from '@/components/TrackMenu';
import HeroCard from '@/components/HeroCard';

function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    addToQueue,
    likedSongIds,
  } = useMusic();

  useEffect(() => {
    if (id) loadAlbumDetails();
  }, [id]);

  const loadAlbumDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const albumData = await apiService.getAlbumById(id!);
      console.log('AlbumDetailScreen: fetched album', {
        id: albumData?.id,
        title: albumData?.title,
        coverUrl: albumData?.cover_url,
      });
      if (!albumData?.cover_url) {
        console.warn('AlbumDetailScreen: album missing cover art', id);
      }
      if (!albumData?.tracks || albumData.tracks.length === 0) {
        console.warn('AlbumDetailScreen: album has no tracks', id);
      }
      setAlbum(albumData);

      const transformed = (albumData.tracks || []).map(
        (t: TrackData, idx: number): Track => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name || albumData.artist?.name || 'Unknown Artist',
          artistId: t.artist?.id || albumData.artist_id || undefined,
          album: albumData.title,
          duration: t.duration,
          coverUrl: albumData.cover_url,
          audioUrl: t.audio_url,
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
          featuredArtists: t.featured_artists,
        }),
      );


        transformed.sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
        transformed.forEach((t) => {
          console.log('AlbumDetailScreen: track URLs', {
            id: t.id,
            audioUrl: t.audioUrl,
            coverUrl: t.coverUrl,
          });
          if (!t.audioUrl) {
            console.warn('AlbumDetailScreen: track missing audio URL', t.id);
          }
          if (!t.coverUrl) {
            console.warn('AlbumDetailScreen: track missing cover art', t.id);
          }
        });
        console.log('AlbumDetailScreen: loaded tracks', transformed.length);
        setTracks(transformed);

      const totalDuration = transformed.reduce(
        (sum, t) => sum + (t.duration || 0),
        0,
      );
      const totalPlays = transformed.reduce(
        (sum, t) => sum + (t.playCount || 0),
        0,
      );
      setRuntime(totalDuration);
      setPlayCount(totalPlays);
    } catch (err) {
      console.error(err);
      setError('Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPlay = (track: Track) => {
    console.log('AlbumDetailScreen: play track', {
      id: track.id,
      title: track.title,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl,
    });
    if (!track.audioUrl) {
      console.warn('AlbumDetailScreen: cannot play track without audio', track.id);
    }
    if (!track.coverUrl) {
      console.warn('AlbumDetailScreen: track missing cover art', track.id);
    }
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

  const handlePlayAlbum = () => {
    console.log('AlbumDetailScreen: play album', {
      albumId: album?.id,
      trackCount: tracks.length,
    });
    if (tracks.length === 0) {
      console.warn('AlbumDetailScreen: no tracks to play for album', album?.id);
      return;
    }
    const first = tracks[0];
    if (currentTrack?.id === first.id) {
      if (isPlaying) pauseTrack();
      else playTrack(first, tracks);
    } else {
      playTrack(first, tracks);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

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
        <HeroCard
          coverUrl={album.cover_url}
          title={album.title}
          mainArtist={album.artist}
          featuredArtists={album.featured_artists}
          description={album.description}
          releaseDate={
            album.release_date ? formatDate(album.release_date) : undefined
          }
          duration={`${tracks.length} tracks • ${formatDuration(runtime)}`}
          playCount={playCount}
        />

        <TrackMenu
          onPlay={handlePlayAlbum}
          onAddToQueue={() => tracks.forEach(addToQueue)}
        />

        <Text style={styles.trackHeading}>Tracklist</Text>
        <TrackList
          tracks={tracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handleTrackPlay}
        />
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
  trackHeading: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
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
