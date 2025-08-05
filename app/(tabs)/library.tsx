import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic, Track, Playlist, TrackRow } from '@/providers/MusicProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { Heart, Music, Plus, Play, Pause, X } from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { router } from 'expo-router';
import TrackMenu from '@/components/TrackMenu';

function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists'>('liked');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const { likedSongIds, playlists, currentTrack, isPlaying, playTrack, pauseTrack, createPlaylist } = useMusic();

  const [likedTracks, setLikedTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (likedSongIds.length === 0) {
      setLikedTracks([]);
      return;
    }
    supabase
      .from('tracks')
      .select(`*, artist:artist_id(*), album:album_id(*)`)
      .in('id', likedSongIds)
      .then(({ data, error }) => {
        if (error) {
          console.error('fetch liked tracks', error);
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
          coverUrl: apiService.getPublicUrl('images', t.cover_url || t.album?.cover_url || ''),
          audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
          isLiked: true,
          genre: Array.isArray(t.genres) ? t.genres[0] : (t.genres as string) || '',
          releaseDate: t.release_date || t.created_at || '',
        }));
        const ordered = likedSongIds
          .map((id) => mapped.find((m) => m.id === id))
          .filter(Boolean) as Track[];
        setLikedTracks(ordered);
      });
  }, [likedSongIds]);

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pauseTrack();
      else playTrack(track, likedTracks);
    } else {
      playTrack(track, likedTracks);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    await createPlaylist(playlistName.trim());
    setPlaylistName('');
    setShowCreatePlaylist(false);
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={[styles.trackItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
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
      <TrackMenu track={item} />
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

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={[styles.playlistItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
      onPress={() => router.push(`/playlist/${item.id}`)}
    >
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.playlistDescription} numberOfLines={1}>
          {item.trackIds.length} songs
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreatePlaylist(true)}>
          <Plus color="#8b5cf6" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabCard, styles.glassCard, styles.brutalBorder, styles.brutalShadow, activeTab === 'liked' && styles.activeTabCard]}
          onPress={() => setActiveTab('liked')}
        >
          <Heart color={activeTab === 'liked' ? '#8b5cf6' : '#64748b'} size={20} />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>Liked Songs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabCard, styles.glassCard, styles.brutalBorder, styles.brutalShadow, activeTab === 'playlists' && styles.activeTabCard]}
          onPress={() => setActiveTab('playlists')}
        >
          <Music color={activeTab === 'playlists' ? '#8b5cf6' : '#64748b'} size={20} />
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>Playlists</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'liked' && (
          <FlatList
            data={likedTracks}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Heart color="#64748b" size={48} />
                <Text style={styles.emptyText}>No liked songs yet</Text>
                <Text style={styles.emptySubtext}>
                  Heart songs you love to find them here
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'playlists' && (
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Music color="#64748b" size={48} />
                <Text style={styles.emptyText}>No playlists yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first playlist to get started
                </Text>
              </View>
            }
          />
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {showCreatePlaylist && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Playlist</Text>
              <TouchableOpacity onPress={() => setShowCreatePlaylist(false)} style={styles.closeButton}>
                <X color="#ffffff" size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#64748b"
              value={playlistName}
              onChangeText={setPlaylistName}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleCreatePlaylist}>
              <Text style={styles.modalButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

export default withAuthGuard(LibraryScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  title: { color: '#fff', fontSize: 24, fontFamily: 'Poppins-Bold' },
  addButton: { padding: 8 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  tabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  activeTabCard: { backgroundColor: 'rgba(139,92,246,0.1)' },
  tabText: { fontFamily: 'Inter-SemiBold', color: '#64748b' },
  activeTabText: { color: '#8b5cf6' },
  content: { paddingHorizontal: 16 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  trackCover: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  trackArtist: { color: '#94a3b8', fontFamily: 'Inter-Regular', fontSize: 14 },
  playButton: { padding: 8 },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  playlistInfo: { flex: 1 },
  playlistTitle: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  playlistDescription: { color: '#94a3b8', fontFamily: 'Inter-Regular', fontSize: 14 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  emptySubtext: { color: '#94a3b8', fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
  bottomPadding: { height: 120 },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 18 },
  closeButton: { padding: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
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
