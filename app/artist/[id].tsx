import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Play, Pause, Users, Music, Heart, MoveVertical as MoreVertical } from 'lucide-react-native';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [artist, setArtist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack 
  } = useMusic();

  useEffect(() => {
    if (id) {
      loadArtistDetails();
    }
  }, [id]);

  const loadArtistDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [artistData, tracksData] = await Promise.all([
        apiService.getArtistById(id!),
        apiService.getArtistTracks(id!)
      ]);
      
      setArtist(artistData);
      setTracks(tracksData.map(transformTrack));
    } catch (err) {
      console.error('Error loading artist details:', err);
      setError('Failed to load artist details');
    } finally {
      setIsLoading(false);
    }
  };

  const transformTrack = (apiTrack: any) => ({
    id: apiTrack.id,
    title: apiTrack.title,
    artist: apiTrack.artist_name || apiTrack.artist || 'Unknown Artist',
    album: apiTrack.album || 'Unknown Album',
    duration: apiTrack.duration,
    coverUrl: apiTrack.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: apiTrack.audio_url,
    isLiked: apiTrack.is_liked || false,
    genre: Array.isArray(apiTrack.genres) ? apiTrack.genres[0] : apiTrack.genre || 'Unknown',
    releaseDate: apiTrack.created_at || apiTrack.release_date || new Date().toISOString(),
    playCount: apiTrack.play_count,
    likeCount: apiTrack.like_count,
  });

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, tracks);
      }
    } else {
      playTrack(track, tracks);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
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
        <Text style={styles.trackAlbum} numberOfLines={1}>
          {item.album}
        </Text>
        {item.playCount && (
          <Text style={styles.trackStats}>
            {item.playCount.toLocaleString()} plays
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

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading artist...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !artist) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Artist not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton}>
          <MoreVertical color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.artistHeader}>
          <Image 
            source={{ 
              uri: artist.avatar_url || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400' 
            }} 
            style={styles.artistImage} 
          />
          
          <Text style={styles.artistName}>{artist.stage_name}</Text>
          
          {artist.bio && (
            <Text style={styles.artistBio}>{artist.bio}</Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Users color="#8b5cf6" size={20} />
              <Text style={styles.statValue}>
                {artist.monthly_listeners ? artist.monthly_listeners.toLocaleString() : '0'}
              </Text>
              <Text style={styles.statLabel}>Monthly Listeners</Text>
            </View>
            
            <View style={styles.statItem}>
              <Music color="#8b5cf6" size={20} />
              <Text style={styles.statValue}>{tracks.length}</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
            
            <View style={styles.statItem}>
              <Heart color="#8b5cf6" size={20} />
              <Text style={styles.statValue}>
                {artist.total_plays ? artist.total_plays.toLocaleString() : '0'}
              </Text>
              <Text style={styles.statLabel}>Total Plays</Text>
            </View>
          </View>

          {artist.genres && artist.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {artist.genres.map((genre: string, index: number) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.tracksSection}>
          <View style={styles.tracksSectionHeader}>
            <Text style={styles.sectionTitle}>Popular Tracks</Text>
            {tracks.length > 0 && (
              <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
                <Play color="#ffffff" size={16} />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            )}
          </View>

          {tracks.length > 0 ? (
            <FlatList
              data={tracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Music color="#64748b" size={48} />
              <Text style={styles.emptyText}>No tracks available</Text>
              <Text style={styles.emptySubtext}>This artist hasn't uploaded any tracks yet</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  backButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  artistHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  artistImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#8b5cf6',
  },
  artistName: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  artistBio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  genreText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
  },
  tracksSection: {
    paddingHorizontal: 24,
  },
  tracksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  playAllText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
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
  trackAlbum: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 120,
  },
});