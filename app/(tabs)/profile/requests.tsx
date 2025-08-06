import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { router } from 'expo-router';
import { ArrowLeft, Check, X } from 'lucide-react-native';

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
}
interface RequestItem {
  id: string;
  user: UserItem;
}

type IncomingRow = { id: string; requester: UserItem };
type OutgoingRow = { id: string; requested: UserItem };

export default function FollowRequestsScreen() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<RequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<RequestItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: incomingData } = await supabase
        .from('follower_requests')
        .select('id, requester:profiles!follower_requests_requester_id_fkey(id, username, avatar_url)')
        .eq('requested_id', user.id);
      setIncoming(
        ((incomingData as IncomingRow[]) || []).map((r) => ({ id: r.id, user: r.requester }))
      );

      const { data: outgoingData } = await supabase
        .from('follower_requests')
        .select('id, requested:profiles!follower_requests_requested_id_fkey(id, username, avatar_url)')
        .eq('requester_id', user.id);
      setOutgoing(
        ((outgoingData as OutgoingRow[]) || []).map((r) => ({ id: r.id, user: r.requested }))
      );
    };
    load();
  }, [user]);

  const respond = async (id: string, accept: boolean) => {
    await supabase.rpc('respond_to_follow_request', { request_id: id, accept });
    setIncoming((prev) => prev.filter((r) => r.id !== id));
  };

  const renderItem = ({ item }: { item: RequestItem }) => (
    <View style={[styles.requestItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
      {item.user.avatar_url ? (
        <Image
          source={{ uri: apiService.getPublicUrl('images', item.user.avatar_url) }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatar} />
      )}
      <Text style={styles.username}>{item.user.username}</Text>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.accept]}
          onPress={() => respond(item.id, true)}
        >
          <Check color="#fff" size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deny]}
          onPress={() => respond(item.id, false)}
        >
          <X color="#fff" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPending = ({ item }: { item: RequestItem }) => (
    <View style={[styles.requestItem, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
      {item.user.avatar_url ? (
        <Image
          source={{ uri: apiService.getPublicUrl('images', item.user.avatar_url) }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatar} />
      )}
      <Text style={styles.username}>{item.user.username}</Text>
      <Text style={styles.pendingText}>Requested</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Requests</Text>
      </View>
      <FlatList
        ListHeaderComponent={() => <Text style={styles.sectionTitle}>Incoming</Text>}
        data={incoming}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={() => (
          <>
            <Text style={[styles.sectionTitle, styles.pendingHeader]}>Pending</Text>
            {outgoing.map((item) => (
              <View key={item.id}>{renderPending({ item })}</View>
            ))}
          </>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 12,
  },
  pendingHeader: {
    marginTop: 24,
  },
  requestItem: {
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
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  accept: {
    backgroundColor: '#16a34a',
  },
  deny: {
    backgroundColor: '#dc2626',
  },
  pendingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
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
