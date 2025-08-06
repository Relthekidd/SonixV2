import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic, Track, TrackRow } from '@/providers/MusicProvider';
import { useAuth } from '@/providers/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { Music, ArrowLeft } from 'lucide-react-native';
import TrackMenu from '@/components/TrackMenu';
import TrackList from '@/components/TrackList';
import HeroCard from '@/components/HeroCard';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    playlists,
    playTrack,
    pauseTrack,
    currentTrack,
    isPlaying,
    addToQueue,
  } = useMusic();
  const playlist = playlists.find((p) => p.id === id);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<{
    description?: string | null;
    cover_url?: string | null;
    created_at?: string | null;
    user_id?: string | null;
    title?: string | null;
  } | null>(null);
  const [runtime, setRuntime] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const isOwner = user?.id === playlistInfo?.user_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  useEffect(() => {
    if (!playlist) return;
    supabase
      .from('playlists')
      .select('description,cover_url,created_at,user_id,title')
      .eq('id', playlist.id)
      .single()
      .then(({ data }) => {
        setPlaylistInfo(data);
        setEditingTitle(data?.title || '');
        setEditingDesc(data?.description || '');
      });

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
          playCount:
            typeof t.play_count === 'number' ? t.play_count : undefined,
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

  const handleReorder = async (data: Track[]) => {
    setTracks(data);
    await Promise.all(
      data.map((t, index) =>
        supabase
          .from('playlist_tracks')
          .update({ position: index })
          .match({ playlist_id: playlist?.id, track_id: t.id }),
      ),
    );
  };

  const handleSaveMetadata = async () => {
    await supabase
      .from('playlists')
      .update({ title: editingTitle, description: editingDesc })
      .eq('id', playlist?.id);
    setPlaylistInfo((info) =>
      info
        ? { ...info, title: editingTitle, description: editingDesc }
        : info,
    );
    setIsEditing(false);
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
      <ScrollView>
        <HeroCard
          coverUrl={apiService.getPublicUrl(
            'images',
            playlistInfo?.cover_url || '',
          )}
          title={playlistInfo?.title || playlist.title}
          description={playlistInfo?.description || undefined}
          releaseDate={
            playlistInfo?.created_at
              ? formatDate(playlistInfo.created_at)
              : undefined
          }
          duration={`${tracks.length} tracks${
            runtime ? ` • ${formatDuration(runtime)}` : ''
          }`}
          playCount={playCount}
        />

        <TrackMenu
          onPlay={handlePlayPlaylist}
          onAddToQueue={() => tracks.forEach(addToQueue)}
        />

        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.ownerButton, styles.glassCard, styles.brutalBorder]}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.ownerButtonText}>Add Song</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ownerButton, styles.glassCard, styles.brutalBorder]}
              onPress={() => setIsEditing((e) => !e)}
            >
              <Text style={styles.ownerButtonText}>
                {isEditing ? 'Done' : 'Edit Details'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwner && isEditing && (
          <View style={styles.editSection}>
            <TextInput
              style={styles.input}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Title"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editingDesc}
              onChangeText={setEditingDesc}
              placeholder="Description"
              placeholderTextColor="#94a3b8"
              multiline
            />
            <TouchableOpacity
              style={[styles.saveButton, styles.glassCard, styles.brutalBorder]}
              onPress={handleSaveMetadata}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}

        <TrackList
          tracks={tracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handleTrackPress}
          editable={isOwner}
          onReorder={handleReorder}
          playlistId={playlist?.id}
        />

        {tracks.length === 0 && (
          <View style={styles.emptyState}>
            <Music color="#64748b" size={48} />
            <Text style={styles.emptyText}>No tracks in this playlist</Text>
          </View>
        )}
      </ScrollView>
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
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  ownerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  ownerButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  editSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontFamily: 'Inter-Regular',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
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
