import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic } from '@/providers/MusicProvider';
import { useLibrary } from '@/providers/LibraryProvider';
import { useUserStats } from '@/hooks/useUserStats';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useFocusEffect } from 'expo-router';
import { Track } from '@/types';
import { commonStyles, spacing, colors } from '@/styles/commonStyles';
import {
  Play,
  TrendingUp,
  Clock,
  Star,
  User,
  Music,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import TrackItem from '@/components/TrackItem';

function HomeScreen() {
  const { playTrack, pauseTrack, currentTrack, isPlaying, trendingTracks } = useMusic();
  const { likedSongIds } = useLibrary();
  const { listeningTime, topSong, topArtist, playsCount, refreshStats } =
    useUserStats();
  const { playlists: featuredPlaylists, isLoading: playlistsLoading } = usePlaylists({
    isFeatured: true,
    isPublic: true,
    limit: 6,
  });

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats]),
  );

  const tracks = trendingTracks;

  const handleTrackPlay = (track: Track, list: Track[] = tracks) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track, list);
      }
    } else {
      playTrack(track, list);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.hero, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
        >
          <Text style={styles.heroTitle}>Welcome to Sonix</Text>
          <Text style={styles.heroSubtitle}>
            Fueling the Future of Independent Music.
          </Text>
        </Animated.View>

        {/* User Stats */}
        <View style={styles.statsGrid}>
          {[
            {
              Icon: Play,
              label: 'Tracks Played',
              value: playsCount.toString(),
              color: colors.success,
            },
            {
              Icon: Clock,
              label: 'Hours Listened',
              value: (listeningTime / 3600).toFixed(1),
              color: colors.warning,
            },
            {
              Icon: User,
              label: 'Top Artist',
              value: topArtist,
              color: colors.primary,
            },
            {
              Icon: Music,
              label: 'Top Song',
              value: topSong,
              color: colors.secondary,
            },
          ].map((stat, i) => (
            <Animated.View
              entering={FadeIn.delay(i * 100)}
              key={stat.label}
              style={[styles.statCard, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
            >
              <stat.Icon color={stat.color} size={32} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Featured Playlists */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={commonStyles.sectionHeader}>
            <Star color={colors.accent} size={20} />
            <Text style={commonStyles.sectionTitle}>Featured Playlists</Text>
          </View>
          {!playlistsLoading && (
            <View style={styles.playlistGrid}>
              {featuredPlaylists.slice(0, 6).map((pl, index) => (
                <Animated.View
                  entering={FadeInDown.delay(200 + index * 100)}
                  key={pl.id}
                  style={{ width: '32%' }}
                >
                  <TouchableOpacity
                    style={[styles.playlistCard, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}
                    onPress={() => router.push(`/playlist/${pl.id}` as const)}
                  >
                    <View style={[styles.playlistCover, commonStyles.brutalBorder]} />
                    <Text style={styles.playlistTitle}>{pl.title}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Trending Tracks */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <View style={commonStyles.sectionHeader}>
            <TrendingUp color={colors.accent} size={20} />
            <Text style={commonStyles.sectionTitle}>Trending Now</Text>
          </View>
          <View style={[styles.trackList, commonStyles.glassCard, commonStyles.brutalBorder, commonStyles.brutalShadow]}>
            {tracks.map((track, index) => (
              <Animated.View
                entering={FadeInDown.delay(400 + index * 50)}
                key={track.id}
              >
                <TrackItem
                  track={track}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPlay={() => handleTrackPlay(track, tracks)}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: spacing.xxl * 2.5 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    padding: spacing.lg, 
    paddingBottom: 110 
  },
  hero: {
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  heroTitle: {
    fontSize: 40,
    fontFamily: 'Poppins-Bold',
    color: colors.white,
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.white,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  section: { marginBottom: spacing.xl },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  playlistCard: {
    padding: spacing.md,
  },
  playlistCover: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playlistTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.white,
    textAlign: 'center',
  },
  trackList: {
    borderRadius: 16,
  },
});

export default withAuthGuard(HomeScreen);
