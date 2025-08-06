import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, ListPlus, Heart, Library } from 'lucide-react-native';

interface Props {
  onPlay?: () => void;
  onAddToQueue?: () => void;
  onToggleLike?: () => void;
  liked?: boolean;
  onAddToLibrary?: () => void;
}

export default function TrackMenu({
  onPlay,
  onAddToQueue,
  onToggleLike,
  liked,
  onAddToLibrary,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
    >
      {onPlay && (
        <TouchableOpacity style={styles.button} onPress={onPlay}>
          <Play color="#ffffff" size={24} />
          <Text style={styles.label}>Play</Text>
        </TouchableOpacity>
      )}

      {onAddToQueue && (
        <TouchableOpacity style={styles.button} onPress={onAddToQueue}>
          <ListPlus color="#ffffff" size={24} />
          <Text style={styles.label}>Queue</Text>
        </TouchableOpacity>
      )}

      {onToggleLike && (
        <TouchableOpacity style={styles.button} onPress={onToggleLike}>
          <Heart
            color={liked ? '#ef4444' : '#ffffff'}
            fill={liked ? '#ef4444' : 'none'}
            size={24}
          />
          <Text style={styles.label}>{liked ? 'Unlike' : 'Like'}</Text>
        </TouchableOpacity>
      )}

      {onAddToLibrary && (
        <TouchableOpacity style={styles.button} onPress={onAddToLibrary}>
          <Library color="#ffffff" size={24} />
          <Text style={styles.label}>Library</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
  },
  button: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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
