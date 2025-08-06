import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic, Track, Playlist, TrackRow } from '@/providers/MusicProvider';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { Heart, Music, Plus, X } from 'lucide-react-native';
import TrackList from '@/components/TrackList';
import { router } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard'; // Added missing import

type Filter = 'all' | 'singles' | 'albums' | 'liked' | 'playlists' | 'artists';

function LibraryScreen() {
  const { user } = useAuth();
  const {
    likedSongIds,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    createPlaylist,
  } = useMusic();

  const [filter, setFilter] = useState<Filter>('all');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<
    { id: string; title: string; coverUrl: string }[]
  >([]);
  const [followedArtists, setFollowedArtists] = useState<
    { id: string; stage_name: string; avatar_url?: string | null }[]
  >([]);

  useEffect(() => {
    const trackIds = Array.from(
      new Set([...likedSongIds, ...playlists.flatMap((p) => p.trackIds)]),
    );
    if (trackIds.length === 0) {
      setAllTracks([]);
      setLikedTracks([]);
      setSavedAlbums([]);
      return;
    }
    supabase
      .from('tracks')
      .select(`*, artist:artist_id(*), album:album_id(*)`)
      .in('id', trackIds)
      .then(({ data, error }) => {
        if (error) {
          console.error('fetch tracks', error);
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
          isLiked: likedSongIds.includes(t.id),
          genre: Array.isArray(t.genres)
            ? t.genres[0]
            : (t.genres as string) || '',
          releaseDate: t.release_date || t.created_at || '',
        }));
        setAllTracks(mapped);
        setLikedTracks(mapped.filter((m) => likedSongIds.includes(m.id)));
        const albumMap = new Map<string, { id: string; title: string; coverUrl: string }>();
        mapped.forEach((m) => {
          if (m.albumId) {
            albumMap.set(m.albumId, {
              id: m.albumId,
              title: m.album,
              coverUrl: m.coverUrl,
            });
          }
        });
        setSavedAlbums(Array.from(albumMap.values()));
      });
  }, [likedSongIds, playlists]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('artist_followers')
      .select('artist:artist_id(id, stage_name, avatar_url)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('fetch artists', error);
          return;
        }
        // Handle the case where data might be in different formats
        if (!data) {
          setFollowedArtists([]);
          return;
        }
        
        // Cast to unknown first, then to our expected type to handle the mismatch
        const rows = data as unknown as {
          artist: { id: string; stage_name: string; avatar_url?: string | null };
        }[];
        
        // Filter out any invalid entries and map to artists
        const artists = rows
          .filter(row => row.artist && typeof row.artist === 'object')
          .map(row => row.artist)
          .filter(artist => artist.id && artist.stage_name);
          
        setFollowedArtists(artists);
      });
  }, [user]);

  const handleTrackPress = (track: Track, list: Track[]) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pauseTrack();
      else playTrack(track, list);
    } else {
      playTrack(track, list);
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

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={[
        styles.playlistItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
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
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreatePlaylist(true)}
        >
          <Plus color="#8b5cf6" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        {[
          { key: 'singles', label: 'Singles' },
          { key: 'albums', label: 'Albums' },
          { key: 'liked', label: 'Liked Songs' },
          { key: 'playlists', label: 'Playlists' },
          { key: 'artists', label: 'Artists' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
              filter === (key as Filter) && styles.activeFilterButton,
            ]}
            onPress={() => setFilter(key as Filter)}
          >
            <Text
              style={[
                styles.filterText,
                filter === (key as Filter) && styles.activeFilterText,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filter === 'all' && (
          <TrackList
            tracks={allTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={(t) => handleTrackPress(t, allTracks)}
          />
        )}

        {filter === 'singles' && (
          <TrackList
            tracks={allTracks.filter((t) => !t.albumId)}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={(t) =>
              handleTrackPress(t, allTracks.filter((a) => !a.albumId))
            }
          />
        )}

        {filter === 'albums' && (
          <View style={styles.albumList}>
            {savedAlbums.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.albumCard,
                  styles.glassCard,
                  styles.brutalBorder,
                  styles.brutalShadow,
                ]}
                onPress={() => router.push(`/album/${a.id}` as const)}
              >
                <Image source={{ uri: a.coverUrl }} style={styles.albumCover} />
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {a.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filter === 'liked' && (
          <TrackList
            tracks={likedTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={(t) => handleTrackPress(t, likedTracks)}
          />
        )}

        {filter === 'playlists' && (
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

        {filter === 'artists' && (
          <View style={styles.artistList}>
            {followedArtists.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.artistItem,
                  styles.glassCard,
                  styles.brutalBorder,
                  styles.brutalShadow,
                ]}
                onPress={() => router.push(`/artist/${a.id}` as const)}
              >
                {a.avatar_url ? (
                  <Image
                    source={{ uri: a.avatar_url }}
                    style={styles.artistAvatar}
                  />
                ) : (
                  <Heart color="#8b5cf6" size={24} />
                )}
                <Text style={styles.artistName} numberOfLines={1}>
                  {a.stage_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showCreatePlaylist && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Playlist</Text>
              <TouchableOpacity
                onPress={() => setShowCreatePlaylist(false)}
                style={styles.closeButton}
              >
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

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCreatePlaylist}
            >
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterText: {
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  activeFilterButton: { backgroundColor: 'rgba(139,92,246,0.1)' },
  activeFilterText: { color: '#8b5cf6' },
  content: { paddingHorizontal: 16 },
  albumList: {
    paddingHorizontal: 16,
  },
  albumCard: {
    marginBottom: 16,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  playlistInfo: { flex: 1 },
  playlistTitle: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  playlistDescription: {
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  artistList: { paddingHorizontal: 16 },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  artistAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  artistName: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  emptySubtext: {
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
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