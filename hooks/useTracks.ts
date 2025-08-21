import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Track, TrackRow } from '@/types';
import { transformTrack } from '@/utils/dataTransformers';

interface UseTracksOptions {
  limit?: number;
  sortBy?: 'created_at' | 'play_count' | 'title';
  ascending?: boolean;
  isPublished?: boolean;
  artistId?: string;
  albumId?: string;
}

interface UseTracksReturn {
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTracks(
  options: UseTracksOptions = {},
  likedSongIds: string[] = []
): UseTracksReturn {
  const {
    limit = 20,
    sortBy = 'created_at',
    ascending = false,
    isPublished = true,
    artistId,
    albumId,
  } = options;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tracks')
        .select(`
          *,
          artist:artist_id(id, name),
          album:album_id(id, title, cover_url)
        `)
        .order(sortBy, { ascending })
        .limit(limit);

      if (isPublished !== undefined) {
        query = query.eq('is_published', isPublished);
      }

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }

      if (albumId) {
        query = query.eq('album_id', albumId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('useTracks fetch error:', fetchError);
        throw fetchError;
      }

      const transformedTracks = (data as TrackRow[] || []).map((t) =>
        transformTrack(t, likedSongIds)
      );

      setTracks(transformedTracks);
    } catch (err) {
      console.error('useTracks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setIsLoading(false);
    }
  }, [limit, sortBy, ascending, isPublished, artistId, albumId, likedSongIds]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  return {
    tracks,
    isLoading,
    error,
    refresh: fetchTracks,
  };
}