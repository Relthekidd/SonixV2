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
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const musicResults = await searchMusic(searchQuery);
      setResults({
        tracks: musicResults.tracks || [],
        albums: musicResults.albums || [],
        singles: musicResults.singles || [],
        artists: musicResults.artists || [],
        users: musicResults.users || [],
      });
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

  const tabs = ['all','tracks','users','albums','artists'];
  const filteredResults =
    activeTab === 'tracks' ? { tracks: results.tracks } :
    activeTab === 'users' ? { users: results.users } :
    activeTab === 'albums' ? { albums: results.albums } :
    activeTab === 'artists' ? { artists: results.artists } : results;

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
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!isSearching && (
        <ScrollView style={styles.content}>
          {query === '' ? (
            <> ... </>
          ) : (
            Object.entries(filteredResults).map(([key, arr]) => (
              arr.length > 0 && key !== 'singles' && key !== 'artists' && (
                <View key={key} style={styles.section}> ... </View>
              )
            ))
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
  content: { flex:1 },
  section: { marginBottom:32, paddingHorizontal:24 },
  sectionTitle: { fontSize:20, color:'#fff', marginBottom:16 },
  trendingContainer: { flexDirection:'row', flexWrap:'wrap', marginBottom:16 },
  trendingItem: { backgroundColor:'rgba(139,92,246,0.2)', padding:8, borderRadius:20, margin:4 },
  trendingText: { color:'#8b5cf6' },
  resultItem: { flexDirection:'row', alignItems:'center', padding:12, marginHorizontal:24, marginBottom:8, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12 },
  resultImage: { width:50, height:50, borderRadius:8 },
  userImage: { borderRadius:25 },
  resultInfo: { flex:1, marginLeft:12 },
  resultTitle: { color:'#fff' },
  resultSubtitle: { color:'#94a3b8' },
  playButton: { padding:8 },
  userMeta: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  privacyIndicator: { marginLeft:8 },
  bottomPadding: { height:120 }
});

export default withAuthGuard(SearchScreen);
