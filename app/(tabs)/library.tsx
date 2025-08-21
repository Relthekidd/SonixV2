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
import { useMusic } from '@/providers/MusicProvider';
import { useLibrary } from '@/providers/LibraryProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTracks } from '@/hooks/useTracks';
import { supabase } from '@/services/supabase';
import { Track, Playlist, TrackRow } from '@/types';
import { transformTrack } from '@/utils/dataTransformers';
import { commonStyles, spacing, colors } from '@/styles/commonStyles';
import { Heart, Music, Plus, X } from 'lucide-react-native';
import TrackList from '@/components/TrackList';
import { router } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';

type Filter = 'all' | 'singles' | 'albums' | 'liked' | 'playlists' | 'artists';

function LibraryScreen() {
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
  } = useMusic();
  
  const {
    likedSongIds,
    playlists,
    createPlaylist,
  } = useLibrary();

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
        const mapped = (data || []).map((t: TrackRow) => transformTrack(t, likedSongIds));
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
      .select('artist:artist_id(id, avatar_url)')
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
        const rows = data as unknown as {
          artist: { id: string; stage_name: string; avatar_url?: string | null };
        }[];
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
      style={[styles.playlistItem, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
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
            style={[styles.filterButton, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow, filter === (key as Filter) && styles.activeFilterButton]}
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
          <>
            {savedAlbums.length > 0 ? (
              <View style={styles.albumList}>
                {savedAlbums.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.albumCard, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
                    onPress={() => router.push(`/album/${a.id}` as const)}
                  >
                    <Image source={{ uri: a.coverUrl }} style={styles.albumCover} />
                    <Text style={styles.albumTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={commonStyles.emptyState}>
                <Music color="#64748b" size={48} />
                <Text style={commonStyles.emptyText}>No saved albums</Text>
                <Text style={commonStyles.emptySubtext}>
                  Albums you save will appear here
                </Text>
              </View>
            )}
          </>
        )}

        {filter === 'liked' && (
          <>
            {likedTracks.length > 0 ? (
              <TrackList
                tracks={likedTracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlay={(t) => handleTrackPress(t, likedTracks)}
              />
            ) : (
              <View style={commonStyles.emptyState}>
                <Heart color="#64748b" size={48} />
                <Text style={commonStyles.emptyText}>No liked songs</Text>
                <Text style={commonStyles.emptySubtext}>
                  Songs you like will appear here
                </Text>
              </View>
            )}
          </>
        )}

        {filter === 'playlists' && (
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={commonStyles.emptyState}>
                <Music color="#64748b" size={48} />
                <Text style={commonStyles.emptyText}>No playlists yet</Text>
                <Text style={commonStyles.emptySubtext}>
                  Create your first playlist to get started
                </Text>
              </View>
            }
          />
        )}

        {filter === 'artists' && (
          <>
            {followedArtists.length > 0 ? (
              <View style={styles.artistList}>
                {followedArtists.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.artistItem, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
                    onPress={() => router.push(`/artist/${a.id}` as const)}
                  >
                    {a.avatar_url ? (
                      <Image
                        source={{ uri: a.avatar_url }}
                        style={styles.artistAvatar}
                      />
                    ) : (
                      <User color="#8b5cf6" size={24} />
                    )}
                    <Text style={styles.artistName} numberOfLines={1}>
                      {a.stage_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={commonStyles.emptyState}>
                <User color="#64748b" size={48} />
                <Text style={commonStyles.emptyText}>No followed artists</Text>
                <Text style={commonStyles.emptySubtext}>
                  Artists you follow will appear here
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl * 2.5 }} />
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
    padding: spacing.md,
    paddingTop: spacing.xxl,
  },
  title: { 
    color: colors.white, 
    fontSize: 24, 
    fontFamily: 'Poppins-Bold' 
  },
  addButton: { padding: spacing.sm },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
  },
  filterText: {
    fontFamily: 'Inter-SemiBold',
    color: colors.gray500,
  },
  activeFilterButton: { backgroundColor: `${colors.primary}20` },
  activeFilterText: { color: colors.primary },
  content: { paddingHorizontal: spacing.md },
  albumList: {
    paddingHorizontal: spacing.md,
  },
  albumCard: {
    marginBottom: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  albumTitle: {
    color: colors.white,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
  },
  playlistInfo: { flex: 1 },
  playlistTitle: { 
    color: colors.white, 
    fontFamily: 'Inter-SemiBold', 
    fontSize: 16 
  },
  playlistDescription: {
    color: colors.gray400,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  artistList: { paddingHorizontal: spacing.md },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
  },
  artistAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: spacing.sm 
  },
  artistName: { 
    color: colors.white, 
    fontFamily: 'Inter-Regular',
    fontSize: 16 
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: { 
    color: colors.white, 
    fontFamily: 'Inter-SemiBold', 
    fontSize: 18 
  },
  closeButton: { padding: spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray600,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.white,
    marginBottom: spacing.md,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});