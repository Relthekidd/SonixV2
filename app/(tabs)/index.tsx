import React from 'react';
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
import { useMusic } from '@/providers/MusicProvider';
import { Play, Pause, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuth();
  const {
    // give these arrays a safe default
    trendingTracks = [],
    newReleases = [],
    recentlyPlayed = [],
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    isLoading,
    error,
    refreshData,
  } = useMusic();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, trendingTracks);
    } else {
      playTrack(track, trendingTracks);
    }
    router.push(`/track/${track.id}`);
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)}>
      <Image
        source={{ uri: item.coverUrl }}
        style={styles.trackCover}
        onError={(e) =>
          console.error('❌ Image load error for:', item.title, e.nativeEvent.error)
        }
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        {item.playCount != null && (
          <Text style={styles.trackStats}>
            {(item.playCount ?? 0).toLocaleString()} plays
          </Text>
        )}
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

  const renderAlbumItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.albumItem}>
      <Image
        source={{ uri: item.coverUrl }}
        style={styles.albumCover}
        onError={(e) =>
          console.error('❌ Album image load error for:', item.title, e.nativeEvent.error)
        }
      />
      <Text style={styles.albumTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {/* Flattened into single Text */}
      <Text style={styles.albumArtist} numberOfLines={1}>
        {item.artist} • {item.year || '2024'}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && trendingTracks.length === 0) {
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

        {/* Error Banner */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <FlatList
              data={recentlyPlayed.slice(0, 5)}
              renderItem={renderTrackItem}
              keyExtractor={(i) => i.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Trending */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          {trendingTracks.length > 0 ? (
            <FlatList
              data={trendingTracks}
              renderItem={renderTrackItem}
              keyExtractor={(i) => i.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No trending tracks available
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
        </View>

        {/* New Releases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Releases</Text>
          {newReleases.length > 0 ? (
            <FlatList
              data={newReleases}
              renderItem={renderAlbumItem}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No new releases available
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  /* ... your existing styles unchanged ... */
});```

**Key Changes**  
- **Destructure with defaults**:  
  ```;ts
  const {
    trendingTracks = [],
    newReleases = [],
    recentlyPlayed = [],
     } = useMusic();
