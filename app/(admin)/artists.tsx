import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  ArrowLeft,
  Check,
  X,
  User,
  Mail,
  Calendar,
  FileText,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabaseStorage } from '@/services/supabaseStorage';

interface PendingArtist {
  id: string;
  email: string;
  display_name: string;
  bio?: string;
  created_at: string;
  artist_verified: boolean;
  first_name?: string;
  last_name?: string;
}

export default function AdminArtistsScreen() {
  const [pendingArtists, setPendingArtists] = useState<PendingArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistBio, setNewArtistBio] = useState('');
  const [newArtistImage, setNewArtistImage] = useState<any>(null);
  const [creatingArtist, setCreatingArtist] = useState(false);

  const pickArtistImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewArtistImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking artist image:', error);
      Alert.alert('Error', 'Failed to pick artist image');
    }
  };

  const createArtist = async () => {
    if (!newArtistName.trim()) {
      Alert.alert('Error', 'Artist name is required');
      return;
    }

    setCreatingArtist(true);
    try {
      let imageUrl: string | null = null;
      if (newArtistImage) {
        const fileName =
          newArtistImage.fileName ||
          newArtistImage.name ||
          `${newArtistName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        const upload = await supabaseStorage.uploadImage(
          newArtistImage,
          fileName,
        );
        imageUrl = upload.url;
      }

      const { data, error } = await supabase
        .from('artists')
        .insert({
          name: newArtistName.trim(),
          bio: newArtistBio || null,
          image_url: imageUrl,
        })
        .select('id')
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Artist created successfully');

      setNewArtistName('');
      setNewArtistBio('');
      setNewArtistImage(null);

      if (data?.id) {
        // router.push(`/artist/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating artist:', error);
      Alert.alert('Error', 'Failed to create artist');
    } finally {
      setCreatingArtist(false);
    }
  };

  useEffect(() => {
    loadPendingArtists();
  }, []);

  const loadPendingArtists = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'artist')
        .eq('artist_verified', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending artists:', error);
        Alert.alert('Error', 'Failed to load pending artists');
        return;
      }

      setPendingArtists(data || []);
    } catch (error) {
      console.error('Error loading pending artists:', error);
      Alert.alert('Error', 'Failed to load pending artists');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPendingArtists();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleArtistAction = async (
    artistId: string,
    isVerified: boolean,
    artistName: string,
  ) => {
    const action = isVerified ? 'approve' : 'reject';

    Alert.alert(
      `${isVerified ? 'Approve' : 'Reject'} Artist`,
      `Are you sure you want to ${action} ${artistName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isVerified ? 'Approve' : 'Reject',
          style: isVerified ? 'default' : 'destructive',
          onPress: () => processArtistAction(artistId, isVerified, artistName),
        },
      ],
    );
  };

  const processArtistAction = async (
    artistId: string,
    isVerified: boolean,
    artistName: string,
  ) => {
    setProcessingIds((prev) => new Set(prev).add(artistId));

    try {
      if (isVerified) {
        // Approve artist
        const { error } = await supabase
          .from('users')
          .update({ artist_verified: true })
          .eq('id', artistId);

        if (error) throw error;
      } else {
        // Reject artist - change role back to listener
        const { error } = await supabase
          .from('users')
          .update({
            role: 'listener',
            artist_verified: false,
          })
          .eq('id', artistId);

        if (error) throw error;
      }

      // Remove from pending list
      setPendingArtists((prev) =>
        prev.filter((artist) => artist.id !== artistId),
      );

      Alert.alert(
        'Success',
        `${artistName} has been ${isVerified ? 'approved' : 'rejected'} successfully.`,
      );
    } catch (error) {
      console.error('Error updating artist status:', error);
      Alert.alert(
        'Error',
        `Failed to ${isVerified ? 'approve' : 'reject'} artist`,
      );
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(artistId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCreateArtistForm = () => (
    <View style={styles.createSection}>
      <Text style={styles.sectionTitle}>Create New Artist</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Artist name"
          placeholderTextColor="#64748b"
          value={newArtistName}
          onChangeText={setNewArtistName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional bio"
          placeholderTextColor="#64748b"
          value={newArtistBio}
          onChangeText={setNewArtistBio}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Image</Text>
        <TouchableOpacity
          style={[
            styles.fileButton,
            newArtistImage && styles.fileButtonSelected,
          ]}
          onPress={pickArtistImage}
        >
          <ImageIcon color={newArtistImage ? '#8b5cf6' : '#64748b'} size={20} />
          <Text
            style={[
              styles.fileButtonText,
              newArtistImage && styles.fileButtonTextSelected,
            ]}
          >
            {newArtistImage ? 'Image Selected' : 'Select Image'}
          </Text>
          {newArtistImage && <Check color="#8b5cf6" size={20} />}
        </TouchableOpacity>
        {newArtistImage && (
          <Image
            source={{ uri: newArtistImage.uri }}
            style={styles.imagePreview}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.createButton, creatingArtist && { opacity: 0.7 }]}
        onPress={createArtist}
        disabled={creatingArtist}
      >
        {creatingArtist ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Create Artist</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderArtistItem = ({ item }: { item: PendingArtist }) => {
    const isProcessing = processingIds.has(item.id);

    return (
      <View style={styles.artistCard}>
        <View style={styles.artistHeader}>
          <View style={styles.artistAvatar}>
            <User color="#8b5cf6" size={24} />
          </View>
          <View style={styles.artistInfo}>
            <Text style={styles.artistName}>{item.display_name}</Text>
            <Text style={styles.artistDisplayName}>
              {item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.email}
            </Text>
          </View>
        </View>

        <View style={styles.artistDetails}>
          <View style={styles.detailRow}>
            <Mail color="#94a3b8" size={16} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>

          <View style={styles.detailRow}>
            <Calendar color="#94a3b8" size={16} />
            <Text style={styles.detailText}>
              Applied {formatDate(item.created_at)}
            </Text>
          </View>

          {item.bio && (
            <View style={styles.bioContainer}>
              <FileText color="#94a3b8" size={16} />
              <Text style={styles.bioText}>{item.bio}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() =>
              handleArtistAction(item.id, false, item.display_name)
            }
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <X color="#ffffff" size={20} />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleArtistAction(item.id, true, item.display_name)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Check color="#ffffff" size={20} />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading pending artists...</Text>
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
        <Text style={styles.title}>Artist Applications</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingArtists.length}</Text>
          <Text style={styles.statLabel}>Pending Applications</Text>
        </View>
      </View>

      <FlatList
        data={pendingArtists}
        renderItem={renderArtistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderCreateArtistForm}
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
            <User color="#64748b" size={64} />
            <Text style={styles.emptyText}>No Pending Applications</Text>
            <Text style={styles.emptySubtext}>
              All artist applications have been processed
            </Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
  placeholder: {
    width: 44,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94a3b8',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  artistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  artistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  artistDisplayName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  artistDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    marginLeft: 8,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
  },
  createSection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 12,
  },
  fileButtonSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  fileButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  fileButtonTextSelected: {
    color: '#8b5cf6',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 12,
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});
