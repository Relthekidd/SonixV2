import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { uploadService, SingleUploadData, AlbumUploadData } from '@/services/uploadService';
import { ArtistData } from '@/services/artistService';
import { ArtistAutocomplete } from '@/components/ArtistAutocomplete';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface Track {
  id: string;
  title: string;
  audioFile: any;
  lyrics: string;
  explicit: boolean;
  duration: number;
  description?: string;
  featuredArtists: ArtistData[];
}

interface UploadFormData {
  type: 'single' | 'album';
  title: string;
  mainArtist: ArtistData | null;
  featuredArtists: ArtistData[];
  releaseDate: string;
  coverFile: any;
  genres: string[];
  explicit: boolean;
  description: string;
  tracks: Track[];
}

const GENRES = [
  'Hip-Hop','R&B','Pop','Rock','Electronic','Jazz','Classical',
  'Country','Reggae','Blues','Folk','Indie','Alternative','Funk'
];

export default function AdminUploadScreen() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<UploadFormData>({
    type: 'single',
    title: '',
    mainArtist: null,
    featuredArtists: [],
    releaseDate: new Date().toISOString().split('T')[0],
    coverFile: null,
    genres: [],
    explicit: false,
    description: '',
    tracks: [{
      id: '1', title: '', audioFile: null, lyrics: '', explicit: false,
      duration: 0, description: '', featuredArtists: []
    }],
  });

  useEffect(() => {
    uploadService.initializeStorage();
  }, []);

  const pickCoverImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1,1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setFormData(prev => ({ ...prev, coverFile: res.assets[0] }));
    }
  };

  const pickAudioFile = async (index: number) => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) {
      const tracks = [...formData.tracks];
      tracks[index].audioFile = res.assets[0];
      setFormData(prev => ({ ...prev, tracks }));
    }
  };

  const updateTrack = (index: number, field: keyof Track, value: any) => {
    const tracks = [...formData.tracks];
    (tracks[index] as any)[field] = value;
    setFormData(prev => ({ ...prev, tracks }));
  };

  const addTrack = () => {
    setFormData(prev => ({
      ...prev,
      type: 'album',
      tracks: [
        ...prev.tracks,
        { id: Date.now().toString(), title: '', audioFile: null, lyrics: '', explicit: false, duration: 0, description: '', featuredArtists: [] }
      ]
    }));
  };

  const removeTrack = (index: number) => {
    const tracks = formData.tracks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, tracks }));
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) { Alert.alert('Error','Title is required'); return false; }
    if (!formData.mainArtist) { Alert.alert('Error','Main artist is required'); return false; }
    if (!formData.genres.length) { Alert.alert('Error','At least one genre is required'); return false; }
    for (let i = 0; i < formData.tracks.length; i++) {
      const t = formData.tracks[i];
      if (!t.title.trim()) { Alert.alert('Error', `Track ${i+1} title is required`); return false; }
      if (!t.audioFile) { Alert.alert('Error', `Track ${i+1} audio is required`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsUploading(true);
    try {
      if (formData.type === 'single') {
        const t = formData.tracks[0];
        await uploadService.uploadSingle({
          title: formData.title.trim(),
          lyrics: t.lyrics,
          duration: t.duration,
          genres: formData.genres,
          explicit: formData.explicit,
          coverFile: formData.coverFile,
          audioFile: t.audioFile,
          description: formData.description,
          releaseDate: formData.releaseDate,
          artistId: user?.id || '',
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
        });
      } else {
        await uploadService.uploadAlbum({
          title: formData.title.trim(),
          description: formData.description,
          releaseDate: formData.releaseDate,
          coverFile: formData.coverFile,
          genres: formData.genres,
          explicit: formData.explicit,
          artistId: user?.id || '',
          mainArtistId: formData.mainArtist!.id,
          featuredArtistIds: formData.featuredArtists.map(a => a.id),
          tracks: formData.tracks.map((t, idx) => ({
            title: t.title.trim(), lyrics: t.lyrics, duration: t.duration,
            explicit: t.explicit, trackNumber: idx+1,
            featuredArtistIds: t.featuredArtists.map(a => a.id), audioFile: t.audioFile
          })),
        });
      }
      Alert.alert('Success','Upload complete', [{ text: 'View uploads', onPress: () => router.push('/admin/uploads') }]);
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // only admin may upload
  if ((user?.role as any) !== 'admin') {
    return (
      <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.error}>Access denied.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e','#16213e','#0f3460']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Music</Text>
        <TouchableOpacity onPress={() => router.push('/admin/uploads')} style={styles.viewBtn}>
          <Text style={styles.viewText}>View Uploads</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter title"
            placeholderTextColor="#64748b"
            value={formData.title}
            onChangeText={t => setFormData(p => ({...p,title:t}))}
          />
        </View>

        {/* Main Artist */}
        <View style={styles.section}>
          <Text style={styles.label}>Main Artist</Text>
          <ArtistAutocomplete
            onArtistSelect={a => setFormData(p=>({...p,mainArtist:a}))}
            initialValue={formData.mainArtist?.name||''}
          />
        </View>

        {/* Genres */}
        <View style={styles.section}>
          <Text style={styles.label}>Genres</Text>
          <View style={styles.tags}>
            {GENRES.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.tag, formData.genres.includes(g)&&styles.tagSel]}
                onPress={()=>toggleGenre(g)}
              >
                <Text style={[styles.tagText, formData.genres.includes(g)&&styles.tagTextSel]}> {g} </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cover */}
        <View style={styles.section}>
          <Text style={styles.label}>Cover Image</Text>
          <TouchableOpacity style={styles.fileBtn} onPress={pickCoverImage}>
            <Text style={styles.fileText}>{formData.coverFile?'Change':'Select'} Cover</Text>
          </TouchableOpacity>
        </View>

        {/* Tracks */}
        {formData.tracks.map((track, idx) => (
          <View key={track.id} style={styles.trackSection}>
            <Text style={styles.label}>Track {idx+1} Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Track title"
              placeholderTextColor="#64748b"
              value={track.title}
              onChangeText={t=>updateTrack(idx,'title',t)}
            />
            <Text style={styles.label}>Lyrics (optional)</Text>
            <TextInput
              style={[styles.input,styles.textArea]}
              placeholder="Lyrics"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              value={track.lyrics}
              onChangeText={t=>updateTrack(idx,'lyrics',t)}
            />
            <Text style={styles.label}>Explicit?</Text>
            <Switch value={track.explicit} onValueChange={v=>updateTrack(idx,'explicit',v)} />
            <Text style={styles.label}>Duration (sec)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 180"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={track.duration.toString()}
              onChangeText={t=>updateTrack(idx,'duration',parseInt(t)||0)}
            />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input,styles.textArea]}
              placeholder="Description"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={2}
              value={track.description||''}
              onChangeText={t=>updateTrack(idx,'description',t)}
            />
            <Text style={styles.label}>Featured Artists</Text>
            <ArtistAutocomplete
              placeholder="Add artist"
              onArtistSelect={a=>{
                const tks=[...formData.tracks];
                if(!tks[idx].featuredArtists.find(x=>x.id===a.id)) tks[idx].featuredArtists.push(a);
                setFormData(p=>({...p,tracks:tks}));
              }}
              initialValue=""
            />
            <Text style={styles.label}>Audio File</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={()=>pickAudioFile(idx)}>
              <Text style={styles.fileText}>{track.audioFile?'Change':'Select'} Audio</Text>
            </TouchableOpacity>
            {formData.tracks.length>1 && (
              <TouchableOpacity style={styles.removeBtn} onPress={()=>removeTrack(idx)}>
                <Text style={styles.removeText}>Remove Track</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add Track Button */}
        <TouchableOpacity style={styles.addBtn} onPress={addTrack}>
          <Text style={styles.addText}>Add Track</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isUploading}>
          {isUploading ? <ActivityIndicator color="#fff"/> : <Text style={styles.submitText}>Upload</Text>}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  error: { color:'#ef4444', fontSize:18 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:48, paddingBottom:16 },
  backBtn:{ padding:8 },
  headerTitle:{ fontSize:20, color:'#fff' },
  viewBtn:{ padding:8 },
  viewText:{ color:'#8b5cf6' },
  content:{ padding:16 },
  section:{ marginBottom:16 },
  label:{ color:'#fff', marginBottom:4 },
  input:{ backgroundColor:'rgba(255,255,255,0.1)', borderRadius:8, paddingHorizontal:12, paddingVertical:Platform.OS==='ios'?12:8, color:'#fff', marginBottom:8 },
  textArea:{ minHeight:60, textAlignVertical:'top', marginBottom:8 },
  tags:{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 },
  tag:{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, backgroundColor:'rgba(255,255,255,0.1)', marginRight:8, marginBottom:8 },
  tagSel:{ backgroundColor:'rgba(139,92,246,0.3)' },
  tagText:{ color:'#94a3b8' },
  tagTextSel:{ color:'#8b5cf6' },
  fileBtn:{ backgroundColor:'rgba(139,92,246,0.2)', padding:12, borderRadius:8, alignItems:'center', marginBottom:8 },
  fileText:{ color:'#8b5cf6' },
  trackSection:{ borderWidth:1, borderColor:'rgba(255,255,255,0.1)', borderRadius:8, padding:12, marginBottom:16 },
  removeBtn:{ alignSelf:'flex-end', padding:4 },
  removeText:{ color:'#ef4444' },
  addBtn:{ backgroundColor:'rgba(255,255,255,0.1)', padding:12, borderRadius:8, alignItems:'center', marginBottom:16 },
  addText:{ color:'#fff' },
  submitBtn:{ backgroundColor:'#8b5cf6', padding:16, borderRadius:8, alignItems:'center', marginBottom:32 },
  submitText:{ color:'#fff', fontSize:16 },
});
