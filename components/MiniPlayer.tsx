import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '@/providers/MusicProvider';
import { router } from 'expo-router';
import { Play, Pause, SkipForward, Heart } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export function MiniPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    nextTrack,
    toggleLike,
    likedSongs 
  } = useMusic();

  if (!currentTrack) return null;

  const isLiked = likedSongs.some(track => track.id === currentTrack.id);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(currentTrack);
    }
  };

  const openFullPlayer = () => {
    router.push('/player');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.9)', 'rgba(168, 85, 247, 0.9)']}
        style={styles.gradient}
      >
        <TouchableOpacity 
          style={styles.content}
          onPress={openFullPlayer}
          activeOpacity={0.8}
        >
          <Image 
            source={{ uri: currentTrack.coverUrl }} 
            style={styles.albumArt} 
          />
          
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => toggleLike(currentTrack.id)}
            >
              <Heart 
                color={isLiked ? '#ef4444' : '#ffffff'} 
                size={20}
                fill={isLiked ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePlayPause}
            >
              {isPlaying ? (
                <Pause color="#ffffff" size={24} />
              ) : (
                <Play color="#ffffff" size={24} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={nextTrack}
            >
              <SkipForward color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    height: 72,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});