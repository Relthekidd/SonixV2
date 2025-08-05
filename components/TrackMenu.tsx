import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from 'react-native';
import { MoreVertical, X } from 'lucide-react-native';
import { useMusic, Track, Playlist } from '@/providers/MusicProvider';

interface Props {
  track: Track;
}

export default function TrackMenu({ track }: Props) {
  const {
    toggleLike,
    addToQueue,
    playlists,
    addToPlaylist,
  } = useMusic();
  const [visible, setVisible] = useState(false);
  const [selectPlaylist, setSelectPlaylist] = useState(false);

  const handleAddToPlaylist = (pl: Playlist) => {
    addToPlaylist(pl.id, track);
    setSelectPlaylist(false);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.button}>
        <MoreVertical color="#94a3b8" size={20} />
      </TouchableOpacity>
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.menu, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
            <TouchableOpacity style={styles.close} onPress={() => setVisible(false)}>
              <X color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setSelectPlaylist(true)}
            >
              <Text style={styles.menuText}>Add to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleLike(track.id);
                setVisible(false);
              }}
            >
              <Text style={styles.menuText}>
                {track.isLiked ? 'Unlike' : 'Like'} Song
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                addToQueue(track);
                setVisible(false);
              }}
            >
              <Text style={styles.menuText}>Add to Queue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={selectPlaylist} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.playlistSelect, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
            <TouchableOpacity
              style={styles.close}
              onPress={() => setSelectPlaylist(false)}
            >
              <X color="#fff" size={20} />
            </TouchableOpacity>
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAddToPlaylist(item)}
                >
                  <Text style={styles.menuText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { padding: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    width: 220,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  menuItem: {
    paddingVertical: 12,
  },
  menuText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  playlistSelect: {
    width: 260,
    maxHeight: '70%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
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
