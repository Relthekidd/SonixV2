import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService, AlbumDetails, TrackData } from '@/services/api';
import {
  Play,
  Pause,
  Heart,
  MoveVertical as MoreVertical,
  Plus,
  Share as ShareIcon,
  Music,
  X,
} from 'lucide-react-native';
import DetailHeader from '@/components/DetailHeader';

function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    toggleLike,
    likedSongIds,
    addToQueue,
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
          playCount: t.play_count ?? undefined,
          likeCount: t.like_count ?? undefined,
          lyrics: t.lyrics || undefined,
          genre: '',
          releaseDate: albumData.release_date || '',
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

  const handleMoreMenuAction = (action: string) => {
    setShowMoreMenu(false);

    switch (action) {
      case 'like':
        if (tracks.length > 0) {
          tracks.forEach((track) => toggleLike(track.id));
        }
        break;
      case 'addToQueue':
        if (tracks.length > 0) {
          tracks.forEach((track) => addToQueue(track));
          Alert.alert(
            'Added to Queue',
            `All tracks from "${album?.title}" added to queue`,
          );
        }
        break;
      case 'share':
        if (album) {
          Share.share({
            message: `Check out "${album.title}" by ${album.artist}`,
            url: `https://sonix.app/album/${id}`,
          });
        }
        break;
      case 'addToLibrary':
        Alert.alert(
          'Add to Library',
          'Album library functionality coming soon!',
        );
        break;
    }
  };

  const MoreMenu = () => (
    <Modal
      visible={showMoreMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMoreMenu(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, styles.glassCard, styles.brutalBorder]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>More Options</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMoreMenu(false)}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMoreMenuAction('addToLibrary')}
          >
            <Plus size={20} color="#8b5cf6" />
            <Text style={styles.menuItemText}>Add to Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMoreMenuAction('like')}
          >
            <Heart size={20} color="#ef4444" />
            <Text style={styles.menuItemText}>Like Album</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMoreMenuAction('addToQueue')}
          >
            <Music size={20} color="#10b981" />
            <Text style={styles.menuItemText}>Add to Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMoreMenuAction('share')}
          >
            <ShareIcon size={20} color="#f59e0b" />
            <Text style={styles.menuItemText}>Share Album</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
      <DetailHeader
        title={album.title}
        onBack={() => router.back()}
        right=
          {(
            <TouchableOpacity
              onPress={() => setShowMoreMenu(true)}
              style={styles.headerButton}
            >
              <MoreVertical size={24} color="#fff" />
            </TouchableOpacity>
          )}
      />

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tracks.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.trackItem,
              currentTrack?.id === item.id && styles.currentTrack,
            ]}
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
              style={styles.queueButton}
              onPress={(e) => {
                e.stopPropagation();
                addToQueue(item);
              }}
            >
              <Plus size={20} color="#8b5cf6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.playButton}
              onPress={(e) => {
                e.stopPropagation();
                handleTrackPress(item);
              }}
            >
              {currentTrack?.id === item.id && isPlaying ? (
                <Pause size={20} color="#8b5cf6" />
              ) : (
                <Play size={20} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <MoreMenu />
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
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllContainer: { alignItems: 'center', marginBottom: 16 },
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
  currentTrack: {
    backgroundColor: 'rgba(139,92,246,0.15)',
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
  playButton: { padding: 8 },
  queueButton: { padding: 8, marginRight: 8 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
});
