import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic, Track, TrackRow } from '@/providers/MusicProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { Play, Pause, Music, ArrowLeft } from 'lucide-react-native';
import TrackMenu from '@/components/TrackMenu';
import HeroCard from '@/components/HeroCard';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlists, playTrack, pauseTrack, currentTrack, isPlaying } =
    useMusic();
  const playlist = playlists.find((p) => p.id === id);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<{
    description?: string | null;
    cover_url?: string | null;
    created_at?: string | null;
  } | null>(null);
  const [runtime, setRuntime] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    if (!playlist) return;
    supabase
      .from('playlists')
      .select('description,cover_url,created_at')
      .eq('id', playlist.id)
      .single()
      .then(({ data }) => setPlaylistInfo(data));

    if (playlist.trackIds.length === 0) {
      setTracks([]);
      setRuntime(0);
      setPlayCount(0);
      return;
    }

    supabase
      .from('tracks')
      .select(`*, artist:artist_id(*), album:album_id(*)`)
      .in('id', playlist.trackIds)
      .then(({ data, error }) => {
        if (error) {
          console.error('fetch playlist tracks', error);
          return;
        }
        const mapped = (data || []).map((t: TrackRow) => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name || t.artist_name || 'Unknown Artist',
          artistId: t.artist_id || undefined,
          album: t.album?.title || t.album_title || 'Single',
          albumId: t.album_id || undefined,
          duration: t.duration || 0,
          coverUrl: apiService.getPublicUrl(
            'images',
            t.cover_url || t.album?.cover_url || '',
          ),
          audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
          isLiked: false,
          genre: Array.isArray(t.genres)
            ? t.genres[0]
            : (t.genres as string) || '',
          releaseDate: t.release_date || t.created_at || '',
          playCount: t.play_count || undefined,
        }));
        const ordered = playlist.trackIds
          .map((tid) => mapped.find((m) => m.id === tid))
          .filter(Boolean) as Track[];
        setTracks(ordered);
        const totalDuration = ordered.reduce(
          (sum, t) => sum + (t.duration || 0),
          0,
        );
        const totalPlays = ordered.reduce(
          (sum, t) => sum + (t.playCount || 0),
          0,
        );
        setRuntime(totalDuration);
        setPlayCount(totalPlays);
      });
  }, [playlist]);

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pauseTrack();
      else playTrack(track, tracks);
    } else {
      playTrack(track, tracks);
    }
  };

  const handlePlayPlaylist = () => {
    if (tracks.length === 0) return;
    const first = tracks[0];
    if (currentTrack?.id === first.id) {
      if (isPlaying) pauseTrack();
      else playTrack(first, tracks);
    } else {
      playTrack(first, tracks);
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

  const renderItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={[
        styles.trackItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
      onPress={() => router.push(`/track/${item.id}`)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TrackMenu track={item} playlistId={playlist?.id} />
      <TouchableOpacity
        style={styles.playButton}
        onPress={(e) => {
          e.stopPropagation();
          handleTrackPress(item);
        }}
      >
        {currentTrack?.id === item.id && isPlaying ? (
          <Pause color="#8b5cf6" size={20} />
        ) : (
          <Play color="#8b5cf6" size={20} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!playlist) {
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
        <View style={styles.emptyState}>
          <Music color="#64748b" size={48} />
          <Text style={styles.emptyText}>Playlist not found</Text>
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
      <FlatList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <HeroCard
            coverUrl={apiService.getPublicUrl(
              'images',
              playlistInfo?.cover_url || '',
            )}
            title={playlist.title}
            description={playlistInfo?.description || undefined}
            releaseDate={
              playlistInfo?.created_at
                ? formatDate(playlistInfo.created_at)
                : undefined
            }
            duration={`${tracks.length} tracks${runtime ? ` • ${formatDuration(runtime)}` : ''}`}
            playCount={playCount}
            onPlay={handlePlayPlaylist}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Music color="#64748b" size={48} />
            <Text style={styles.emptyText}>No tracks in this playlist</Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

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
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  trackCover: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  trackArtist: { color: '#94a3b8', fontFamily: 'Inter-Regular', fontSize: 14 },
  playButton: { padding: 8 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
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
