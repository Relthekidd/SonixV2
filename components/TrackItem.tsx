import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { Track } from '@/providers/MusicProvider';
import TrackMenu from './TrackMenu';
import { router } from 'expo-router';

interface Props {
  track: Track;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
}

export default function TrackItem({ track, isCurrent, isPlaying, onPlay }: Props) {
  return (
    <View style={[styles.row, isCurrent && styles.currentRow]}>
      <TouchableOpacity
        style={styles.info}
        onPress={() => router.push(`/track/${track.id}`)}
      >
        <Image source={{ uri: track.coverUrl }} style={styles.image} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </TouchableOpacity>
      <TrackMenu track={track} />
      <TouchableOpacity
        style={[styles.action, styles.brutalBorder]}
        onPress={onPlay}
      >
        {isCurrent && isPlaying ? (
          <Pause color="#8b5cf6" size={16} />
        ) : (
          <Play color="#8b5cf6" size={16} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  action: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
