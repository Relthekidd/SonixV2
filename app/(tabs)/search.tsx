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
import { router } from 'expo-router';
import { Search, Play, Pause, Music, User, Disc } from 'lucide-react-native';

interface SearchResults {
  tracks: any[];
  albums: any[];
  singles: any[];
  artists: any[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ tracks: [], albums: [], singles: [], artists: [] });
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
      setResults({ tracks: [], albums: [], singles: [], artists: [] });
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
      setResults({ tracks: [], albums: [], singles: [], artists: [] });
      return;
    }

    setIsSearching(true);
    try {
      // Search all content types
      const [tracksResult, albumsResult, singlesResult, artistsResult] = await Promise.all([
        apiService.search(searchQuery, 'tracks', 20),
        apiService.search(searchQuery, 'albums', 10),
        apiService.getSingles({ limit: 10 }), // Mock singles search
        apiService.search(searchQuery, 'artists', 10),
      ]);

      setResults({
        tracks: tracksResult.tracks || [],
        albums: albumsResult.albums || [],
        singles: singlesResult.filter((single: any) => 
          single.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [],
        artists: artistsResult.artists || [],
      });
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

  const handleAlbumPress = (album: any) => {
    router.push(`/album/${album.id}`);
  };

  const handleSinglePress = (single: any) => {
    router.push(`/single/${single.id}`);
  };

  const handleArtistPress = (artist: any) => {
    router.push(`/artist/${artist.id}`);
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleTrackPress(item)}
    >
      <Image source={{ uri: item.coverUrl || item.cover_url }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.artist} • Song
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
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleAlbumPress(item)}
    >
      <Image source={{ uri: item.coverUrl || item.cover_url }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.artist} • Album
        </Text>
      </View>
      <Disc color="#94a3b8" size={20} />
    </TouchableOpacity>
  );

  const renderSingleItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleSinglePress(item)}
    >
      <Image source={{ uri: item.coverUrl || item.cover_url }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.artist} • Single
        </Text>
      </View>
      <Music color="#94a3b8" size={20} />
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleArtistPress(item)}
    >
      <Image source={{ uri: item.avatar_url || item.coverUrl }} style={[styles.resultImage, styles.artistImage]} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.stage_name || item.name}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          Artist
        </Text>
      </View>
      <User color="#94a3b8" size={20} />
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
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {results.singles.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Singles</Text>
                    <FlatList
                      data={results.singles}
                      renderItem={renderSingleItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
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
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {!isSearching && 
                 results.tracks.length === 0 && 
                 results.albums.length === 0 && 
                 results.singles.length === 0 && 
                 results.artists.length === 0 && 
                 query !== '' && (
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
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  artistImage: {
    borderRadius: 25,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  resultSubtitle: {
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