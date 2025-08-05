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
import { useMusic, Track, Playlist } from '@/providers/MusicProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import {
  Heart,
  Music,
  Plus,
  Play,
  Pause,
  MoveVertical as MoreVertical,
  X,
} from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useLocalSearchParams } from 'expo-router';
import TrackMenu from '@/components/TrackMenu';

function LibraryScreen() {
  const { playlist } = useLocalSearchParams<{ playlist?: string }>();
  const [activeTab, setActiveTab] = useState('playlists');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');

  interface SavedAlbum {
    id: string;
    title: string;
    artist: string;
    year: string;
    coverUrl: string;
  }
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
  interface SavedArtist {
    id: string;
    name: string;
    avatarUrl: string;
  }
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);

  const {
    likedSongs,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    createPlaylist,
    refreshData,
  } = useMusic();

  useEffect(() => {
    if (playlist) setActiveTab('playlists');
  }, [playlist]);

  useEffect(() => {
    refreshData();
    fetchSavedAlbums();
    fetchSavedArtists();
  }, []);

  async function fetchSavedAlbums() {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) return;

    const { data } = await supabase
      .from('favorites')
      .select('album:album_id(*, artist:artist_id(*))')
      .eq('user_id', uid)
      .not('album_id', 'is', null);

    interface FavoriteAlbumRow {
      album: {
        id: string;
        title: string;
        artist?: { name?: string } | null;
        release_year?: string | null;
        cover_url?: string | null;
      };
    }

    const rows = (data ?? []) as unknown as FavoriteAlbumRow[];
    const mapped: SavedAlbum[] = rows.map((r) => ({
      id: r.album.id,
      title: r.album.title,
      artist: r.album.artist?.name || '',
      year: r.album.release_year || '',
      coverUrl: apiService.getPublicUrl('images', r.album.cover_url || ''),
    }));
    setSavedAlbums(mapped);
  }

  async function fetchSavedArtists() {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) return;

    const { data } = await supabase
      .from('favorites')
      .select('artist:artist_id(*)')
      .eq('user_id', uid)
      .not('artist_id', 'is', null);

    interface FavoriteArtistRow {
      artist: { id: string; name: string; avatar_url?: string | null };
    }

    const rows = (data ?? []) as unknown as FavoriteArtistRow[];
    const mapped: SavedArtist[] = rows.map((r) => ({
      id: r.artist.id,
      name: r.artist.name,
      avatarUrl: apiService.getPublicUrl('images', r.artist.avatar_url || ''),
    }));
    setSavedArtists(mapped);
  }

  const handleCreatePlaylist = () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    createPlaylist(playlistName, playlistDescription);
    setPlaylistName('');
    setPlaylistDescription('');
    setShowCreatePlaylist(false);
    Alert.alert('Success', 'Playlist created successfully!');
  };

  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, likedSongs);
      }
    } else {
      playTrack(track, likedSongs);
    }
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={[
        styles.trackItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
      onPress={() => handleTrackPress(item)}
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
      <TouchableOpacity style={styles.playButton}>
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
      style={[
        styles.playlistItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.playlistCover} />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.playlistDescription} numberOfLines={1}>
          {item.tracks.length} songs
        </Text>
      </View>
      <TouchableOpacity style={styles.moreButton}>
        <MoreVertical color="#94a3b8" size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }: { item: SavedAlbum }) => (
    <TouchableOpacity
      style={[
        styles.albumItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.albumCover} />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.albumArtist} numberOfLines={1}>
          {item.artist} • {item.year}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: SavedArtist }) => (
    <TouchableOpacity
      style={[
        styles.artistItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
    >
      <Image source={{ uri: item.avatarUrl }} style={styles.artistAvatar} />
      <Text style={styles.artistName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const tabs = [
    { id: 'playlists', title: 'Playlists', icon: Music },
    { id: 'liked', title: 'Liked Songs', icon: Heart },
    { id: 'albums', title: 'Albums', icon: Music },
    { id: 'artists', title: 'Artists', icon: Music },
  ];

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabCard,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
              activeTab === tab.id && styles.activeTabCard,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <tab.icon
              color={activeTab === tab.id ? '#8b5cf6' : '#64748b'}
              size={20}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {activeTab === 'liked' && (
          <FlatList
            data={likedSongs}
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

        {activeTab === 'albums' && (
          <FlatList
            data={savedAlbums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Music color="#64748b" size={48} />
                <Text style={styles.emptyText}>No albums saved</Text>
                <Text style={styles.emptySubtext}>
                  Save albums to access them quickly
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'artists' && (
          <FlatList
            data={savedArtists}
            renderItem={renderArtistItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Music color="#64748b" size={48} />
                <Text style={styles.emptyText}>No artists saved</Text>
                <Text style={styles.emptySubtext}>
                  Follow artists to see them here
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
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#64748b"
              value={playlistDescription}
              onChangeText={setPlaylistDescription}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreatePlaylist}
            >
              <LinearGradient
                colors={['#8b5cf6', '#a855f7']}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Create Playlist</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeTabCard: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  content: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  trackCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  playlistCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  albumCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  albumInfo: {
    flex: 1,
    marginLeft: 12,
  },
  albumTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  artistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  artistName: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  createButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 120,
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

export default withAuthGuard(LibraryScreen);
