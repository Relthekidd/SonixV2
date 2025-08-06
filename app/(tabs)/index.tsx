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
import { useMusic, Track } from '@/providers/MusicProvider';
import { useUserStats } from '@/hooks/useUserStats';
import { useFocusEffect } from 'expo-router';
import {
  Play,
  TrendingUp,
  Clock,
  Star,
  User,
  Music,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import TrackItem from '@/components/TrackItem';

interface FeaturedPlaylist {
  id: string;
  title: string;
  description: string;
  cover: string;
}

function HomeScreen() {
  const { playTrack, pauseTrack, currentTrack, isPlaying, trendingTracks } =
    useMusic();
  const { listeningTime, topSong, topArtist, playsCount, refreshStats } =
    useUserStats();
  const [featuredPlaylists, setFeaturedPlaylists] = useState<
    FeaturedPlaylist[]
  >([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('id,title,description,cover_url')
        .eq('is_featured', true)
        .eq('is_public', true);
      if (error) {
        console.error('fetch featured playlists', error);
        return;
      }
      const mapped = (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        cover: apiService.getPublicUrl('images', p.cover_url || ''),
      }));
      setFeaturedPlaylists(mapped);
    };
    fetchFeatured();
  }, []);

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
          style={[
            styles.hero,
            styles.glassCard,
            styles.brutalBorder,
            styles.brutalShadow,
          ]}
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
              color: '#22c55e',
            },
            {
              Icon: Clock,
              label: 'Hours Listened',
              value: (listeningTime / 3600).toFixed(1),
              color: '#fb923c',
            },
            {
              Icon: User,
              label: 'Top Artist',
              value: topArtist,
              color: '#3b82f6',
            },
            {
              Icon: Music,
              label: 'Top Song',
              value: topSong,
              color: '#8b5cf6',
            },
          ].map((stat, i) => (
            <Animated.View
              entering={FadeIn.delay(i * 100)}
              key={stat.label}
              style={[
                styles.statCard,
                styles.glassCard,
                styles.brutalBorder,
                styles.brutalShadow,
              ]}
            >
              <stat.Icon color={stat.color} size={32} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Featured Playlists */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star color="#a78bfa" size={20} />
            <Text style={styles.sectionTitle}>Featured Playlists</Text>
          </View>
          <View style={styles.playlistGrid}>
            {featuredPlaylists.map((pl, index) => (
              <Animated.View
                entering={FadeInDown.delay(200 + index * 100)}
                key={pl.id}
                style={{ width: '32%' }}
              >
                <TouchableOpacity
                  style={[
                    styles.playlistCard,
                    styles.glassCard,
                    styles.brutalBorder,
                    styles.brutalShadow,
                  ]}
                >
                  <View style={[styles.playlistCover, styles.brutalBorder]} />
                  <Text style={styles.playlistTitle}>{pl.title}</Text>
                  <Text style={styles.playlistDesc}>{pl.description}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Trending Tracks */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp color="#a78bfa" size={20} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          <View
            style={[
              styles.trackList,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
          >
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

        <View style={{ height: 120 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 110 },
  hero: {
    padding: 24,
    marginTop: 32,
    marginBottom: 32,
    alignItems: 'center', // centers children horizontally
    justifyContent: 'center', // centers children vertically
    minHeight: 180, // 👈 add this for vertical centering
  },
  heroTitle: {
    fontSize: 40,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e1e1e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  section: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginLeft: 8,
  },
  playlistGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playlistCard: {
    padding: 16,
  },
  playlistCover: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playlistTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
    marginBottom: 4,
  },
  playlistDesc: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  trackList: {
    borderRadius: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brutalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default withAuthGuard(HomeScreen);
