import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/hooks/useUpload';
import { ArtistAutocomplete } from '@/components/ArtistAutocomplete';
import { UploadProgressModal } from '@/components/UploadProgressModal';
import { apiService } from '@/services/api';
import { useAuth } from '@/providers/AuthProvider';

export default function UploadScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { isUploading, uploadProgress, uploadSingle, uploadAlbum } = useUpload();

  const [mode, setMode] = useState<'single' | 'album'>('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [mainArtist, setMainArtist] = useState<any>(null);
  const [coverFile, setCoverFile] = useState<any>(null);
  const [publish, setPublish] = useState(false);

  const [audioFile, setAudioFile] = useState<any>(null);
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');

  const [tracks, setTracks] = useState<
    Array<{ title: string; audioFile: any; duration: string; lyrics: string }>
  >([]);

  const [uploadDone, setUploadDone] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.[0]) setCoverFile(res.assets[0]);
  };

  const pickSingleAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!res.canceled && res.assets?.[0]) setAudioFile(res.assets[0]);
  };

  const pickTrackAudio = async (idx: number) => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!res.canceled && res.assets?.[0]) {
      const arr = [...tracks];
      arr[idx].audioFile = res.assets[0];
      setTracks(arr);
    }
  };

  const addTrack = () => {
    setTracks([
      ...tracks,
      { title: '', audioFile: null, duration: '', lyrics: '' },
    ]);
  };

  const validate = () => {
    if (!title.trim()) return Alert.alert('Error', 'Title required');
    if (!mainArtist) return Alert.alert('Error', 'Select main artist');
    if (mode === 'single') {
      if (!audioFile) return Alert.alert('Error', 'Select audio file');
    } else {
      if (tracks.length === 0)
        return Alert.alert('Error', 'Add at least one track');
      for (let i = 0; i < tracks.length; i++) {
        if (!tracks[i].title.trim())
          return Alert.alert('Error', `Track ${i + 1} title required`);
        if (!tracks[i].audioFile)
          return Alert.alert('Error', `Track ${i + 1} audio required`);
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      let id: string | null = null;
      if (mode === 'single') {
        id = await uploadSingle({
          title: title.trim(),
          lyrics,
          duration: Number(duration) || 0,
          genres: [],
          explicit: false,
          description,
          releaseDate,
          artistId: user!.id,
          mainArtistId: mainArtist.id,
          featuredArtistIds: [],
          coverFile,
          audioFile,
        });
        if (publish && id) await apiService.publishTrack(id);
      } else {
        const res = await uploadAlbum({
          title: title.trim(),
          description,
          releaseDate,
          genres: [],
          explicit: false,
          artistId: user!.id,
          mainArtistId: mainArtist.id,
          featuredArtistIds: [],
          coverFile,
          tracks: tracks.map((t, idx) => ({
            title: t.title.trim(),
            lyrics: t.lyrics,
            duration: Number(t.duration) || 0,
            explicit: false,
            trackNumber: idx + 1,
            featuredArtistIds: [],
            audioFile: t.audioFile,
          })),
        });
        id = res.albumId;
        if (publish) {
          for (const tid of res.trackIds) {
            await apiService.publishTrack(tid);
          }
        }
      }
      setNewId(id);
      setUploadDone(true);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    }
  };

  const handleDelete = async () => {
    if (!newId) return;
    try {
      await apiService.deleteContent(mode === 'album' ? 'album' : 'track', newId);
      Alert.alert('Deleted');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadDone(false);
      setNewId(null);
    }
  };

  const handleTogglePublish = async () => {
    if (!newId) return;
    try {
      if (publish) {
        await apiService.unpublishTrack(newId);
        setPublish(false);
      } else {
        await apiService.publishTrack(newId);
        setPublish(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggleRow}>
          {['single', 'album'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, mode === t && styles.toggleBtnActive]}
              onPress={() => setMode(t as any)}
            >
              <Text style={styles.toggleText}>{t === 'single' ? 'Single' : 'Album'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#64748b"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor="#64748b"
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={styles.input}
          placeholder="Release Date"
          placeholderTextColor="#64748b"
          value={releaseDate}
          onChangeText={setReleaseDate}
        />
        <ArtistAutocomplete onArtistSelect={setMainArtist} />
        <TouchableOpacity style={styles.fileBtn} onPress={pickCover}>
          <Text style={styles.fileBtnText}>{coverFile ? 'Change Cover' : 'Pick Cover Image'}</Text>
        </TouchableOpacity>
        {mode === 'single' && (
          <TouchableOpacity style={styles.fileBtn} onPress={pickSingleAudio}>
            <Text style={styles.fileBtnText}>{audioFile ? 'Change Audio File' : 'Pick Audio File'}</Text>
          </TouchableOpacity>
        )}
        {mode === 'album' && (
          <View style={{ width: '100%' }}>
            {tracks.map((t, idx) => (
              <View key={idx} style={styles.trackRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Track ${idx + 1} Title`}
                  placeholderTextColor="#64748b"
                  value={t.title}
                  onChangeText={(val) => {
                    const arr = [...tracks];
                    arr[idx].title = val;
                    setTracks(arr);
                  }}
                />
                <TouchableOpacity onPress={() => pickTrackAudio(idx)} style={styles.fileBtnSmall}>
                  <Text style={styles.fileBtnText}>{t.audioFile ? 'Replace' : 'Audio'}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.fileBtn} onPress={addTrack}>
              <Text style={styles.fileBtnText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Duration (sec)"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Lyrics"
          placeholderTextColor="#64748b"
          value={lyrics}
          onChangeText={setLyrics}
          multiline
        />
        <View style={styles.publishRow}>
          <Text style={styles.toggleText}>Publish now</Text>
          <Switch value={publish} onValueChange={setPublish} />
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isUploading}>
          <Text style={styles.submitText}>{isUploading ? 'Uploading...' : 'Upload'}</Text>
        </TouchableOpacity>
        {uploadDone && isAdmin && newId && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleTogglePublish}>
              <Text style={styles.actionText}>{publish ? 'Unpublish' : 'Publish'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <UploadProgressModal
        visible={isUploading || uploadDone}
        progress={uploadProgress}
        isComplete={uploadDone}
        title={title}
        type={mode}
      />
      {uploadDone && (
        <TouchableOpacity
          style={styles.doneOverlay}
          onPress={() => {
            setUploadDone(false);
            setTitle('');
            setDescription('');
            setAudioFile(null);
            setCoverFile(null);
            setTracks([]);
          }}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  toggleRow: { flexDirection: 'row', marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
  toggleBtnActive: { backgroundColor: 'rgba(139,92,246,0.3)' },
  toggleText: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  fileBtn: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  fileBtnSmall: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  fileBtnText: { color: '#fff' },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  submitBtn: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitText: { color: '#fff', fontWeight: '600' },
  publishRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  adminActions: { flexDirection: 'row', marginTop: 20 },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  actionText: { color: '#fff' },
  doneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
