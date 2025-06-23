import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Users, Music, BarChart3, Settings, Shield } from 'lucide-react-native';

export default function AdminScreen() {
  const { user } = useAuth();

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
      id: 'artists',
      title: 'Artist Applications',
      description: 'Review and approve artist applications',
      icon: Users,
      color: '#8b5cf6',
      route: '/(admin)/artists',
    },
    {
      id: 'content',
      title: 'Content Management',
      description: 'Manage tracks, albums, and playlists',
      icon: Music,
      color: '#10b981',
      route: '/admin/content',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View platform statistics and insights',
      icon: BarChart3,
      color: '#f59e0b',
      route: '/admin/analytics',
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

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Manage your platform</Text>
        </View>

        <View style={styles.optionsContainer}>
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
  optionsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
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