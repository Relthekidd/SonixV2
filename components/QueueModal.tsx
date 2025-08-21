import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
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
  const { queue, currentTrack, playTrack, removeFromQueue } = useMusic();
  const listRef = useRef<DraggableFlatList<Track>>(null);

  useEffect(() => {
    if (visible && currentTrack) {
      const index = queue.findIndex((t) => t.id === currentTrack?.id);
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, 100);
      }
    }
  }, [visible, queue, currentTrack]);

  const renderItem = ({ item, drag }: RenderItemParams<Track>) => (
    <TouchableOpacity
      onPress={() => playTrack(item, queue)}
      onLongPress={drag}
      style={[
        styles.row,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
        item.id === currentTrack?.id && styles.currentRow,
      ]}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.image} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => removeFromQueue(item.id)}
        style={styles.removeBtn}
      >
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

          <DraggableFlatList
            ref={listRef}
            data={queue}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: {
    width: '90%',
    maxHeight: '80%',
    padding: 16,
    borderRadius: 24,
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
    fontWeight: '600',
    color: 'white',
  },
  closeBtn: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  currentRow: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  meta: { flex: 1 },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  artist: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  removeBtn: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
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
