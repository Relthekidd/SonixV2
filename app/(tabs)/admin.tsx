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
        colors={['#1a1a2e', '#16213e', '#0f3460']}
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
    { label: 'Upload Content', icon: Upload, route: '/admin/upload' },
    { label: 'View Uploads', icon: Plus, route: '/admin/uploads' },
    { label: 'Manage Artists', icon: Users, route: '/admin/artists' },
  ] as const;

  const statsCards = [
    { title: 'Users', value: stats.totalUsers, subtitle: `${stats.newUsersToday} today`, icon: Users },
    { title: 'Tracks', value: stats.totalTracks, subtitle: `${stats.newTracksToday} today`, icon: Music },
    { title: 'Plays', value: stats.totalPlays, subtitle: `${stats.playsToday} today`, icon: PlayCircle },
    { title: 'Artists', value: stats.totalArtists, subtitle: 'Active', icon: Users },
  ];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
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
                  <act.icon color="#fff" size={20} />
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
                <View style={styles.cardIcon}><card.icon color="#8b5cf6" size={24} /></View>
                <Text style={styles.cardValue}>{card.value.toLocaleString()}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
      <View style={styles.bottomPadding} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#94a3b8', marginTop: 12 },
  header: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, color: '#fff', fontFamily: 'Poppins-Bold' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  section: { marginBottom: 32, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 20, color: '#fff', marginBottom: 16, fontFamily: 'Poppins-SemiBold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    flex: 1,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    alignItems: 'center',
  },
  actionGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardValue: { fontSize: 22, color: '#fff', fontFamily: 'Poppins-Bold' },
  cardTitle: { fontSize: 14, color: '#94a3b8', fontFamily: 'Inter-Medium' },
  cardSubtitle: { fontSize: 12, color: '#10b981' },
  bottomPadding: { height: 120 },
});
