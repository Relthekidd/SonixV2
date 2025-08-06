import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Track, AlbumResult, PlaylistResult } from '@/providers/MusicProvider';
import { Artist } from '@/services/api';
import { router } from 'expo-router';
import { Heart, Play, Pause } from 'lucide-react-native';
import TrackOptionsMenu from './TrackOptionsMenu';

export interface UserResult {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface SearchResultsData {
  tracks: Track[];
  albums: AlbumResult[];
  playlists: PlaylistResult[];
  artists: Artist[];
  users: UserResult[];
}

interface Props {
  results: SearchResultsData;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTrackPress: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  query: string;
}

export default function SearchResults({
  results,
  currentTrack,
  isPlaying,
  onTrackPress,
  onToggleLike,
  query,
}: Props) {
  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity
        style={[
          styles.resultItem,
          styles.glassCard,
          styles.brutalBorder,
          styles.brutalShadow,
        ]}
        onPress={() =>
          item.albumId
            ? router.push(`/album/${item.albumId}` as const)
            : router.push(`/track/${item.id}` as const)
        }
      >
        <Image source={{ uri: item.coverUrl }} style={styles.resultImage} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.artist} • Song
          </Text>
        </View>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => onToggleLike(item.id)}
        >
          <Heart
            color={item.isLiked ? '#ef4444' : '#94a3b8'}
            fill={item.isLiked ? '#ef4444' : 'transparent'}
            size={18}
          />
        </TouchableOpacity>
        <TrackOptionsMenu track={item} />
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => onTrackPress(item)}
        >
          {currentTrack?.id === item.id && isPlaying ? (
            <Pause color="#8b5cf6" size={20} />
          ) : (
            <Play color="#8b5cf6" size={20} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderAlbumItem = ({
    item,
    index,
  }: {
    item: AlbumResult;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity
        style={[
          styles.artistItem,
          styles.glassCard,
          styles.brutalBorder,
          styles.brutalShadow,
        ]}
        onPress={() => router.push(`/album/${item.id}` as const)}
      >
        <Image source={{ uri: item.coverUrl }} style={styles.albumImage} />
        <Text style={styles.artistName} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPlaylistItem = ({
    item,
    index,
  }: {
    item: PlaylistResult;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity
        style={[
          styles.artistItem,
          styles.glassCard,
          styles.brutalBorder,
          styles.brutalShadow,
        ]}
        onPress={() => router.push(`/playlist/${item.id}` as const)}
      >
        <Image source={{ uri: item.coverUrl }} style={styles.albumImage} />
        <Text style={styles.artistName} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderArtistItem = ({
    item,
    index,
  }: {
    item: Artist;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity
        style={[
          styles.artistItem,
          styles.glassCard,
          styles.brutalBorder,
          styles.brutalShadow,
        ]}
        onPress={() => router.push(`/artist/${item.id}` as const)}
      >
        <Image source={{ uri: item.avatar_url || '' }} style={styles.artistImage} />
        <Text style={styles.artistName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderUserItem = ({
    item,
    index,
  }: {
    item: UserResult;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity
        style={[
          styles.artistItem,
          styles.glassCard,
          styles.brutalBorder,
          styles.brutalShadow,
        ]}
        onPress={() => router.push(`/profile/${item.id}` as const)}
      >
        <Image
          source={{
            uri:
              item.avatar_url ||
              'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200',
          }}
          style={styles.artistImage}
        />
        <Text style={styles.artistName} numberOfLines={1}>
          {item.username}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const noResults =
    results.tracks.length === 0 &&
    results.albums.length === 0 &&
    results.playlists.length === 0 &&
    results.artists.length === 0 &&
    results.users.length === 0;

  if (noResults) {
    return (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsText}>
          {`No results found for "${query}"`}
        </Text>
        <Text style={styles.noResultsSubtext}>
          Try different keywords or check your spelling
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.resultsContainer}>
      {results.tracks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Songs</Text>
          <FlatList
            data={results.tracks}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {results.playlists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <FlatList
            data={results.playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {results.albums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>
          <FlatList
            data={results.albums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {results.artists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Artists</Text>
          <FlatList
            data={results.artists}
            renderItem={renderArtistItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {results.users.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users</Text>
          <FlatList
            data={results.users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 15,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  likeButton: {
    padding: 8,
    marginRight: 8,
  },
  playButton: {
    padding: 8,
  },
  artistItem: {
    alignItems: 'center',
    padding: 15,
    marginRight: 15,
    borderRadius: 15,
    width: 100,
  },
  artistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  albumImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 10,
  },
  artistName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
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
