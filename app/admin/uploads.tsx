import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import { uploadService } from '@/services/uploadService';
import { ArrowLeft, Music, Calendar, Play, Pause, Plus, Eye, Check, Clock, AlertCircle, Upload, Trash2, MoreVertical } from 'lucide-react-native';

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
  const [publishingTrack, setPublishingTrack] = useState<string | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<string | null>(null);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      setIsLoading(true);
      const { singles, albums, tracks } = await apiService.getRecentUploads();
      
      // Transform and combine all uploads
      const allUploads: UploadedContent[] = [
        ...singles.map((single: any) => ({
          id: single.id,
          title: single.title,
          type: 'single' as const,
          artist:
            single.artist?.name ||
            single.artist_name ||
            single.artist ||
            single.artist_id ||
            'Unknown Artist',
          coverUrl: single.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
          releaseDate: single.release_date || single.created_at,
          duration: single.duration || 180,
          isPublished: single.is_published || false,
          createdAt: single.created_at,
        })),
        ...albums.map((album: any) => ({
          id: album.id,
          title: album.title,
          type: 'album' as const,
          artist:
            album.artist?.name ||
            album.artist_name ||
            album.artist ||
            album.artist_id ||
            'Unknown Artist',
          coverUrl: album.cover_url || 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
          releaseDate: album.release_date || album.created_at,
          trackCount: album.track_count || album.tracks?.length || 0,
          isPublished: album.is_published || false,
          createdAt: album.created_at,
        })),
        ...tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          type: 'track' as const,
          artist:
            track.artist?.name ||
            track.artist_name ||
            track.artist ||
            track.artist_id ||
            'Unknown Artist',
          coverUrl: track.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
          releaseDate: track.release_date || track.created_at,
          duration: track.duration || 180,
          isPublished: track.is_published || false,
          createdAt: track.created_at,
        })),
      ];

      // Sort by creation date (newest first)
      allUploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setUploads(allUploads);
    } catch (error) {
      console.error('Error loading uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUploads();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const getFilteredUploads = () => {
    switch (activeTab) {
      case 'singles':
        return uploads.filter(upload => upload.type === 'single');
      case 'albums':
        return uploads.filter(upload => upload.type === 'album');
      default:
        return uploads;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewContent = (upload: UploadedContent) => {
    switch (upload.type) {
      case 'single':
        router.push(`/single/${upload.id}`);
        break;
      case 'album':
        router.push(`/album/${upload.id}`);
        break;
      case 'track':
        router.push(`/track/${upload.id}`);
        break;
    }
  };

  const handlePublishTrack = async (trackId: string) => {
    try {
      setPublishingTrack(trackId);
      console.log('📤 Publishing track:', trackId);
      
      await uploadService.publishTrack(trackId);
      
      // Update the local state
      setUploads(prev => prev.map(upload => 
        upload.id === trackId 
          ? { ...upload, isPublished: true }
          : upload
      ));
      
      console.log('✅ Track published successfully');
      Alert.alert('Success', 'Track published successfully! It will now appear in the app.');
    } catch (error) {
      console.error('❌ Failed to publish track:', error);
      Alert.alert('Error', 'Failed to publish track. Please try again.');
    } finally {
      setPublishingTrack(null);
      setShowActionsFor(null);
    }
  };

  const handleUnpublishTrack = async (trackId: string) => {
    try {
      setPublishingTrack(trackId);
      console.log('📥 Unpublishing track:', trackId);
      
      await uploadService.unpublishTrack(trackId);
      
      // Update the local state
      setUploads(prev => prev.map(upload => 
        upload.id === trackId 
          ? { ...upload, isPublished: false }
          : upload
      ));
      
      console.log('✅ Track unpublished successfully');
      Alert.alert('Success', 'Track unpublished successfully! It will no longer appear in the app.');
    } catch (error) {
      console.error('❌ Failed to unpublish track:', error);
      Alert.alert('Error', 'Failed to unpublish track. Please try again.');
    } finally {
      setPublishingTrack(null);
      setShowActionsFor(null);
    }
  };

  const handleDeleteTrack = async (upload: UploadedContent) => {
    const contentType = upload.type === 'single' ? 'single' : upload.type === 'album' ? 'album' : 'track';
    
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${upload.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingTrack(upload.id);
              console.log(`🗑️ Deleting ${contentType}:`, upload.id);
              
              await uploadService.deleteContent(upload.id, upload.type);
              
              // Remove from local state
              setUploads(prev => prev.filter(item => item.id !== upload.id));
              
              console.log(`✅ ${contentType} deleted successfully`);
              Alert.alert('Success', `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} deleted successfully!`);
            } catch (error) {
              console.error(`❌ Failed to delete ${contentType}:`, error);
              Alert.alert('Error', `Failed to delete ${contentType}. Please try again.`);
            } finally {
              setDeletingTrack(null);
              setShowActionsFor(null);
            }
          },
        },
      ]
    );
  };

  const getTrackStatus = (upload: UploadedContent) => {
    if (upload.isPublished) {
      return { text: 'Published', color: '#10b981', icon: Check };
    }
    
    const now = new Date();
    const releaseDate = new Date(upload.releaseDate);
    
    if (releaseDate > now) {
      return { text: 'Scheduled', color: '#f59e0b', icon: Clock };
    }
    
    return { text: 'Draft', color: '#64748b', icon: AlertCircle };
  };

  const toggleActions = (itemId: string) => {
    setShowActionsFor(showActionsFor === itemId ? null : itemId);
  };

  const renderUploadItem = ({ item }: { item: UploadedContent }) => {
    const status = getTrackStatus(item);
    const StatusIcon = status.icon;
    const isPublishing = publishingTrack === item.id;
    const isDeleting = deletingTrack === item.id;
    const showActions = showActionsFor === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.uploadItem}
        onPress={() => handleViewContent(item)}
      >
        <Image source={{ uri: item.coverUrl }} style={styles.uploadCover} />
        
        <View style={styles.uploadInfo}>
          <View style={styles.uploadHeader}>
            <Text style={styles.uploadTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: status.color }
            ]}>
              <StatusIcon color="#ffffff" size={10} />
              <Text style={styles.statusText}>
                {status.text}
              </Text>
            </View>
          </View>
          
          <Text style={styles.uploadArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          
          <View style={styles.uploadMeta}>
            <View style={styles.metaItem}>
              <Music color="#94a3b8" size={14} />
              <Text style={styles.metaText}>
                {item.type === 'album' 
                  ? `${item.trackCount} tracks` 
                  : formatDuration(item.duration || 0)
                }
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Calendar color="#94a3b8" size={14} />
              <Text style={styles.metaText}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.uploadActions}>
          {/* Actions Menu Button */}
          <TouchableOpacity 
            style={[styles.menuButton, showActions && styles.menuButtonActive]}
            onPress={() => toggleActions(item.id)}
          >
            <MoreVertical color={showActions ? "#8b5cf6" : "#94a3b8"} size={20} />
          </TouchableOpacity>
          
          {/* Actions Menu */}
          {showActions && (
            <View style={styles.actionsMenu}>
              {/* View Action */}
              <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={() => {
                  handleViewContent(item);
                  setShowActionsFor(null);
                }}
              >
                <Eye color="#8b5cf6" size={16} />
                <Text style={styles.actionMenuText}>View</Text>
              </TouchableOpacity>
              
              {/* Publish/Unpublish Action */}
              {(item.type === 'single' || item.type === 'track') && (
                <TouchableOpacity 
                  style={styles.actionMenuItem}
                  onPress={() => item.isPublished ? handleUnpublishTrack(item.id) : handlePublishTrack(item.id)}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <Upload color={item.isPublished ? "#f59e0b" : "#10b981"} size={16} />
                  )}
                  <Text style={[styles.actionMenuText, { color: item.isPublished ? "#f59e0b" : "#10b981" }]}>
                    {item.isPublished ? 'Unpublish' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Delete Action */}
              <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={() => handleDeleteTrack(item)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 color="#ef4444" size={16} />
                )}
                <Text style={[styles.actionMenuText, { color: '#ef4444' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const tabs = [
    { id: 'all', title: 'All', count: uploads.length },
    { id: 'singles', title: 'Singles', count: uploads.filter(u => u.type === 'single').length },
    { id: 'albums', title: 'Albums', count: uploads.filter(u => u.type === 'album').length },
  ];

  const filteredUploads = getFilteredUploads();

  if (user?.role === undefined || user?.role !== 'admin') {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. Admin only.</Text>
        </View>
      </LinearGradient>
    );
  }

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
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Recent Uploads</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => router.push('/admin/upload')}
        >
          <Plus color="#8b5cf6" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text 
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
            <View style={[
              styles.tabBadge,
              activeTab === tab.id && styles.activeTabBadge,
            ]}>
              <Text style={[
                styles.tabBadgeText,
                activeTab === tab.id && styles.activeTabBadgeText,
              ]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading uploads...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUploads}
          renderItem={renderUploadItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music color="#64748b" size={64} />
              <Text style={styles.emptyText}>No uploads found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'all' 
                  ? 'Start by uploading your first single or album'
                  : `No ${activeTab} have been uploaded yet`
                }
              </Text>
              <TouchableOpacity
                style={styles.uploadEmptyButton}
                onPress={() => router.push('/admin/upload')}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#a855f7']}
                  style={styles.uploadEmptyGradient}
                >
                  <Plus color="#ffffff" size={20} />
                  <Text style={styles.uploadEmptyText}>Upload Content</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  uploadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#94a3b8',
  },
  activeTabBadgeText: {
    color: '#8b5cf6',
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
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  uploadCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  uploadInfo: {
    flex: 1,
    marginLeft: 16,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  uploadArtist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 8,
  },
  uploadMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  uploadActions: {
    position: 'relative',
    marginLeft: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  actionsMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    minWidth: 120,
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  actionMenuText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  uploadEmptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadEmptyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  uploadEmptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});