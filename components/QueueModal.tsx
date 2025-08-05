import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, { SlideInUp, FadeOut } from 'react-native-reanimated';
import { useMusic, Track } from '@/providers/MusicProvider';
import { X, Trash2 } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function QueueModal({ visible, onClose }: Props) {
  const {
    queue,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = useMusic();

  const listRef = useRef<DraggableFlatList<Track>>(null);

  useEffect(() => {
    if (visible) {
      const index = queue.findIndex((t) => t.id === currentTrack?.id);
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true });
        }, 100);
      }
    }
  }, [visible, queue, currentTrack]);

  const renderItem = ({ item, drag }: RenderItemParams<Track>) => (
    <TouchableOpacity
      style={[styles.trackItem, item.id === currentTrack?.id && styles.current]}
      onLongPress={drag}
      onPress={() => playTrack(item, queue)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity onPress={() => removeFromQueue(item.id)} style={styles.remove}>
        <Trash2 color="#ef4444" size={18} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Animated.View
          entering={SlideInUp.springify()}
          exiting={FadeOut}
          style={[styles.content, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
        >
          <View style={styles.header}>
            <Text style={styles.heading}>Queue</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          {queue.length > 0 && (
            <TouchableOpacity onPress={clearQueue} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear Queue</Text>
            </TouchableOpacity>
          )}

          <DraggableFlatList
            ref={listRef}
            data={queue}
            keyExtractor={(item) => item.id}
            onDragEnd={({ from, to }) => reorderQueue(from, to)}
            renderItem={renderItem}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  closeBtn: { padding: 4 },
  clearBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  clearText: {
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
    borderRadius: 8,
  },
  current: {
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  cover: { width: 40, height: 40, borderRadius: 6 },
  info: { flex: 1, marginLeft: 12 },
  title: { color: '#fff', fontSize: 14, fontFamily: 'Inter-SemiBold' },
  artist: { color: '#94a3b8', fontSize: 12, fontFamily: 'Inter-Regular' },
  remove: { padding: 8 },
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
