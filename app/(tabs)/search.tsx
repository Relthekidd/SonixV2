import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '@/providers/MusicProvider';
import { Search, Play, Pause } from 'lucide-react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ tracks: [], albums: [], playlists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const { 
    searchMusic, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    trendingTracks 
  } = useMusic();

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
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
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
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {query === '' ? (
          <>
            <Text style={styles.sectionTitle}>Browse by Genre</Text>
            <FlatList
              data={genres}
              renderItem={renderGenreItem}
              keyExtractor={(item) => item}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.genreGrid}
            />
            
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
              <Text style={styles.loadingText}>Searching...</Text>
            )}
            
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
              <Text style={styles.noResults}>No results found for "{query}"</Text>
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
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
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
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  },
  noResults: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  },
  bottomPadding: {
    height: 120,
  },
});