import React, { useState, useEffect } from 'react';

export const unstable_settings = { href: null };
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import { ArrowLeft, Music, Calendar, Eye, Check, Clock, AlertCircle, Plus, Upload, Trash2, MoreVertical } from 'lucide-react-native';

interface UploadedContent {
  id: string;
  title: string;
  type: 'single' | 'album' | 'track';
  artist: string;
  coverUrl: string;
  releaseDate: string;
  trackCount?: number;
  duration?: number;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminUploadsScreen() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'singles' | 'albums'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      setIsLoading(true);
      const { singles, albums, tracks } = await apiService.getRecentUploads();
      const all: UploadedContent[] = [
        ...singles.map((s: any) => ({
          id: s.id,
          title: s.title,
          type: 'single' as const,
          artist: s.artist?.name || s.artist_name || 'Unknown Artist',
          coverUrl: s.cover_url,
          releaseDate: s.release_date,
          duration: s.duration,
          isPublished: s.is_published,
          createdAt: s.created_at,
        })),
        ...albums.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: 'album' as const,
          artist: a.artist?.name || a.artist_name || 'Unknown Artist',
          coverUrl: a.cover_url,
          releaseDate: a.release_date,
          trackCount: a.track_count,
          isPublished: a.is_published,
          createdAt: a.created_at,
        })),
        ...tracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          type: 'track' as const,
          artist: t.artist?.name || t.artist_name || 'Unknown Artist',
          coverUrl: t.cover_url,
          releaseDate: t.release_date,
          duration: t.duration,
          isPublished: t.is_published,
          createdAt: t.created_at,
        })),
      ];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUploads(all);
    } catch (err) {
      console.error('Error loading uploads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUploads();
    setRefreshing(false);
  };

  const getFiltered = () => {
    if (activeTab === 'singles') return uploads.filter(u => u.type === 'single');
    if (activeTab === 'albums') return uploads.filter(u => u.type === 'album');
    return uploads;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDuration = (sec?: number) => {
    if (sec == null) return '';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePublish = async (id: string) => {
    try {
      setProcessingId(id);
      await apiService.publishTrack(id);
      setUploads(u => u.map(x => x.id === id ? { ...x, isPublished: true } : x));
      Alert.alert('Success', 'Track published');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not publish');
    } finally {
      setProcessingId(null);
      setShowActionsFor(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      setProcessingId(id);
      await apiService.unpublishTrack(id);
      setUploads(u => u.map(x => x.id === id ? { ...x, isPublished: false } : x));
      Alert.alert('Success', 'Track unpublished');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not unpublish');
    } finally {
      setProcessingId(null);
      setShowActionsFor(null);
    }
  };

  const handleDelete = (item: UploadedContent) => {
    Alert.alert(
      'Delete',
      `Delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              setProcessingId(item.id);
              await apiService.deleteContent(item.type, item.id);
              setUploads(u => u.filter(x => x.id !== item.id));
              Alert.alert('Deleted');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Could not delete');
            } finally {
              setProcessingId(null);
              setShowActionsFor(null);
            }
          }
        }
      ]
    );
  };

  const statusInfo = (u: UploadedContent) => {
    if (u.isPublished) return { text: 'Published', color: '#10b981', icon: Check };
    if (new Date(u.releaseDate) > new Date()) return { text: 'Scheduled', color: '#f59e0b', icon: Clock };
    return { text: 'Draft', color: '#64748b', icon: AlertCircle };
  };

  const renderItem = ({ item }: { item: UploadedContent }) => {
    const stat = statusInfo(item);
    const Icon = stat.icon;
    const processing = processingId === item.id;
    const show = showActionsFor === item.id;

    return (
      <TouchableOpacity style={styles.uploadItem} onPress={() => router.push(`/${item.type}/${item.id}`)}>
        <Image source={{ uri: item.coverUrl }} style={styles.uploadCover} />
        <View style={styles.uploadInfo}>
          <View style={styles.uploadHeader}>
            <Text style={styles.uploadTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: stat.color }]}>
              <Icon color="#fff" size={10} />
              <Text style={styles.statusText}>{stat.text}</Text>
            </View>
          </View>
          <Text style={styles.uploadArtist} numberOfLines={1}>{item.artist}</Text>
          <View style={styles.uploadMeta}>
            <View style={styles.metaItem}><Music size={14} /><Text style={styles.metaText}>{item.type === 'album' ? `${item.trackCount} tracks` : formatDuration(item.duration)}</Text></View>
            <View style={styles.metaItem}><Calendar size={14} /><Text style={styles.metaText}>{formatDate(item.createdAt)}</Text></View>
          </View>
        </View>
        <View style={styles.uploadActions}>
          <TouchableOpacity style={[styles.menuButton, show && styles.menuButtonActive]} onPress={() => setShowActionsFor(s => s===item.id?null:item.id)}>
            <MoreVertical size={20} color={show?"#8b5cf6":"#94a3b8"} />
          </TouchableOpacity>
          {show && (
            <View style={styles.actionsMenu}>
              <TouchableOpacity style={styles.actionMenuItem} onPress={() => { router.push(`/${item.type}/${item.id}`); setShowActionsFor(null); }}>
                <Eye size={16} color="#8b5cf6" /><Text style={styles.actionMenuText}>View</Text>
              </TouchableOpacity>
              {(item.type==='single'||item.type==='track') && (
                <TouchableOpacity style={styles.actionMenuItem} onPress={() => item.isPublished? handleUnpublish(item.id) : handlePublish(item.id)} disabled={processing}>
                  {processing ? <ActivityIndicator size="small" color="#8b5cf6"/> : <Upload size={16} color={item.isPublished?"#f59e0b":"#10b981"}/>} 
                  <Text style={[styles.actionMenuText,{ color:item.isPublished?"#f59e0b":"#10b981" }]}>{item.isPublished?'Unpublish':'Publish'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleDelete(item)} disabled={processing}>
                {processing?<ActivityIndicator size="small" color="#ef4444"/>:<Trash2 size={16} color="#ef4444"/>}
                <Text style={[styles.actionMenuText,{ color:'#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Only allow admin
  if ((user?.role as any) !== 'admin') {
    return (
      <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
        <View style={styles.errorContainer}><Text style={styles.errorText}>Access denied. Admin only.</Text></View>
      </LinearGradient>
    );
  }

  const tabs = [
    { id:'all', title:'All', count:uploads.length },
    { id:'singles', title:'Singles', count:uploads.filter(u=>u.type==='single').length },
    { id:'albums', title:'Albums', count:uploads.filter(u=>u.type==='album').length },
  ];

  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={()=>router.back()}><ArrowLeft size={24} color="#fff"/></TouchableOpacity>
        <Text style={styles.title}>Recent Uploads</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={()=>router.push('/admin/upload')}><Plus size={20} color="#8b5cf6"/></TouchableOpacity>
      </View>
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.title}</Text>
            <View style={[styles.tabBadge, activeTab === tab.id && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === tab.id && styles.activeTabBadgeText]}>{tab.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading uploads...</Text>
        </View>
      ) : (
        <FlatList
          data={getFiltered()}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#8b5cf6"]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music size={64} color="#64748b" />
              <Text style={styles.emptyText}>No uploads found</Text>
              <Text style={styles.emptySubtext}>{activeTab === 'all' ? 'Start by uploading' : ''}</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 8 },
  title: { fontSize: 20, color: '#fff' },
  uploadButton: { padding: 8 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  tab: { padding: 8, borderRadius: 8 },
  activeTab: { backgroundColor: 'rgba(139,92,246,0.2)' },
  tabText: { color: '#94a3b8' },
  activeTabText: { color: '#8b5cf6' },
  tabBadge: { backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 6 },
  activeTabBadge: { backgroundColor: '#8b5cf6' },
  tabBadgeText: { color: '#94a3b8' },
  activeTabBadgeText: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 8 },
  listContainer: { padding: 16, paddingBottom: 120 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  emptyText: { color: '#94a3b8', marginTop: 8 },
  emptySubtext: { color: '#64748b', marginTop: 4 },
  uploadItem: { flexDirection: 'row', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' },
  uploadCover: { width: 64, height: 64 },
  uploadInfo: { flex: 1, padding: 12 },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uploadTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#fff', marginLeft: 4, fontSize: 10 },
  uploadArtist: { color: '#94a3b8', marginTop: 4 },
  uploadMeta: { flexDirection: 'row', marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  metaText: { color: '#94a3b8', marginLeft: 4 },
  uploadActions: { position: 'absolute', top: 8, right: 8 },
  menuButton: { padding: 4 },
  menuButtonActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 4 },
  actionsMenu: { position: 'absolute', top: 32, right: 0, backgroundColor: '#1a1a2e', padding: 8, borderRadius: 8 },
  actionMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  actionMenuText: { color: '#fff', marginLeft: 4 },
});
