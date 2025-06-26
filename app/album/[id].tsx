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
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Play, Pause, Heart, Share as ShareIcon, MoreVertical, Calendar, Music, Clock } from 'lucide-react-native';

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    toggleLike,
    likedSongs 
  } = useMusic();

  useEffect(() => {
    if (id) {
      loadAlbumDetails();
    }
  }, [id]);

  const loadAlbumDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const albumData = await apiService.getAlbumById(id!);
      setAlbum(albumData);
      
      // Transform tracks for playback
      const transformedTracks = albumData.tracks?.map((track: any, index: number) => ({
        id: track.id,
        title: track.title,
        artist: albumData.artist_name || albumData.artist || 'Unknown Artist',
        album: albumData.title,
        duration: track.duration || 180,
        coverUrl: albumData.cover_url || 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
        audioUrl: track.audio_url,
        isLiked: likedSongs.some(liked => liked.id === track.id),
        genre: Array.isArray(albumData.genres) ? albumData.genres[0] : albumData.genre || 'Unknown',
        releaseDate: albumData.release_date || new Date().toISOString(),
        trackNumber: index + 1,
        playCount: track.play_count,
        likeCount: track.like_count,
      })) || [];
      
      setTracks(transformedTracks);
    } catch (err) {
      console.error('Error loading album details:', err);
      setError('Failed to load album details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${album.title}" by ${album.artist_name}`,
        url: `https://sonix.app/album/${id}`,
      });
    } catch (error) {
      console.error('Error sharing album:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalDuration = () => {
    return tracks.reduce((total, track) => total + (track.duration || 0), 0);
  };

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <View style={styles.trackNumber}>
        <Text style={styles.trackNumberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trackMeta}>
          <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
          {item.playCount && (
            <Text style={styles.trackStats}>
              • {item.playCount.toLocaleString()} plays
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => toggleLike(item.id)}
      >
        <Heart 
          color={item.isLiked ? '#ef4444' : '#94a3b8'} 
          size={20}
          fill={item.isLiked ? '#ef4444' : 'transparent'}
        />
      </TouchableOpacity>

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
          <Text style={styles.loadingText}>Loading album...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !album) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Album not found'}</Text>
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
        
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <ShareIcon color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.albumHeader}>
          <Image 
            source={{ 
              uri: album.cover_url || 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400' 
            }} 
            style={styles.albumCover} 
          />
          
          <Text style={styles.albumTitle}>{album.title}</Text>
          <Text style={styles.albumArtist}>{album.artist_name || album.artist}</Text>
          
          {album.description && (
            <Text style={styles.albumDescription}>{album.description}</Text>
          )}

          <View style={styles.albumMeta}>
            <View style={styles.metaItem}>
              <Calendar color="#94a3b8" size={16} />
              <Text style={styles.metaText}>
                {album.release_date ? formatDate(album.release_date) : '2024'}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Music color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{tracks.length} tracks</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Clock color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{formatDuration(getTotalDuration())}</Text>
            </View>
          </View>

          {album.genres && album.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {album.genres.map((genre: string, index: number) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAlbum}>
            <LinearGradient
              colors={['#8b5cf6', '#a855f7']}
              style={styles.playAllGradient}
            >
              <Play color="#ffffff" size={24} />
              <Text style={styles.playAllText}>Play Album</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.tracksSection}>
          <Text style={styles.sectionTitle}>Tracklist</Text>
          
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
              <Text style={styles.emptySubtext}>This album doesn't have any tracks yet</Text>
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
  albumHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  albumCover: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  albumTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  albumArtist: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  albumDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  albumMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
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
  controlsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  playAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  playAllGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  playAllText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  tracksSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
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
  trackNumber: {
    width: 32,
    alignItems: 'center',
  },
  trackNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
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
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  trackStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginLeft: 4,
  },
  likeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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