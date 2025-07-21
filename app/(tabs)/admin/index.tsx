import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import {
  Users,
  Music,
  Upload,
  ChartBar as BarChart3,
  Settings,
  Plus,
  TrendingUp,
  CirclePlay as PlayCircle,
  Check,
} from 'lucide-react-native';

interface AdminStats {
  totalUsers: number;
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
  totalPlays: number;
  totalLikes: number;
  newUsersToday: number;
  newTracksToday: number;
  playsToday: number;
}

export default function AdminScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTracks: 0,
    totalAlbums: 0,
    totalArtists: 0,
    totalPlays: 0,
    totalLikes: 0,
    newUsersToday: 0,
    newTracksToday: 0,
    playsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, user]);

  const loadAdminStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_statistics');
      if (error) throw error;
      if (Array.isArray(data) && data[0]) {
        const s = data[0] as any;
        setStats({
          totalUsers: +s.total_users || 0,
          totalTracks: +s.total_tracks || 0,
          totalAlbums: +s.total_albums || 0,
          totalArtists: +s.total_artists || 0,
          totalPlays: +s.total_plays || 0,
          totalLikes: +s.total_likes || 0,
          newUsersToday: +s.new_users_today || 0,
          newTracksToday: +s.new_tracks_today || 0,
          playsToday: +s.plays_today || 0,
        });
      }
    } catch {
      // fallback manual counts
      const [
        { count: u },
        { count: t },
        { count: a },
        { count: ar },
        { count: p },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('tracks').select('*', { count: 'exact', head: true }),
        supabase.from('albums').select('*', { count: 'exact', head: true }),
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('song_plays').select('*', { count: 'exact', head: true }),
      ]);
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: nu },
        { count: nt },
        { count: pt },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('tracks').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('song_plays').select('*', { count: 'exact', head: true }).gte('created_at', today),
      ]);
      setStats({
        totalUsers: u || 0,
        totalTracks: t || 0,
        totalAlbums: a || 0,
        totalArtists: ar || 0,
        totalPlays: p || 0,
        totalLikes: 0,
        newUsersToday: nu || 0,
        newTracksToday: nt || 0,
        playsToday: pt || 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdminStats();
    setRefreshing(false);
  }, [loadAdminStats]);

  if (authLoading || isLoading) {
    return (
      <LinearGradient
        colors={['#0f172a', '#111827', '#0b1120']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  const quickActions = [
    { label: 'Upload Single', icon: Upload, route: '/admin/upload?type=single' },
    { label: 'Upload Album', icon: Plus, route: '/admin/upload?type=album' },
    { label: 'View Uploads', icon: Music, route: '/admin/uploads' },
  ] as const;

  const statsCards = [
    { title: 'Users', value: stats.totalUsers, subtitle: `${stats.newUsersToday} today`, icon: Users },
    { title: 'Tracks', value: stats.totalTracks, subtitle: `${stats.newTracksToday} today`, icon: Music },
    { title: 'Plays', value: stats.totalPlays, subtitle: `${stats.playsToday} today`, icon: PlayCircle },
    { title: 'Artists', value: stats.totalArtists, subtitle: 'Active', icon: Users },
  ];

  return (
    <LinearGradient
      colors={['#0f172a', '#111827', '#0b1120']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
        >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Overview & Tools</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((act) => (
              <TouchableOpacity
                key={act.label}
                style={styles.actionBtn}
                onPress={() => router.push(act.route as any)}
              >
                <LinearGradient
                  colors={["#8b5cf6", "#a855f7"]}
                  style={styles.actionGradient}
                >
                  <act.icon color="#fff" size={24} />
                </LinearGradient>
                <Text style={styles.actionText}>{act.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Stats</Text>
          <View style={styles.statsGrid}>
            {statsCards.map((card) => (
              <View key={card.title} style={styles.card}>
                <View style={styles.cardIcon}>
                  <card.icon color="#8b5cf6" size={24} />
                </View>
                <Text style={styles.cardValue}>{card.value.toLocaleString()}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Admin Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Tools</Text>
          <View style={styles.toolsList}>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/admin/uploads')}>
              <Music color="#8b5cf6" size={24} />
              <Text style={styles.toolText}>Manage Uploads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/admin/verify-artists')}>
              <Check color="#8b5cf6" size={24} />
              <Text style={styles.toolText}>Verify Artists</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/admin/users')}>
              <Users color="#8b5cf6" size={24} />
              <Text style={styles.toolText}>Manage Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/admin/analytics')}>
              <BarChart3 color="#8b5cf6" size={24} />
              <Text style={styles.toolText}>View Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#94a3b8', marginTop: 12 },
  header: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, color: '#fff', fontFamily: 'Poppins-Bold' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  section: { marginBottom: 32, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 20, color: '#fff', marginBottom: 16, fontFamily: 'Poppins-SemiBold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    alignItems: 'center',
  },
  actionGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardValue: { fontSize: 22, color: '#fff', fontFamily: 'Poppins-Bold' },
  cardTitle: { fontSize: 14, color: '#94a3b8', fontFamily: 'Inter-Medium' },
  cardSubtitle: { fontSize: 12, color: '#10b981' },
  toolsList: { gap: 12 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  toolText: { color: '#fff', fontFamily: 'Inter-Regular', fontSize: 16 },
});
