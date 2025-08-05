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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useMusic, Track } from '@/providers/MusicProvider';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Search, Play, Pause, Lock, Globe, Heart } from 'lucide-react-native';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { apiService } from '@/services/api';

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
  const [results, setResults] = useState<SearchResults>({ tracks: [], artists: [], users: [] });
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<'relevance' | 'recent' | 'popular'>('relevance');

  const { currentTrack, isPlaying, playTrack, pauseTrack, toggleLike, likedSongs } = useMusic();

  useEffect(() => {
    setTrendingSearches([
      'Electronic Music',
      'Chill Vibes',
      'Hip Hop',
      'Indie Rock',
      'Jazz',
      'Classical',
      'Pop Hits',
      'R&B',
    ]);
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
        .order(sort === 'popular' ? 'play_count' : 'created_at', { ascending: false });
      if (error) throw error;
      const tracks = (data || []).map((t: TrackRow): Track => ({
        id: t.id,
        title: t.title,
        artist: t.artist?.name || 'Unknown Artist',
        artistId: t.artist_id || undefined,
        album: t.album?.title || 'Single',
        albumId: t.album_id || undefined,
        duration: t.duration || 0,
        coverUrl: apiService.getPublicUrl('images', t.cover_url || t.album?.cover_url || ''),
        audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
        isLiked: likedSongs.some((l) => l.id === t.id),
        genre: Array.isArray(t.genres) ? t.genres[0] : (t.genres as string) || '',
        releaseDate: t.release_date || t.created_at || '',
      }));
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
      isPlaying ? pauseTrack() : playTrack(track, results.tracks);
    } else {
      playTrack(track, results.tracks);
    }
  };
  const handleToggleLike = (trackId: string) => toggleLike(trackId);

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={[styles.resultItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
      onPress={() => router.push(`/track/${item.id}`)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{item.artist} • Song</Text>
      </View>
      <TouchableOpacity style={styles.likeButton} onPress={() => handleToggleLike(item.id)}>
        <Heart color={item.isLiked ? '#ef4444' : '#94a3b8'} fill={item.isLiked ? '#ef4444' : 'transparent'} size={18} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.playButton} onPress={() => handleTrackPress(item)}>
        {currentTrack?.id === item.id && isPlaying ? <Pause color="#8b5cf6" size={20} /> : <Play color="#8b5cf6" size={20} />}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: ArtistResult }) => (
    <TouchableOpacity style={[styles.artistItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]} onPress={() => router.push(`/artist/${item.id}`)}>
      <Image source={{ uri: item.avatar_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg' }} style={styles.artistImage} />
      <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: UserResult }) => (
    <TouchableOpacity style={[styles.resultItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]} onPress={() => router.push(`/user/${item.id}`)}>
      <Image source={{ uri: item.profile_picture_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg' }} style={[styles.resultImage, styles.userImage]} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.display_name}</Text>
        <View style={styles.userMeta}>
          <Text style={styles.resultSubtitle}>{item.follower_count} followers</Text>
          <View style={styles.privacyIndicator}>{item.is_private ? <Lock size={12} /> : <Globe size={12} />}</View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[ '#0f172a', '#1e293b', '#0f172a' ]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Search</n
