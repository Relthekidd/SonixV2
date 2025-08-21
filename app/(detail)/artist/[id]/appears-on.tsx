import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMusic, Track } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import TrackList from '@/components/TrackList';

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

export default function ArtistAppearsOnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, pauseTrack, likedSongIds } =
    useMusic();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadTracks();
  }, [id]);

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
    isLiked: likedSongIds.includes(t.id),
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

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const rows = await apiService.getArtistAppearances(id!);
      setTracks(rows.map(transformTrack));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pauseTrack();
      else playTrack(track, tracks);
    } else {
      playTrack(track, tracks);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Appears On</Text>
        <View style={{ width: 24 }} />
      </View>
      {tracks.length > 0 ? (
        <TrackList
          tracks={tracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handleTrackPress}
        />
      ) : (
        <View style={[commonStyles.emptyState, { marginTop: 60 }]}>
          <Music color="#64748b" size={48} />
          <Text style={commonStyles.emptyText}>No collaborations found</Text>
          <Text style={commonStyles.emptySubtext}>
            This artist hasn't appeared on other tracks yet
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
});

