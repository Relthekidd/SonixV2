import React from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import TrackItem from './TrackItem';
import { Track } from '@/providers/MusicProvider';

interface Props {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onPlay: (track: Track) => void;
  playlistId?: string;
  editable?: boolean;
  onReorder?: (tracks: Track[]) => void;
}

export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onPlay,
  playlistId,
  editable,
  onReorder,
}: Props) {
  if (editable) {
    const renderItem = ({ item, drag }: RenderItemParams<Track>) => (
      <TrackItem
        track={item}
        playlistId={playlistId}
        isCurrent={currentTrackId === item.id}
        isPlaying={isPlaying}
        onPlay={() => onPlay(item)}
        onLongPress={drag}
      />
    );

    return (
      <DraggableFlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => onReorder?.(data)}
        contentContainerStyle={styles.list}
      />
    );
  }

  return (
    <View style={styles.list}>
      {tracks.map((t) => (
        <View key={t.id} style={styles.itemWrapper}>
          <TrackItem
            track={t}
            playlistId={playlistId}
            isCurrent={currentTrackId === t.id}
            isPlaying={isPlaying}
            onPlay={() => onPlay(t)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20 },
  itemWrapper: { marginBottom: 12 },
});
