import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import { Users, Music, Upload, ChartBar as BarChart3, Settings, Shield, Plus, TrendingUp, CirclePlay as PlayCircle, Heart, Calendar } from 'lucide-react-native';

interface AdminStats {
  totalUsers: number;
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  newUsersToday: number;
  tracksUploadedToday: number;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTracks: 0,
    totalPlays: 0,
    totalLikes: 0,
    newUsersToday: 0,
    tracksUploadedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - replace with actual API calls
      setStats({
        totalUsers: 1247,
        totalTracks: 3892,
        totalPlays: 45678,
        totalLikes: 12456,
        newUsersToday: 23,
        tracksUploadedToday: 8,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAdminStats();
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (user?.role !== 'admin') {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Shield color="#ef4444" size={64} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You don't have permission to access this area.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const adminOptions = [
    {
      id: 'upload-content',
      title: 'Upload Content',
      description: 'Upload singles, albums, and manage tracks',
      icon: Upload,
      color: '#8b5cf6',
      route: '/admin/upload',
    },
    {
      id: 'artists',
      title: 'Artist Management',
      description: 'Review and approve artist applications',
      icon: Users,
      color: '#10b981',
      route: '/(admin)/artists',
    },
    {
      id: 'content-management',
      title: 'Content Management',
      description: 'Manage tracks, albums, and playlists',
      icon: Music,
      color: '#f59e0b',
      route: '/admin/content',
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'View platform statistics and insights',
      icon: BarChart3,
      color: '#06b6d4',
      route: '/admin/analytics',
    },
    {
      id: 'playlists',
      title: 'App Playlists',
      description: 'Create and manage featured playlists',
      icon: Music,
      color: '#ec4899',
      route: '/admin/playlists',
    },
    {
      id: 'settings',
      title: 'Platform Settings',
      description: 'Configure platform-wide settings',
      icon: Settings,
      color: '#ef4444',
      route: '/admin/settings',
    },
  ];

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: `+${stats.newUsersToday} today`,
      icon: Users,
      color: '#8b5cf6',
    },
    {
      title: 'Total Tracks',
      value: stats.totalTracks.toLocaleString(),
      change: `+${stats.tracksUploadedToday} today`,
      icon: Music,
      color: '#10b981',
    },
    {
      title: 'Total Plays',
      value: stats.totalPlays.toLocaleString(),
      change: '+2.3k today',
      icon: PlayCircle,
      color: '#f59e0b',
    },
    {
      title: 'Total Likes',
      value: stats.totalLikes.toLocaleString(),
      change: '+456 today',
      icon: Heart,
      color: '#ef4444',
    },
  ];

  if (isLoading) {
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

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.subtitle}>Manage your music platform</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/admin/upload')}
            >
              <LinearGradient
                colors={['#8b5cf6', '#a855f7']}
                style={styles.quickActionGradient}
              >
                <Plus color="#ffffff" size={24} />
                <Text style={styles.quickActionText}>Upload Content</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/admin/playlists')}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.quickActionGradient}
              >
                <Music color="#ffffff" size={24} />
                <Text style={styles.quickActionText}>Create Playlist</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            {statsCards.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon color={stat.color} size={24} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statChange}>{stat.change}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Admin Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Management Tools</Text>
          {adminOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
                <option.icon color={option.color} size={24} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <TrendingUp color="#94a3b8" size={20} />
            </TouchableOpacity>
          ))}
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
  scrollView: {
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
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
    marginBottom: 4,
    textAlign: 'center',
  },
  statChange: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10b981',
  },
  optionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 120,
  },
});