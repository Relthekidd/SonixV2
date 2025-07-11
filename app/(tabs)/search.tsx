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
import { supabase } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { Search, Play, Pause, Music, User, Disc, Users, Lock, Globe } from 'lucide-react-native';

interface SearchResults {
  tracks: any[];
  albums: any[];
  singles: any[];
  artists: any[];
  users: any[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ 
    tracks: [], 
    albums: [], 
    singles: [], 
    artists: [], 
    users: [] 
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    trendingTracks,
    searchMusic,
    error 
  } = useMusic();

  useEffect(() => {
    loadTrendingSearches();
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setResults({ tracks: [], albums: [], singles: [], artists: [], users: [] });
      setSuggestions([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const loadTrendingSearches = async () => {
    try {
      // Mock trending searches for now
      setTrendingSearches([
        'Electronic Music',
        'Chill Vibes',
        'Hip Hop',
        'Indie Rock',
        'Jazz',
        'Classical',
        'Pop Hits',
        'R&B'
      ]);
    } catch (error) {
      console.error('Error loading trending searches:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim() === '') {
      setResults({ tracks: [], albums: [], singles: [], artists: [], users: [] });
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Starting search for:', searchQuery);
      
      // Search users
      const { data: usersData, error: usersError } = await supabase
        .rpc('search_users', { 
          search_query: searchQuery, 
          limit_count: 20 
        });

      if (usersError) {
        console.error('❌ Error searching users:', usersError);
      }

      // Search tracks using the MusicProvider's search function
      const musicResults = await searchMusic(searchQuery);
      
      console.log('🎵 Music search results:', musicResults);
      console.log('👥 User search results:', usersData);

      setResults({
        tracks: musicResults.tracks || [],
        albums: musicResults.albums || [],
        singles: musicResults.singles || [],
        artists: [],
        users: usersData || [],
      });
      setSuggestions([]);
    } catch (error) {
      console.error('❌ Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrendingPress = (trending: string) => {
    setQuery(trending);
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

  const handleUserPress = (user: any) => {
    router.push(`/user/${user.id}`);
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
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

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleUserPress(item)}
    >
      <Image 
        source={{ 
          uri: item.profile_picture_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400' 
        }} 
        style={[styles.resultImage, styles.userImage]} 
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.display_name}
        </Text>
        <View style={styles.userMeta}>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.role} • {item.follower_count} followers
          </Text>
          <View style={styles.privacyIndicator}>
            {item.is_private ? (
              <Lock color="#f59e0b" size={12} />
            ) : (
              <Globe color="#10b981" size={12} />
            )}
          </View>
        </View>
      </View>
      <View style={styles.followIndicator}>
        {item.is_following && (
          <Text style={styles.followingText}>Following</Text>
        )}
        <User color="#94a3b8" size={20} />
      </View>
    </TouchableOpacity>
  );

  const renderGenreItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.genreItem}
      onPress={() => handleTrendingPress(item)}
    >
      <LinearGradient
        colors={['#8b5cf6', '#a855f7']}
        style={styles.genreGradient}
      >
        <Text style={styles.genreText}>{item}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const tabs = [
    { id: 'all', title: 'All' },
    { id: 'tracks', title: 'Songs' },
    { id: 'users', title: 'People' },
    { id: 'albums', title: 'Albums' },
    { id: 'artists', title: 'Artists' },
  ];

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'tracks':
        return { tracks: results.tracks };
      case 'users':
        return { users: results.users };
      case 'albums':
        return { albums: results.albums };
      case 'artists':
        return { artists: results.artists };
      default:
        return results;
    }
  };

  const filteredResults = getFilteredResults();

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
            placeholder="Search for songs, people, albums..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#8b5cf6" style={styles.loadingIcon} />
          )}
        </View>
      </View>

      {query !== '' && (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
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
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
              data={trendingSearches.slice(0, 6)}
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
                {filteredResults.tracks && filteredResults.tracks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Songs</Text>
                    <FlatList
                      data={filteredResults.tracks}
                      renderItem={renderTrackItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {filteredResults.users && filteredResults.users.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>People</Text>
                    <FlatList
                      data={filteredResults.users}
                      renderItem={renderUserItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {!isSearching && 
                 Object.values(filteredResults).every(arr => arr.length === 0) && 
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
  tabBar: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
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
  },
  activeTabText: {
    color: '#8b5cf6',
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
  userImage: {
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
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyIndicator: {
    marginLeft: 8,
  },
  followIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  followingText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#10b981',
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