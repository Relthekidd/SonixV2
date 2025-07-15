import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import {
  Play,
  Pause,
  Plus,
  Clock,
} from 'lucide-react-native';
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
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Blues', 'Folk', 'Indie', 'Alternative', 'Funk'
];

export default function ArtistDashboardScreen() {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useMusic();
  const [artistTracks, setArtistTracks] = useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [coverFile, setCoverFile] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    mainArtist: null,
    featuredArtists: [],
    lyrics: '',
    duration: '',
    genres: [],
    explicit: false,
    price: '0',
    description: '',
  });
  const [newFeaturedArtist, setNewFeaturedArtist] = useState('');

  useEffect(() => {
    loadArtistTracks();
    uploadService.initializeStorage();
  }, []);

  const loadArtistTracks = async () => {
    setIsLoadingTracks(true);
    // TODO: replace with real API call
    setArtistTracks([]);
    setIsLoadingTracks(false);
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) setAudioFile(result.assets[0]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setCoverFile(result.assets[0]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const addFeaturedArtist = () => {
    const name = newFeaturedArtist.trim();
    if (name && !formData.featuredArtists.some(a => a.name === name)) {
      setFormData(prev => ({ ...prev, featuredArtists: [...prev.featuredArtists, { id: '', name } as ArtistData] }));
      setNewFeaturedArtist('');
    }
  };

  const removeFeaturedArtist = (artist: ArtistData) => {
    setFormData(prev => ({ ...prev, featuredArtists: prev.featuredArtists.filter(a => a.name !== artist.name) }));
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({ ...prev, genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre] }));
  };

  const handleUpload = async () => {
    const { title, mainArtist, genres } = formData;
    if (!audioFile || !title.trim() || !mainArtist) return Alert.alert('Error','Provide title, main artist, and audio file');
    if (!genres.length) return Alert.alert('Error','Select a genre');

    try {
      setIsUploading(true);
      const uploadData: SingleUploadData = {
        title: title.trim(),
        lyrics: formData.lyrics,
        duration: parseInt(formData.duration) || 180,
        genres: formData.genres,
        explicit: formData.explicit,
        description: formData.description,
        releaseDate: new Date().toISOString().split('T')[0],
        artistId: user?.id || '',
        mainArtistId: mainArtist.id,
        featuredArtistIds: formData.featuredArtists.map(a=>a.id),
        audioFile,
        coverFile: coverFile||undefined,
      };
      await uploadService.uploadSingle(uploadData);
      Alert.alert('Success','Track uploaded and pending approval');
      setFormData({ title:'',mainArtist:null,featuredArtists:[],lyrics:'',duration:'',genres:[],explicit:false,price:'0',description:'' });
      setAudioFile(null);setCoverFile(null);setShowUploadForm(false);
      await loadArtistTracks();
    } catch (err:any) {
      console.error(err);
      Alert.alert('Error', err.message||'Upload failed');
    } finally { setIsUploading(false); }
  };

  const handleTrackPress = (track:any) => {
    if (currentTrack?.id===track.id) isPlaying ? pauseTrack() : playTrack(track,artistTracks);
    else playTrack(track,artistTracks);
  };

  const renderTrackItem = ({item}:{item:any}) => (
    <TouchableOpacity style={styles.trackItem} onPress={()=>handleTrackPress(item)}>
      <Image source={{uri:item.coverUrl}} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.trackStatusContainer}>
          <Text style={[styles.trackStatus,{color:item.is_published?'#10b981':'#f59e0b'}]}>
            {item.is_published?'Published':'Draft'}
          </Text>
          <Text style={styles.trackStats}>{item.play_count||0} plays</Text>
        </View>
        <Text style={styles.trackGenres}>{Array.isArray(item.genres)?item.genres.join(', '):'No genres'}</Text>
      </View>
      <TouchableOpacity style={styles.playButton}>{currentTrack?.id===item.id && isPlaying? <Pause size={20} color="#8b5cf6"/> : <Play size={20} color="#8b5cf6"/>}</TouchableOpacity>
    </TouchableOpacity>
  );

  if (user?.role!=='artist' || !user?.artistVerified) return (
    <LinearGradient colors={[ '#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <View style={styles.pendingContainer}>
        <Clock size={64} color="#f59e0b"/>
        <Text style={styles.pendingTitle}>Artist Verification Required</Text>
        <Text style={styles.pendingText}>Your account needs verification. Please wait for approval.</Text>
      </View>
    </LinearGradient>
  );

  return (
    <LinearGradient colors={[ '#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isLoadingTracks? (
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader}/>
        ):(
          <FlatList data={artistTracks} renderItem={renderTrackItem} keyExtractor={i=>i.id} style={styles.list} />
        )}
        <TouchableOpacity style={styles.newButton} onPress={()=>setShowUploadForm(s=>!s)}>
          <Plus size={24} color="#fff"/>
        </TouchableOpacity>
        {showUploadForm && (
          <View style={styles.formContainer}>
            {/* Form fields omitted for brevity */}
            <TouchableOpacity style={styles.submitButton} onPress={handleUpload} disabled={isUploading}>
              {isUploading? <ActivityIndicator color="#fff"/> : <Text style={styles.submitText}>Upload</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:{flex:1},
  scrollView:{padding:16},
  loader:{marginTop:100},
  list:{marginBottom:80},
  trackItem:{flexDirection:'row',alignItems:'center',marginBottom:12,backgroundColor:'#222',borderRadius:8,padding:8},
  trackCover:{width:50,height:50,borderRadius:4},
  trackInfo:{flex:1,marginLeft:8},
  trackTitle:{color:'#fff',fontSize:16},
  trackStatusContainer:{flexDirection:'row',alignItems:'center',marginTop:4},
  trackStatus:{fontSize:12,marginRight:8},
  trackStats:{fontSize:12,color:'#888'},
  trackGenres:{fontSize:12,color:'#aaa',marginTop:4},
  playButton:{padding:8},
  newButton:{position:'absolute',bottom:24,right:24,backgroundColor:'#8b5cf6',borderRadius:24,padding:12,shadowColor:'#000',shadowOpacity:0.3,shadowOffset:{width:0,height:4},elevation:5},
  pendingContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  pendingTitle:{color:'#fff',fontSize:18,marginTop:12},
  pendingText:{color:'#ccc',fontSize:14,marginTop:8,textAlign:'center',paddingHorizontal:24},
  formContainer:{backgroundColor:'#222',padding:16,borderRadius:8,marginTop:16},
  submitButton:{backgroundColor:'#8b5cf6',borderRadius:8,paddingVertical:12,alignItems:'center',marginTop:16},
  submitText:{color:'#fff',fontSize:16},
});
