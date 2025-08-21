import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause, Heart } from 'lucide-react-native';
import { useMusic } from '@/providers/MusicProvider';
import { useLibrary } from '@/providers/LibraryProvider';
import { Track } from '@/types';
import TrackOptionsMenu from './TrackOptionsMenu';
import { router } from 'expo-router';

interface Props {
  track: Track;
  playlistId?: string;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  onLongPress?: () => void;
  showLikeButton?: boolean;
  showOptionsMenu?: boolean;
}

export default function TrackItem({
  track,
  playlistId,
  isCurrent,
  isPlaying,
  onPlay,
  onLongPress,
  showLikeButton,
  showOptionsMenu = true,
}: Props) {
  const { toggleLike, likedSongIds } = useLibrary();
  const isLiked = track.isLiked || likedSongIds.includes(track.id);
  return (
    <View style={[styles.row, isCurrent && styles.currentRow]}>
      <TouchableOpacity
        style={styles.info}
        onPress={() => router.push(`/track/${track.id}` as const)}
        onLongPress={onLongPress}
      >
        <Image source={{ uri: track.coverUrl }} style={styles.image} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            <Text
              style={styles.artist}
              onPress={() =>
                track.artistId
                  ? router.push({
                      pathname: `/artist/${track.artistId}` as const,
                      params: {
                        artist: JSON.stringify({
                          id: track.artistId,
                          name: track.artist,
                        }),
                      },
                    })
                  : undefined
              }
            >
              {track.artist || 'Unknown Artist'}
            </Text>
            {track.featuredArtists && track.featuredArtists.length > 0 && (
              <Text style={styles.artist}>
                {' feat. '}
                {track.featuredArtists.map((a, idx) => (
                  <Text
                    key={a.id}
                    style={styles.artist}
                    onPress={() =>
                    router.push({
                        pathname: `/artist/${a.id}` as const,
                        params: { artist: JSON.stringify(a) },
                      })
                    }
                  >
                    {a.name}
                    {idx < track.featuredArtists.length - 1 ? ', ' : ''}
                  </Text>
                ))}
              </Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>
      {showOptionsMenu && (
        <TrackOptionsMenu track={track} playlistId={playlistId} />
      )}
      {showLikeButton && (
        <TouchableOpacity
          style={[styles.action, styles.brutalBorder]}
          onPress={() => toggleLike(track.id)}
        >
          <Heart
            color={isLiked ? '#ef4444' : '#8b5cf6'}
            fill={isLiked ? '#ef4444' : 'transparent'}
            size={16}
          />
        </TouchableOpacity>
      )}
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
