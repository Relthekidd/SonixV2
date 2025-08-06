import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { apiService } from '@/services/api';

interface AlbumSummary {
  id: string;
  title: string;
  cover_url: string;
  release_date: string;
}

export default function ArtistAlbumsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadAlbums();
  }, [id]);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getArtistAlbums(id!);
      setAlbums(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Albums</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.list}>
        {albums.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.albumCard,
              styles.glassCard,
              styles.brutalBorder,
              styles.brutalShadow,
            ]}
            onPress={() => router.push(`/album/${item.id}` as const)}
          >
            <Image source={{ uri: item.cover_url }} style={styles.cover} />
            <View style={styles.meta}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.albumDate}>
                {new Date(item.release_date).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  meta: { flex: 1 },
  albumTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  albumDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 4,
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

