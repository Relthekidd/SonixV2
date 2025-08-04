import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '@/providers/MusicProvider';
import { router } from 'expo-router';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  MoreHorizontal,
  Volume1,
  Volume2,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
    toggleLike,
    likedSongs,
    queue,
    volume,
    setVolume,
  } = useMusic();

  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    scaleValue.value = withTiming(isPlaying ? 1.05 : 1, { duration: 300 });
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  if (!currentTrack) {
    router.back();
    return null;
  }

  const isLiked = likedSongs.some((track) => track.id === currentTrack.id);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(currentTrack);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRepeat = () => {
    setRepeatMode((prev) => (prev + 1) % 3);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Image
        source={{ uri: currentTrack.coverUrl }}
        style={styles.backgroundImage}
        blurRadius={20}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
        style={styles.overlay}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ChevronDown color="#ffffff" size={28} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Now Playing</Text>

        <TouchableOpacity style={styles.headerButton}>
          <MoreHorizontal color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.albumArtContainer, animatedStyle]}>
          <Image
            source={{ uri: currentTrack.coverUrl }}
            style={styles.albumArt}
          />
        </Animated.View>

        <View style={styles.trackInfo}>
          <Text style={styles.title}>{currentTrack.title}</Text>
          <Text style={styles.artist}>{currentTrack.artist}</Text>
          <Text style={styles.album}>{currentTrack.album}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
            <View
              style={[styles.progressThumb, { left: `${progress * 100}%` }]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsShuffled(!isShuffled)}
          >
            <Shuffle color={isShuffled ? '#8b5cf6' : '#ffffff'} size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={previousTrack}
          >
            <SkipBack color="#ffffff" size={32} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <LinearGradient
              colors={['#8b5cf6', '#a855f7']}
              style={styles.playButtonGradient}
            >
              {isPlaying ? (
                <Pause color="#ffffff" size={32} />
              ) : (
                <Play color="#ffffff" size={32} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={nextTrack}>
            <SkipForward color="#ffffff" size={32} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleRepeat}>
            <Repeat color={repeatMode > 0 ? '#8b5cf6' : '#ffffff'} size={24} />
            {repeatMode === 2 && <View style={styles.repeatOneDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => toggleLike(currentTrack.id)}
          >
            <Heart
              color={isLiked ? '#ef4444' : '#ffffff'}
              size={24}
              fill={isLiked ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.volumeContainer}>
          <TouchableOpacity
            style={styles.volumeButton}
            onPress={() => setVolume(volume - 0.1)}
          >
            <Volume1 color="#ffffff" size={20} />
          </TouchableOpacity>
          <View style={styles.volumeBar}>
            <View
              style={[styles.volumeFill, { width: `${volume * 100}%` }]}
            />
          </View>
          <TouchableOpacity
            style={styles.volumeButton}
            onPress={() => setVolume(volume + 0.1)}
          >
            <Volume2 color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {queue.length > 1 && (
          <View style={styles.queueContainer}>
            <Text style={styles.queueTitle}>Up Next</Text>
            <FlatList
              data={queue.filter((t) => t.id !== currentTrack.id)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.queueItem}>
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={styles.queueCover}
                  />
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.queueItemArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
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
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-around',
  },
  albumArtContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  albumArt: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 4,
  },
  album: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 12,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    marginLeft: -8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  repeatOneDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 4,
    height: 4,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  bottomControls: {
    alignItems: 'center',
  },
  bottomButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  volumeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  queueContainer: {
    marginTop: 10,
    maxHeight: 120,
  },
  queueTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  queueInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  queueItemArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
});
