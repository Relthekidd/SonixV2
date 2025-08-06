import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { Track } from '@/providers/MusicProvider';
import TrackOptionsMenu from './TrackOptionsMenu';
import { router } from 'expo-router';

interface Props {
  track: Track;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
}

export default function MiniTrackCard({
  track,
  isCurrent,
  isPlaying,
  onPlay,
}: Props) {

  const subtitle =
    track.artist +
    (track.featuredArtists && track.featuredArtists.length > 0
      ? ' \u2022 feat. ' + track.featuredArtists.map((a) => a.name).join(', ')
      : '');

  return (
    <View
      style={[
        styles.card,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
        isCurrent && styles.current,
      ]}
    >
      <TouchableOpacity onPress={() => router.push(`/track/${track.id}` as const)}>
        <Image source={{ uri: track.coverUrl }} style={styles.cover} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {track.title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconButton, styles.brutalBorder]}
          onPress={onPlay}
        >
          {isCurrent && isPlaying ? (
            <Pause color="#8b5cf6" size={16} />
          ) : (
            <Play color="#8b5cf6" size={16} />
          )}
        </TouchableOpacity>
        <TrackOptionsMenu track={track} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  current: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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

