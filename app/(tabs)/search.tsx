import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  useMusic
} from '@/providers/MusicProvider';
import { useLibrary } from '@/providers/LibraryProvider';
import { useTracks } from '@/hooks/useTracks';
import { Search } from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { Track, Artist, AlbumResult, PlaylistResult, UserResult } from '@/types';
import { commonStyles, spacing, colors } from '@/styles/commonStyles';
import SearchResults, {
  SearchResultsData,
} from '@/components/SearchResults';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultsData>({
    tracks: [],
    albums: [],
    playlists: [],
    artists: [],
    users: [],
  });
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<'relevance' | 'recent' | 'popular'>(
    'relevance',
  );
  const { likedSongIds } = useLibrary();

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    searchMusic,
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
      setResults({
        tracks: [],
        albums: [],
        playlists: [],
        artists: [],
        users: [],
      });
      return;
    }
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, sort]);

  const handleSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchMusic(
        searchQuery,
        sort === 'popular' ? 'popular' : 'recent',
      );
      setResults({
        tracks: res.tracks,
        albums: res.albums,
        playlists: res.playlists,
        artists: res.artists,
        users: res.users,
      });
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
  
  const { toggleLike } = useLibrary();

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
                placeholder="Search for songs, albums, artists, or users..."
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
            <Animated.View entering={FadeInDown.delay(200)}>
              <SearchResults
                results={results}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTrackPress={handleTrackPress}
                onToggleLike={toggleLike}
                query={query}
              />
            </Animated.View>
          )}

          {/* Trending Searches */}
          {query.length === 0 && (
            <Animated.View
              entering={FadeInDown.delay(300)}
              style={styles.trendingContainer}
            >
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              {trendingSearches.length > 0 ? (
                <View style={styles.trendingGrid}>
                  {trendingSearches.map((term, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.trendingItem, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
                      onPress={() => handleTrendingPress(term)}
                    >
                      <Text style={styles.trendingText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={commonStyles.emptyState}>
                  <Text style={commonStyles.emptyText}>No trending searches</Text>
                  <Text style={commonStyles.emptySubtext}>
                    Start searching to discover music
                  </Text>
                </View>
              )}
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
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: 120,
  },
  searchHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: colors.white,
    marginBottom: spacing.lg,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: `${colors.primary}50`,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}50`,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    color: colors.gray400,
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.md,
  },
  trendingContainer: {
    padding: spacing.lg,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  trendingItem: {
    width: '48%',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignItems: 'center',
  },
  trendingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default withAuthGuard(SearchScreen);
