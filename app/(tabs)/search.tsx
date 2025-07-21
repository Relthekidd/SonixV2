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
import { router } from 'expo-router';
import { Search, Play, Pause, Music, User, Disc, Users, Lock, Globe } from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';

interface SearchResults {
  tracks: any[];
  albums: any[];
  singles: any[];
  artists: any[];
  users: any[];
}

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    tracks: [], albums: [], singles: [], artists: [], users: []
  });
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<'relevance' | 'recent' | 'popular'>('relevance');
  const [genre, setGenre] = useState<string | null>(null);

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
    const load = async () => {
      setTrendingSearches([
        'Electronic Music', 'Chill Vibes', 'Hip Hop', 'Indie Rock',
        'Jazz', 'Classical', 'Pop Hits', 'R&B'
      ]);
    };
    load();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tracks: [], albums: [], singles: [], artists: [], users: [] });
      return;
    }
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, sort, genre]);

  const handleSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const musicResults = await searchMusic(searchQuery);
      setResults({
        tracks: musicResults.tracks || [],
        albums: musicResults.albums || [],
        singles: musicResults.singles || [],
        artists: musicResults.artists || [],
        users: musicResults.users || [],
      });
    } catch (err) {
      console.error('search error', err);
      setErrorMessage('Something went wrong');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrendingPress = (trending: string) => {
    setQuery(trending);
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, results.tracks);
    } else {
      playTrack(track, results.tracks);
    }
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/track/${item.id}`)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{item.artist} • Song</Text>
      </View>
      <TouchableOpacity style={styles.playButton} onPress={() => handleTrackPress(item)}>
        {currentTrack?.id === item.id && isPlaying ? (
          <Pause color="#8b5cf6" size={20} />
        ) : (
          <Play color="#8b5cf6" size={20} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => router.push(`/user/${item.id}`)}>
      <Image
        source={{ uri: item.profile_picture_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg' }}
        style={[styles.resultImage, styles.userImage]}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.display_name}</Text>
        <View style={styles.userMeta}>
          <Text style={styles.resultSubtitle}>{item.role} • {item.follower_count} followers</Text>
          <View style={styles.privacyIndicator}>
            {item.is_private ? <Lock size={12} /> : <Globe size={12} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.artistItem}
      onPress={() => router.push(`/artist/${item.id}`)}
    >
      <Image
        source={{
          uri: item.avatar_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
        }}
        style={styles.artistImage}
      />
      <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );


  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for songs, people, albums..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={styles.filterRow}>
          {['relevance', 'recent', 'popular'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterOption, sort === f && styles.filterOptionActive]}
              onPress={() => setSort(f as any)}
            >
              <Text style={styles.filterText}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {errorMessage && !isSearching && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {!isSearching && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {query.trim() === '' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <View style={styles.trendingContainer}>
                {trendingSearches.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.trendingItem}
                    onPress={() => handleTrendingPress(t)}
                  >
                    <Text style={styles.trendingText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <>
              {results.tracks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Songs</Text>
                  <FlatList
                    data={results.tracks}
                    renderItem={renderTrackItem}
                    keyExtractor={(i) => i.id}
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
                    keyExtractor={(i) => i.id}
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
                    keyExtractor={(i) => i.id}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {results.tracks.length === 0 &&
                results.artists.length === 0 &&
                results.users.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No results found</Text>
                  </View>
                )}
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.bottomPadding} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding:24, paddingTop:60, paddingBottom:16 },
  title: { fontSize:28, fontFamily:'Poppins-Bold', color:'#fff' },
  searchContainer: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12, alignItems:'center' },
  searchInput: { flex:1, marginLeft:8, color:'#fff' },
  loadingContainer: { flex:1, justifyContent:'center', alignItems:'center' },
  loadingText: { color:'#94a3b8', marginTop:12 },
  errorContainer: { padding:24, alignItems:'center' },
  errorText: { color:'#ef4444' },
  content: { flex:1 },
  section: { marginBottom:32, paddingHorizontal:24 },
  sectionTitle: { fontSize:20, color:'#fff', marginBottom:16 },
  trendingContainer: { flexDirection:'row', flexWrap:'wrap', marginBottom:16 },
  trendingItem: { backgroundColor:'rgba(139,92,246,0.2)', padding:8, borderRadius:20, margin:4 },
  trendingText: { color:'#8b5cf6' },
  filterRow: { flexDirection:'row', gap:8, marginTop:12 },
  filterOption: { paddingVertical:6, paddingHorizontal:12, borderRadius:20, backgroundColor:'rgba(255,255,255,0.05)' },
  filterOptionActive: { backgroundColor:'rgba(139,92,246,0.3)' },
  filterText: { color:'#fff', fontSize:12 },
  resultItem: { flexDirection:'row', alignItems:'center', padding:12, marginHorizontal:24, marginBottom:8, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12 },
  resultImage: { width:50, height:50, borderRadius:8 },
  userImage: { borderRadius:25 },
  resultInfo: { flex:1, marginLeft:12 },
  resultTitle: { color:'#fff' },
  resultSubtitle: { color:'#94a3b8' },
  playButton: { padding:8 },
  userMeta: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  privacyIndicator: { marginLeft:8 },
  emptyState: { alignItems:'center', marginTop:40 },
  emptyText: { color:'#94a3b8' },
  artistItem: { alignItems:'center', marginRight:16 },
  artistImage: { width:80, height:80, borderRadius:40, marginBottom:8 },
  artistName: { color:'#fff', maxWidth:80, textAlign:'center' },
  bottomPadding: { height:120 }
});

export default withAuthGuard(SearchScreen);
