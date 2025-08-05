import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useMusic, Track } from '@/providers/MusicProvider';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Search, Play, Pause, Lock, Globe, Heart } from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { apiService } from '@/services/api';
import TrackMenu from '@/components/TrackMenu';

interface ArtistResult {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface UserResult {
  id: string;
  display_name: string;
  follower_count: number;
  is_private: boolean;
  profile_picture_url?: string | null;
}

interface TrackRow {
  id: string;
  title: string;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  album_id?: string | null;
  album?: { title?: string; cover_url?: string | null } | null;
  duration?: number | null;
  cover_url?: string | null;
  audio_url: string;
  genres?: string[] | string | null;
  release_date?: string | null;
  created_at?: string;
}

interface SearchResults {
  tracks: Track[];
  artists: ArtistResult[];
  users: UserResult[];
}

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    users: [],
  });
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<'relevance' | 'recent' | 'popular'>(
    'relevance',
  );

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    toggleLike,
    likedSongIds,
  } = useMusic();

  useEffect(() => {
    const fetchTrending = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('title')
        .eq('is_published', true)
        .order('play_count', { ascending: false })
        .limit(8);
      if (error) {
        console.error('fetch trending searches', error);
        return;
      }
      setTrendingSearches((data || []).map((t) => t.title));
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tracks: [], artists: [], users: [] });
      return;
    }
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, sort]);

  const handleSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`*, artist:artist_id(name), album:album_id(*)`)
        .ilike('title', `%${searchQuery}%`)
        .eq('is_published', true)
        .order(sort === 'popular' ? 'play_count' : 'created_at', {
          ascending: false,
        });
      if (error) throw error;
      const tracks = (data || []).map(
        (t: TrackRow): Track => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name || 'Unknown Artist',
          artistId: t.artist_id || undefined,
          album: t.album?.title || 'Single',
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
        }),
      );
      setResults({ tracks, artists: [], users: [] });
    } catch (err) {
      console.error('search error', err);
      setErrorMessage('Something went wrong');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrendingPress = (term: string) => setQuery(term);
  const handleTrackPress = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, results.tracks);
      }
    } else {
      playTrack(track, results.tracks);
    }
  };
  const handleToggleLike = (trackId: string) => toggleLike(trackId);

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
      onPress={() => router.push(`/track/${item.id}`)}
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
        onPress={() => handleToggleLike(item.id)}
      >
        <Heart
          color={item.isLiked ? '#ef4444' : '#94a3b8'}
          fill={item.isLiked ? '#ef4444' : 'transparent'}
          size={18}
        />
      </TouchableOpacity>
      <TrackMenu track={item} />
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handleTrackPress(item)}
      >
        {currentTrack?.id === item.id && isPlaying ? (
          <Pause color="#8b5cf6" size={20} />
        ) : (
          <Play color="#8b5cf6" size={20} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: ArtistResult }) => (
    <TouchableOpacity
      style={[
        styles.artistItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
      onPress={() => router.push(`/artist/${item.id}`)}
    >
      <Image
        source={{
          uri:
            item.avatar_url ||
            'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
        }}
        style={styles.artistImage}
      />
      <Text style={styles.artistName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <Image
        source={{
          uri:
            item.profile_picture_url ||
            'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
        }}
        style={[styles.resultImage, styles.userImage]}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.display_name}
        </Text>
        <View style={styles.userMeta}>
          <Text style={styles.resultSubtitle}>
            {item.follower_count} followers
          </Text>
          <View style={styles.privacyIndicator}>
            {item.is_private ? (
              <Lock size={12} color="#94a3b8" />
            ) : (
              <Globe size={12} color="#94a3b8" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Header */}
          <Animated.View entering={FadeIn} style={styles.searchHeader}>
            <Text style={styles.title}>Search</Text>
            <View style={styles.searchContainer}>
              <Search color="#8b5cf6" size={20} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for songs, artists, or users..."
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </Animated.View>

          {/* Sort Options */}
          {query.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(100)}
              style={styles.sortContainer}
            >
              {(['relevance', 'recent', 'popular'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortButton,
                    sort === option && styles.sortButtonActive,
                  ]}
                  onPress={() => setSort(option)}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sort === option && styles.sortButtonTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Loading */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          )}

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Search Results */}
          {query.length > 0 && !isSearching && (
            <Animated.View
              entering={FadeInDown.delay(200)}
              style={styles.resultsContainer}
            >
              {/* Tracks Section */}
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

              {/* Artists Section */}
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

              {/* Users Section */}
              {results.users.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Users</Text>
                  <FlatList
                    data={results.users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* No Results */}
              {results.tracks.length === 0 &&
                results.artists.length === 0 &&
                results.users.length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No results found for &quot;{query}&quot;
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                      Try different keywords or check your spelling
                    </Text>
                  </View>
                )}
            </Animated.View>
          )}

          {/* Trending Searches */}
          {query.length === 0 && (
            <Animated.View
              entering={FadeInDown.delay(300)}
              style={styles.trendingContainer}
            >
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <View style={styles.trendingGrid}>
                {trendingSearches.map((term, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.trendingItem,
                      styles.glassCard,
                      styles.brutalBorder,
                      styles.brutalShadow,
                    ]}
                    onPress={() => handleTrendingPress(term)}
                  >
                    <Text style={styles.trendingText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 100, // Extra padding at bottom
  },
  searchHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#ffffff',
    marginBottom: 20,
    // Removed textShadow as it's not supported in React Native
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  sortButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  sortButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
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
  userImage: {
    borderRadius: 25,
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
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyIndicator: {
    padding: 2,
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
  trendingContainer: {
    padding: 20,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trendingItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  trendingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
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

export default withAuthGuard(SearchScreen);
