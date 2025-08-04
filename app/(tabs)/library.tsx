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

function LibraryScreen() {
  const { playlist } = useLocalSearchParams<{ playlist?: string }>();
  const [activeTab, setActiveTab] = useState('playlists');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');

  const [savedAlbums, setSavedAlbums] = useState<Track[]>([]);

  const {
    likedSongs,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    createPlaylist,
    toggleLike,
    refreshData,
  } = useMusic();

  useEffect(() => {
    if (playlist) setActiveTab('playlists');
  }, [playlist]);

  useEffect(() => {
    refreshData();
    fetchSavedAlbums();
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

    const mapped = (data || []).map((r: FavoriteAlbumRow) => ({
      id: r.album.id,
      title: r.album.title,
      artist: r.album.artist?.name || '',
      year: r.album.release_year || '',
      coverUrl: apiService.getPublicUrl('images', r.album.cover_url || ''),
    }));
    setSavedAlbums(mapped);
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
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
      onLongPress={() => toggleLike(item.id)}
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
    <TouchableOpacity style={styles.playlistItem}>
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

  const renderAlbumItem = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.albumItem}>
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

  const tabs = [
    { id: 'playlists', title: 'Playlists', icon: Music },
    { id: 'liked', title: 'Liked Songs', icon: Heart },
    { id: 'albums', title: 'Albums', icon: Music },
  ];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
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

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
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
      </View>

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
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  trackCover: {
    width: 50,
    height: 50,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  playlistCover: {
    width: 60,
    height: 60,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  albumCover: {
    width: 60,
    height: 60,
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
});

export default withAuthGuard(LibraryScreen);
