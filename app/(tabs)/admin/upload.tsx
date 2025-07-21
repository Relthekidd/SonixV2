import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
// @ts-ignore
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
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
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [published, setPublished] = useState(false);

  const [audioFile, setAudioFile] = useState<any>(null);
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');

  const [tracks, setTracks] = useState<
    Array<{ title: string; audioFile: any; duration: string; lyrics: string }>
  >([]);

  const [uploadDone, setUploadDone] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    if (uploadDone) {
      const t = setTimeout(() => {
        setUploadDone(false);
        setTitle('');
        setDescription('');
        setAudioFile(null);
        setCoverFile(null);
        setTracks([]);
        router.push('/admin/uploads');
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [uploadDone]);

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
      const isPublished = publishMode === 'now';
      const scheduledPublishAt =
        publishMode === 'schedule' && scheduledAt
          ? scheduledAt.toISOString()
          : null;
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
          isPublished,
          scheduledPublishAt,
        });
        if (isPublished && id) await apiService.publishTrack(id);
        setPublished(isPublished);
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
          isPublished,
          scheduledPublishAt,
        });
        id = res.albumId;
        if (isPublished) {
          for (const tid of res.trackIds) {
            await apiService.publishTrack(tid);
          }
        }
        setPublished(isPublished);
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
      if (published) {
        await apiService.unpublishTrack(newId);
        setPublished(false);
      } else {
        await apiService.publishTrack(newId);
        setPublished(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, styles.card, styles.toggleRow]}>
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
        <View style={[styles.section, styles.card]}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.label}>Release Date</Text>
          <TextInput
            style={styles.input}
            placeholder="Release Date"
            placeholderTextColor="#64748b"
            value={releaseDate}
            onChangeText={setReleaseDate}
          />
          <ArtistAutocomplete onArtistSelect={setMainArtist} />
        </View>
        <View style={[styles.section, styles.card]}>
          <TouchableOpacity style={styles.fileBtn} onPress={pickCover}>
            <Text style={styles.fileBtnText}>
              {coverFile ? 'Change Cover' : 'Pick Cover Image'}
            </Text>
          </TouchableOpacity>
          {coverFile && (
            <>
              <Image source={{ uri: coverFile.uri }} style={styles.preview} />
              <Text style={styles.fileNameText}>
                {coverFile.name || coverFile.uri.split('/').pop()}
              </Text>
            </>
          )}
        </View>
        {mode === 'single' && (
          <View style={[styles.section, styles.card]}>
            <TouchableOpacity style={styles.fileBtn} onPress={pickSingleAudio}>
              <Text style={styles.fileBtnText}>
                {audioFile ? 'Change Audio File' : 'Pick Audio File'}
              </Text>
            </TouchableOpacity>
            {audioFile && (
              <Text style={styles.fileNameText}>
                {audioFile.name || audioFile.uri.split('/').pop()}
              </Text>
            )}
          </View>
        )}
        {mode === 'album' && (
          <View style={[styles.section, styles.card, { width: '100%' }]}>
            {tracks.map((t, idx) => (
              <View key={idx} style={styles.trackContainer}>
                <View style={styles.trackRow}>
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
                  <TouchableOpacity
                    onPress={() => pickTrackAudio(idx)}
                    style={styles.fileBtnSmall}
                  >
                    <Text style={styles.fileBtnText}>
                      {t.audioFile ? 'Replace' : 'Audio'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {t.audioFile && (
                  <Text style={styles.fileNameText}>
                    {t.audioFile.name || t.audioFile.uri.split('/').pop()}
                  </Text>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.fileBtn} onPress={addTrack}>
              <Text style={styles.fileBtnText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.section, styles.card]}>
          <Text style={styles.label}>Duration (sec)</Text>
          <TextInput
            style={styles.input}
            placeholder="Duration"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />
          <Text style={styles.label}>Lyrics</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Lyrics"
            placeholderTextColor="#64748b"
            value={lyrics}
            onChangeText={setLyrics}
            multiline
          />
        </View>
        <View style={[styles.section, styles.card, styles.publishRow]}>
          {['now', 'schedule', 'draft'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.toggleBtn,
                publishMode === opt && styles.toggleBtnActive,
                { marginRight: 8 },
              ]}
              onPress={() => setPublishMode(opt as any)}
            >
              <Text style={styles.toggleText}>
                {opt === 'now' ? 'Publish Now' : opt === 'schedule' ? 'Schedule' : 'Draft'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {publishMode === 'schedule' && (
          <View style={[styles.section, styles.card, styles.row]}>
            <TouchableOpacity
              style={styles.fileBtn}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.fileBtnText}>
                {scheduledAt ? scheduledAt.toLocaleString() : 'Pick Date & Time'}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={scheduledAt || new Date()}
                mode="datetime"
                onChange={(event: any, d?: Date) => {
                  setShowPicker(false);
                  if (d) setScheduledAt(d);
                }}
              />
            )}
          </View>
        )}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isUploading}>
          <Text style={styles.submitText}>{isUploading ? 'Uploading...' : 'Upload'}</Text>
        </TouchableOpacity>
        {uploadDone && isAdmin && newId && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleTogglePublish}>
              <Text style={styles.actionText}>{published ? 'Unpublish' : 'Publish'}</Text>
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
        <View style={styles.doneOverlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              setUploadDone(false);
              setTitle('');
              setDescription('');
              setAudioFile(null);
              setCoverFile(null);
              setTracks([]);
              router.push('/admin/uploads');
            }}
          >
            <Text style={styles.doneText}>View Uploads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              setUploadDone(false);
              setTitle('');
              setDescription('');
              setAudioFile(null);
              setCoverFile(null);
              setTracks([]);
              router.push('/admin');
            }}
          >
            <Text style={styles.doneText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  section: { marginBottom: 20, width: '100%' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  toggleRow: { flexDirection: 'row' },
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
  label: { color: '#cbd5e1', marginBottom: 4 },
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
  fileNameText: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  preview: { width: '100%', height: 150, marginTop: 8, borderRadius: 8 },
  trackContainer: { marginBottom: 12 },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  submitBtn: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitText: { color: '#fff', fontWeight: '600' },
  publishRow: { flexDirection: 'row', alignItems: 'center' },
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  closeBtn: {
    backgroundColor: 'rgba(139,92,246,0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
