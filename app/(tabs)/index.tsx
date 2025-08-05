import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { useMusic, Track } from '@/providers/MusicProvider';
import { useUserStats } from '@/hooks/useUserStats';
import { Play, TrendingUp, Clock, Star, User, Music } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const featuredPlaylists = [
  {
    id: '1',
    title: "Today's Hits",
    description: 'The hottest tracks right now',
    cover: '',
  },
  { id: '2', title: 'Chill Vibes', description: 'Relax and unwind', cover: '' },
  { id: '3', title: 'Workout Mix', description: 'High energy beats', cover: '' },
];

const mockTrending: Track[] = [
  {
    id: '1',
    title: 'Midnight Drive',
    artist: 'Neon Dreams',
    album: '',
    duration: 185,
    coverUrl: '',
    audioUrl: '',
    isLiked: false,
    genre: '',
    releaseDate: '',
  },
  {
    id: '2',
    title: 'Electric Soul',
    artist: 'Cyber Punk',
    album: '',
    duration: 203,
    coverUrl: '',
    audioUrl: '',
    isLiked: false,
    genre: '',
    releaseDate: '',
  },
  {
    id: '3',
    title: 'Digital Love',
    artist: 'Synth Wave',
    album: '',
    duration: 176,
    coverUrl: '',
    audioUrl: '',
    isLiked: false,
    genre: '',
    releaseDate: '',
  },
];

function HomeScreen() {
  const { playTrack, trendingTracks } = useMusic();
  const { stats } = useUserStats();

  const tracks = trendingTracks.length > 0 ? trendingTracks : mockTrending;

  const handlePlay = (track: Track, list: Track[] = tracks) => {
    playTrack(track, list);
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
      value: stats.playsCount.toString(),
      color: '#22c55e',
    },
    {
      Icon: Clock,
      label: 'Hours Listened',
      value: (stats.totalTime / 3600).toFixed(1),
      color: '#fb923c',
    },
    {
      Icon: User,
      label: 'Top Artist',
      value: stats.topArtist,
      color: '#3b82f6',
    },
    {
      Icon: Music,
      label: 'Top Song',
      value: stats.topSong,
      color: '#8b5cf6',
    },
  ].map((stat, i) => (
    <Animated.View 
      entering={FadeIn.delay(i * 100)} 
      key={stat.label}
      style={[styles.statCard, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
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
                <TouchableOpacity
                  style={[
                    styles.trackRow,
                    index !== tracks.length - 1 && styles.trackRowBorder,
                  ]}
                  onPress={() => handlePlay(track, tracks)}
                >
                  <View style={[styles.trackCover, styles.brutalBorder]}>
                    {track.coverUrl ? (
                      <Image
                        source={{ uri: track.coverUrl }}
                        style={styles.trackImage}
                      />
                    ) : (
                      <Play color="#8b5cf6" size={20} />
                    )}
                  </View>
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                  <Text style={styles.trackDuration}>
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.trackAction, styles.brutalBorder]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePlay(track, tracks);
                    }}
                  >
                    <Play color="#8b5cf6" size={16} />
                  </TouchableOpacity>
                </TouchableOpacity>
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
  alignItems: 'center',         // centers children horizontally
  justifyContent: 'center',     // centers children vertically
  minHeight: 180,               // 👈 add this for vertical centering
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
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  trackRowBorder: {
    borderBottomWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trackImage: { width: 48, height: 48, borderRadius: 12 },
  trackInfo: { flex: 1 },
  trackTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  trackDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginRight: 8,
  },
  trackAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
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

