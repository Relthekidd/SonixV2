import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMusic, Track } from '@/providers/MusicProvider';
import { Play, Pause, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { withAuthGuard } from '@/hoc/withAuthGuard';

function HomeScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    trendingTracks,
    newReleases,
    recentlyPlayed,
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    isLoading: musicLoading,
    error,
    refreshData,
  } = useMusic();

  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, user]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  // Play/pause logic
  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, trendingTracks);
      }
    } else {
      playTrack(track, trendingTracks);
    }
  };

  // Loading state
  if (authLoading || musicLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading your music...</Text>
        </View>
      </LinearGradient>
    );
  }

  const nothingToShow =
    recentlyPlayed.length === 0 &&
    trendingTracks.length === 0 &&
    newReleases.length === 0;

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'morning' : 'evening'}
            </Text>
            <Text style={styles.username}>
              {user?.displayName || 'Music Lover'}
            </Text>
          </View>
          {error && (
            <TouchableOpacity style={styles.errorButton} onPress={refreshData}>
              <RefreshCw color="#ef4444" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* Display error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* If no content and no error */}
        {nothingToShow && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No music found. Try refreshing.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshData}
            >
              <RefreshCw color="#8b5cf6" size={20} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <FlatList
              data={recentlyPlayed.slice(0, 5)}
              renderItem={({ item }) => (
                <TrackItem
                  item={item}
                  onPress={handleTrackPress}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Trending Now */}
        {trendingTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <FlatList
              data={trendingTracks}
              renderItem={({ item }) => (
                <TrackItem
                  item={item}
                  onPress={handleTrackPress}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* New Releases */}
        {newReleases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Releases</Text>
            <FlatList
              data={newReleases}
              horizontal
              renderItem={({ item }) => <AlbumItem item={item} />}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomPadding} />
    </LinearGradient>
  );
}

interface TrackItemProps {
  item: Track;
  onPress: (track: Track) => void;
  isPlaying: boolean;
  currentTrack: Track | null;
}

function TrackItem({ item, onPress, isPlaying, currentTrack }: TrackItemProps) {
  return (
    <TouchableOpacity style={styles.trackItem} onPress={() => onPress(item)}>
      <Image
        source={{
          uri:
            item.coverUrl ||
            'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg',
        }}
        style={styles.trackCover}
      />
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
}

interface AlbumItemProps {
  item: Track;
}

function AlbumItem({ item }: AlbumItemProps) {
  return (
    <TouchableOpacity style={styles.albumItem}>
      <Image
        source={{
          uri:
            item.coverUrl ||
            'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg',
        }}
        style={styles.albumCover}
      />
      <Text style={styles.albumTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.albumArtist} numberOfLines={1}>
        {item.artist} • {item.year || new Date().getFullYear()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 4,
  },
  username: { fontSize: 28, fontFamily: 'Poppins-Bold', color: '#fff' },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  trackCover: { width: 50, height: 50, borderRadius: 8 },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  trackArtist: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#94a3b8' },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumItem: { width: 140, marginRight: 16 },
  albumCover: { width: 140, height: 140, borderRadius: 12, marginBottom: 8 },
  albumTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#fff' },
  albumArtist: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#94a3b8' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  refreshButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  errorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 24,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  bottomPadding: { height: 120 },
});

export default withAuthGuard(HomeScreen);
