import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { router } from 'expo-router';

export default function UploadsScreen() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadUploads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tracks')
      .select('id,title,is_published,album_id,created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setUploads(data || []);
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUploads();
    setRefreshing(false);
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#111827', '#0b1120']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 120,
          }}
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
        <Text style={styles.title}>My Uploads</Text>
        {uploads.map((u) => (
          <TouchableOpacity
            key={u.id}
            style={styles.item}
            onPress={() => router.push(`/track/${u.id}`)}
          >
            <Text style={styles.itemTitle}>{u.title}</Text>
            <Text style={styles.itemStatus}>
              {u.is_published ? 'Published' : 'Unpublished'}
            </Text>
          </TouchableOpacity>
        ))}
        {uploads.length === 0 && (
          <Text style={styles.empty}>No uploads yet.</Text>
        )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
    fontFamily: 'Poppins-Bold',
  },
  item: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemTitle: { color: '#fff', fontSize: 16 },
  itemStatus: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  empty: { color: '#94a3b8', marginTop: 20 },
});
