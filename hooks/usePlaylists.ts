import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { PlaylistResult } from '@/types';
import { transformPlaylist } from '@/utils/dataTransformers';

interface UsePlaylistsOptions {
  limit?: number;
  sortBy?: 'created_at' | 'title';
  ascending?: boolean;
  userId?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
}

interface UsePlaylistsReturn {
  playlists: PlaylistResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlaylists(options: UsePlaylistsOptions = {}): UsePlaylistsReturn {
  const {
    limit = 20,
    sortBy = 'created_at',
    ascending = false,
    userId,
    isPublic,
    isFeatured,
  } = options;

  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('playlists')
        .select('id, title, cover_url')
        .order(sortBy, { ascending })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (isPublic !== undefined) {
        query = query.eq('is_public', isPublic);
      }

      if (isFeatured !== undefined) {
        query = query.eq('is_featured', isFeatured);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('usePlaylists fetch error:', fetchError);
        throw fetchError;
      }

      const transformedPlaylists = (data || []).map(transformPlaylist);
      setPlaylists(transformedPlaylists);
    } catch (err) {
      console.error('usePlaylists error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
    } finally {
      setIsLoading(false);
    }
  }, [limit, sortBy, ascending, userId, isPublic, isFeatured]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    playlists,
    isLoading,
    error,
    refresh: fetchPlaylists,
  };
}