import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { AlbumResult } from '@/types';
import { transformAlbum } from '@/utils/dataTransformers';

interface UseAlbumsOptions {
  limit?: number;
  sortBy?: 'created_at' | 'release_date' | 'title';
  ascending?: boolean;
  artistId?: string;
  isPublished?: boolean;
}

interface UseAlbumsReturn {
  albums: AlbumResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAlbums(options: UseAlbumsOptions = {}): UseAlbumsReturn {
  const {
    limit = 20,
    sortBy = 'created_at',
    ascending = false,
    artistId,
    isPublished = true,
  } = options;

  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('albums')
        .select(`
          id,
          title,
          cover_url,
          artist:artist_id(name)
        `)
        .order(sortBy, { ascending })
        .limit(limit);

      if (isPublished !== undefined) {
        query = query.eq('is_published', isPublished);
      }

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('useAlbums fetch error:', fetchError);
        throw fetchError;
      }

      const transformedAlbums = (data || []).map(transformAlbum);
      setAlbums(transformedAlbums);
    } catch (err) {
      console.error('useAlbums error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
    } finally {
      setIsLoading(false);
    }
  }, [limit, sortBy, ascending, artistId, isPublished]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  return {
    albums,
    isLoading,
    error,
    refresh: fetchAlbums,
  };
}