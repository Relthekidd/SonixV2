import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';

interface TopItem {
  id: string;
  title?: string;
  name?: string;
  play_count?: number;
  total_plays?: number;
  monthly_listeners?: number;
}

interface AnalyticsData {
  top_tracks: TopItem[];
  top_artists: TopItem[];
  recent_users: any[];
}

export default function AdminAnalyticsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc('get_admin_statistics');
    if (!error && Array.isArray(data) && data[0]) {
      setData(data[0] as any);
    }
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if ((user?.role as any) !== 'admin') {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.center}>
          <Text style={styles.text}>Access denied. Admin only.</Text>
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </LinearGradient>
    );
  }

  const renderTrack = ({ item }: { item: TopItem }) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemValue}>{item.play_count}</Text>
    </View>
  );

  const renderArtist = ({ item }: { item: TopItem }) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemTitle}>{item.name}</Text>
      <Text style={styles.itemValue}>{item.total_plays}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Top Tracks</Text>
            <FlatList
              data={data?.top_tracks || []}
              keyExtractor={(i) => i.id}
              renderItem={renderTrack}
            />
            <Text style={styles.sectionTitle}>Top Artists</Text>
          </>
        }
        data={data?.top_artists || []}
        keyExtractor={(i) => i.id}
        renderItem={renderArtist}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backButton: { width: 24, height: 24 },
  title: { color: '#fff', fontSize: 20, fontFamily: 'Poppins-SemiBold' },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemTitle: { color: '#fff', flex: 1 },
  itemValue: { color: '#94a3b8' },
});
