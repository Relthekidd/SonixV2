import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { useMusic, Track } from '@/providers/MusicProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function QueueModal({ visible, onClose }: Props) {
  const { queue, currentTrack, playTrack, removeFromQueue } = useMusic();
  const listRef = useRef<FlatList<Track>>(null);

  useEffect(() => {
    if (visible && currentTrack) {
      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      if (idx >= 0) {
        setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({ index: idx, animated: true });
          } catch {
            // ignore scroll errors
          }
        }, 100);
      }
    }
  }, [visible, currentTrack, queue]);

  const renderItem: ListRenderItem<Track> = ({ item }) => (
    <TouchableOpacity
      onPress={() => playTrack(item, queue)}
      className={`flex-row items-center p-2 mb-2 rounded-lg bg-white/5 ${
        item.id === currentTrack?.id ? 'border border-violet-500' : ''
      }`}
    >
      <Image source={{ uri: item.coverUrl }} className="w-12 h-12 rounded-md" />
      <View className="flex-1 ml-3">
        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-slate-400 text-xs" numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity onPress={() => removeFromQueue(item.id)} className="p-2">
        <Trash2 color="#ef4444" size={18} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/60">
        <View className="w-11/12 max-h-[80%] rounded-2xl p-4 bg-slate-800 glassCard brutalBorder brutalShadow">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-white">Queue</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={listRef}
            data={queue}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

