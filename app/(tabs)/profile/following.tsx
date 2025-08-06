import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
}

type Row = { following: UserItem };

export default function FollowingScreen() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<UserItem[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_follows')
        .select('following:profiles!user_follows_following_id_fkey(id, username, avatar_url)')
        .eq('follower_id', user.id);
      setFollowing(((data as Row[]) || []).map((d) => d.following));
    };
    load();
  }, [user]);

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
      </View>
      <FlatList
        data={following}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
            onPress={() => router.push(`/user/${item.id}` as const)}
          >
            {item.avatar_url ? (
              <Image
                source={{ uri: apiService.getPublicUrl('images', item.avatar_url) }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatar} />
            )}
            <Text style={styles.username}>{item.username}</Text>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 50,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e293b',
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
