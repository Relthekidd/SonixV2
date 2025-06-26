import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Play, Pause, Heart, Share as ShareIcon, Calendar, Music, Clock } from 'lucide-react-native';

export default function SingleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [single, setSingle] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
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
      loadSingleDetails();
    }
  }, [id]);

  const loadSingleDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, use the tracks endpoint to get single data
      // Replace with actual singles endpoint when available
      const singleData = await apiService.getTrackById(id!);
      setSingle(singleData);
      
      // Transform track for playback
      const transformedTrack = {
        id: singleData.id,
        title: singleData.title,
        artist: singleData.artist_name || singleData.artist || 'Unknown Artist',
        album: singleData.album || 'Single',
        duration: singleData.duration || 180,
        coverUrl: singleData.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
        audioUrl: singleData.audio_url,
        isLiked: likedSongs.some(liked => liked.id === singleData.id),
        genre: Array.isArray(singleData.genres) ? singleData.genres[0] : singleData.genre || 'Unknown',
        releaseDate: singleData.release_date || singleData.created_at || new Date().toISOString(),
        playCount: singleData.play_count,
        likeCount: singleData.like_count,
        lyrics: singleData.lyrics,
      };
      
      setTrack(transformedTrack);
    } catch (err) {
      console.error('Error loading single details:', err);
      setError('Failed to load single details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!track) return;
    
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, [track]);
      }
    } else {
      playTrack(track, [track]);
    }
  };

  const handleLike = async () => {
    if (!track) return;
    
    try {
      await toggleLike(track.id);
      setTrack(prev => prev ? { ...prev, isLiked: !prev.isLiked } : null);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${single.title}" by ${single.artist_name}`,
        url: `https://sonix.app/single/${id}`,
      });
    } catch (error) {
      console.error('Error sharing single:', error);
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

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading single...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !single || !track) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Single not found'}</Text>
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
        <View style={styles.singleHeader}>
          <Image 
            source={{ uri: track.coverUrl }} 
            style={styles.singleCover} 
          />
          
          <Text style={styles.singleTitle}>{track.title}</Text>
          <Text style={styles.singleArtist}>{track.artist}</Text>
          
          {single.description && (
            <Text style={styles.singleDescription}>{single.description}</Text>
          )}

          <View style={styles.singleMeta}>
            <View style={styles.metaItem}>
              <Calendar color="#94a3b8" size={16} />
              <Text style={styles.metaText}>
                {formatDate(track.releaseDate)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Clock color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{formatDuration(track.duration)}</Text>
            </View>
            
            {track.playCount && (
              <View style={styles.metaItem}>
                <Music color="#94a3b8" size={16} />
                <Text style={styles.metaText}>{track.playCount.toLocaleString()} plays</Text>
              </View>
            )}
          </View>

          {single.genres && single.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {single.genres.map((genre: string, index: number) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
          >
            <Heart 
              color={track.isLiked ? '#ef4444' : '#ffffff'} 
              size={24}
              fill={track.isLiked ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
          >
            <LinearGradient
              colors={['#8b5cf6', '#a855f7']}
              style={styles.playButtonGradient}
            >
              {currentTrack?.id === track.id && isPlaying ? (
                <Pause color="#ffffff" size={32} />
              ) : (
                <Play color="#ffffff" size={32} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <ShareIcon color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>

        {track.lyrics && (
          <View style={styles.lyricsSection}>
            <Text style={styles.lyricsTitle}>Lyrics</Text>
            <Text style={styles.lyricsText}>{track.lyrics}</Text>
          </View>
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
  singleHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  singleCover: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  singleTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  singleArtist: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  singleDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  singleMeta: {
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  likeButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 24,
  },
  lyricsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  lyricsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  lyricsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 120,
  },
});