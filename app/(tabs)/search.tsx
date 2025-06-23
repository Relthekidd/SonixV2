import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { Search, Play, Pause } from 'lucide-react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ tracks: [], albums: [], playlists: [] });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const { 
    searchMusic, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    trendingTracks,
    error 
  } = useMusic();

  useEffect(() => {
    loadTrendingSearches();
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setResults({ tracks: [], albums: [], playlists: [] });
      setSuggestions([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      loadSuggestions(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const loadTrendingSearches = async () => {
    try {
      const trending = await apiService.getTrendingSearches(8);
      setTrendingSearches(trending);
    } catch (error) {
      console.error('Error loading trending searches:', error);
    }
  };

  const loadSuggestions = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return;
    
    setIsLoadingSuggestions(true);
    try {
      const suggestionResults = await apiService.getSearchSuggestions(searchQuery, 5);
      setSuggestions(suggestionResults.map(item => item.title || item.name || item.stage_name));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim() === '') {
      setResults({ tracks: [], albums: [], playlists: [] });
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchMusic(searchQuery);
      setResults(searchResults);
      setSuggestions([]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const handleTrendingPress = (trending: string) => {
    handleSearch(trending);
  };

  const handleTrackPress = (track: any) => {
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

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist} • {item.album}
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

  const renderAlbumItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.albumItem}>
      <Image source={{ uri: item.coverUrl }} style={styles.albumCover} />
      <Text style={styles.albumTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.albumArtist} numberOfLines={1}>
        {item.artist} • {item.year}
      </Text>
    </TouchableOpacity>
  );

  const renderGenreItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.genreItem}
      onPress={() => handleSearch(item)}
    >
      <LinearGradient
        colors={['#8b5cf6', '#a855f7']}
        style={styles.genreGradient}
      >
        <Text style={styles.genreText}>{item}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const genres = ['Electronic', 'Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Indie', 'R&B'];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchContainer}>
          <Search color="#94a3b8" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            autoCapitalize="none"
          />
          {isLoadingSuggestions && (
            <ActivityIndicator size="small" color="#8b5cf6" style={styles.loadingIcon} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Search Suggestions */}
        {suggestions.length > 0 && query.trim() !== '' && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Search color="#94a3b8" size={16} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query === '' ? (
          <>
            {/* Trending Searches */}
            {trendingSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Searches</Text>
                <View style={styles.trendingContainer}>
                  {trendingSearches.map((trending, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.trendingItem}
                      onPress={() => handleTrendingPress(trending)}
                    >
                      <Text style={styles.trendingText}>{trending}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Browse by Genre */}
            <Text style={styles.sectionTitle}>Browse by Genre</Text>
            <FlatList
              data={genres}
              renderItem={renderGenreItem}
              keyExtractor={(item) => item}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.genreGrid}
            />
            
            {/* Popular Tracks */}
            <Text style={styles.sectionTitle}>Popular Tracks</Text>
            <FlatList
              data={trendingTracks.slice(0, 5)}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </>
        ) : (
          <>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            )}
            
            {!isSearching && (
              <>
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

                {results.albums.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Albums</Text>
                    <FlatList
                      data={results.albums}
                      renderItem={renderAlbumItem}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                    />
                  </View>
                )}

                {!isSearching && results.tracks.length === 0 && results.albums.length === 0 && query !== '' && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResults}>No results found for "{query}"</Text>
                    <Text style={styles.noResultsSubtext}>Try searching for something else</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginLeft: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  trendingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 8,
  },
  trendingItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  trendingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
  },
  genreGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  genreItem: {
    flex: 1,
    margin: 6,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  genreGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 12,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResults: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 120,
  },
});