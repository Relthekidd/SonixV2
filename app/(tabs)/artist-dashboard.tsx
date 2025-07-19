import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMusic } from '@/providers/MusicProvider';
import { ArtistAutocomplete } from '@/components/ArtistAutocomplete';
import { uploadService } from '@/services/uploadService';
import { ArtistData } from '@/services/artistService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { withAuthGuard } from '@/hoc/withAuthGuard';
import { Play, Pause, Clock } from 'lucide-react-native';
import type { SingleUploadData } from '@/services/uploadService';

interface UploadFormData {
  title: string;
  mainArtist: ArtistData | null;
  featuredArtists: ArtistData[];
  lyrics: string;
  duration: string;
  genres: string[];
  explicit: boolean;
  price: string;
  description: string;
}

const GENRES = [
  'Hip-Hop','R&B','Pop','Rock','Electronic','Jazz','Classical',
  'Country','Reggae','Blues','Folk','Indie','Alternative','Funk'
];

function ArtistDashboardScreen() {
  const { user, hasUser, isLoading: authLoading } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();

  const [artistTracks, setArtistTracks] = useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<any>(null);
  const [coverFile, setCoverFile] = useState<any>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '', mainArtist: null, featuredArtists: [],
    lyrics: '', duration: '', genres: [],
    explicit: false, price: '0', description: '',
  });

  useEffect(() => {
    if (!hasUser) return;
    loadArtistTracks();
    uploadService.initializeStorage();
  }, [hasUser]);

  const loadArtistTracks = async () => {
    setIsLoadingTracks(true);
    try {
      // TODO: replace with real fetch
      setArtistTracks([]);
    } catch (err) {
      console.error('loadArtistTracks error', err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleTrackPress = (track: any) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : playTrack(track, artistTracks);
    } else {
      playTrack(track, artistTracks);
    }
  };

  if (!user || user.role !== 'artist' || !user.artistVerified) {
    return (
      <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
        <View style={styles.pendingContainer}>
          <Clock size={64} color="#f59e0b" />
          <Text style={styles.pendingTitle}>Artist Verification Required</Text>
          <Text style={styles.pendingText}>Your account needs verification. Please wait for approval.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isLoadingTracks ? (
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader} />
        ) : (
          <FlatList
            data={artistTracks}
            renderItem={renderTrackItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </ScrollView>
    </LinearGradient>
  );

  function renderTrackItem({ item }: { item: any }) {
    return (
      <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)}>
        <Image source={{ uri: item.coverUrl || item.cover_url }} style={styles.trackCover} />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{item.title}</Text>
          <Text style={styles.trackArtist}>{item.artist}</Text>
        </View>
        <TouchableOpacity style={styles.playButton} onPress={() => handleTrackPress(item)}>
          {currentTrack?.id === item.id && isPlaying ? (
            <Pause size={16} color="#8b5cf6" />
          ) : (
            <Play size={16} color="#8b5cf6" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pendingContainer: { flex:1, justifyContent:'center', alignItems:'center' },
  pendingTitle: { fontSize: 20, color:'#ffffff', marginTop:16, fontFamily:'Inter-SemiBold' },
  pendingText: { fontSize: 14, color:'#94a3b8', textAlign:'center', paddingHorizontal:24, marginTop:8 },
  scrollView: { flex:1 },
  loader: { marginTop: 40 },
  list: { padding: 16 },
  trackItem: { flexDirection:'row', alignItems:'center', marginBottom:12, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:8, padding:12 },
  trackCover: { width:50, height:50, borderRadius:4 },
  trackInfo: { flex:1, marginLeft:12 },
  trackTitle: { fontSize:16, fontFamily:'Inter-SemiBold', color:'#ffffff' },
  trackArtist: { fontSize:14, fontFamily:'Inter-Regular', color:'#94a3b8', marginTop:2 },
  playButton: { padding:8 },
});

export default withAuthGuard(ArtistDashboardScreen);
