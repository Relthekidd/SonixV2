import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMusic } from '@/providers/MusicProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Play, Pause, Heart, Share, MoveVertical as MoreVertical, Clock } from 'lucide-react-native';

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      loadTrackDetails();
    }
  }, [id]);

  const loadTrackDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const trackData = await apiService.getTrackById(id!);
      setTrack(transformTrack(trackData));
    } catch (err) {
      console.error('Error loading track details:', err);
      setError('Failed to load track details');
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
    lyrics: apiTrack.lyrics,
  });

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
    } catch (error) {
      console.error('Error toggling like:', error);
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

  const isLiked = track ? likedSongs.some(song => song.id === track.id) : false;

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading track...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !track) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Track not found'}</Text>
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
        <View style={styles.trackHeader}>
          <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
          
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>
          <Text style={styles.album}>{track.album}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
          >
            <Heart 
              color={isLiked ? '#ef4444' : '#ffffff'} 
              size={24}
              fill={isLiked ? '#ef4444' : 'transparent'}
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

          <TouchableOpacity style={styles.shareButton}>
            <Share color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Clock color="#94a3b8" size={16} />
            <Text style={styles.detailText}>Duration: {formatDuration(track.duration)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Genre:</Text>
            <Text style={styles.detailText}>{track.genre}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Released:</Text>
            <Text style={styles.detailText}>{formatDate(track.releaseDate)}</Text>
          </View>
          
          {track.playCount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plays:</Text>
              <Text style={styles.detailText}>{track.playCount.toLocaleString()}</Text>
            </View>
          )}
          
          {track.likeCount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Likes:</Text>
              <Text style={styles.detailText}>{track.likeCount.toLocaleString()}</Text>
            </View>
          )}
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
  trackHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  coverImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 4,
  },
  album: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  controls: {
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
  details: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
    marginRight: 8,
  },
  detailText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginLeft: 8,
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