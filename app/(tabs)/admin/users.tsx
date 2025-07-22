import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';

interface UserItem {
  id: string;
  display_name: string;
  email: string;
  role: string;
  artist_verified: boolean;
  created_at: string;
}

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, email, role, artist_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setUsers(data || []);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const toggleVerify = async (id: string, current: boolean) => {
    setProcessingId(id);
    const { error } = await supabase
      .from('users')
      .update({ artist_verified: !current })
      .eq('id', id);
    if (!error) {
      setUsers((u) =>
        u.map((x) => (x.id === id ? { ...x, artist_verified: !current } : x)),
      );
    }
    setProcessingId(null);
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

  const renderItem = ({ item }: { item: UserItem }) => (
    <View style={styles.item}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.display_name || item.email}</Text>
        <Text style={styles.meta}>{item.role}</Text>
      </View>
      {item.role === 'artist' && (
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={() => toggleVerify(item.id, item.artist_verified)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Check color="#fff" size={16} />
          )}
          <Text style={styles.verifyText}>
            {item.artist_verified ? 'Unverify' : 'Verify'}
          </Text>
        </TouchableOpacity>
      )}
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
        <Text style={styles.title}>Users</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={renderItem}
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
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  info: { flex: 1 },
  name: { color: '#fff', fontFamily: 'Inter-Medium' },
  meta: { color: '#94a3b8', fontSize: 12 },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  verifyText: { color: '#fff', fontSize: 12 },
});
