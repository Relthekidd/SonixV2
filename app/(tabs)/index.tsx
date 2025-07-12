import React, { useEffect } from 'react';
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
    trendingTracks, 
    newReleases, 
    recentlyPlayed, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    isLoading,
    error,
    refreshData
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
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, trendingTracks);
      }
    } else {
      playTrack(track, trendingTracks);
    }
    
    // Navigate to track detail page
    router.push(`/track/${track.id}`);
  };

  const renderTrackItem = ({ item }: { item: any }) => {
    console.log('🖼️ Rendering track item:', item.title, 'Cover URL:', item.coverUrl);
    
    return (
      <TouchableOpacity 
        style={styles.trackItem}
        onPress={() => handleTrackPress(item)}
      >
        <Image 
          source={{ uri: item.coverUrl || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400' }} 
          style={styles.trackCover}
          onError={(error) => {
            console.error('❌ Image load error for:', item.title, error.nativeEvent.error);
          }}
          onLoad={() => {
            console.log('✅ Image loaded for:', item.title);
          }}
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          {item.playCount && (
            <Text style={styles.trackStats}>
              {item.playCount?.toLocaleString() || '0'} plays
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
  };

  const renderAlbumItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.albumItem}>
      <Image 
        source={{ uri: item.coverUrl || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400' }} 
        style={styles.albumCover}
        onError={(error) => {
          console.error('❌ Album image load error for:', item.title, error.nativeEvent.error);
        }}
      />
      <Text style={styles.albumTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.albumArtist} numberOfLines={1}>
        {item.artist} <Text>•</Text> {item.year || '2024'}
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
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'morning' : 'evening'}
            </Text>
            <Text style={styles.username}>{user?.displayName || 'Music Lover'}</Text>
          </View>
          
          {error && (
            <TouchableOpacity style={styles.errorButton} onPress={refreshData}>
              <RefreshCw color="#ef4444" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <FlatList
              data={recentlyPlayed.slice(0, 5)}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          {trendingTracks.length > 0 ? (
            <FlatList
              data={trendingTracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No trending tracks available</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
                <RefreshCw color="#8b5cf6" size={20} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Releases</Text>
          {newReleases.length > 0 ? (
            <FlatList
              data={newReleases}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No new releases available</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 4,
  },
  username: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  errorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 24,
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
    marginBottom: 2,
  },
  trackStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalList: {
    paddingHorizontal: 24,
  },
  albumItem: {
    width: 140,
    marginRight: 16,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  albumTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  refreshButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 120,
  },
});