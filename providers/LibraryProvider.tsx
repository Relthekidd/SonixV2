import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { apiService } from '@/services/api';
import { Playlist } from '@/types';

interface LibraryContextType {
  likedSongIds: string[];
  playlists: Playlist[];
  isLoading: boolean;
  error: string | null;
  createPlaylist: (title: string) => Promise<Playlist | null>;
  toggleLike: (trackId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setLikedSongIds([]);
      setPlaylists([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const library = await apiService.getUserLibrary(user.id);
      setLikedSongIds(library.likedSongIds);
      setPlaylists(library.playlists);
    } catch (err) {
      console.error('LibraryProvider refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createPlaylist = async (title: string): Promise<Playlist | null> => {
    if (!user) return null;

    try {
      const data = await apiService.createPlaylist(user.id, title);
      const newPlaylist: Playlist = {
        id: data.id,
        title: data.title,
        trackIds: [],
      };
      setPlaylists((prev) => [newPlaylist, ...prev]);
      return newPlaylist;
    } catch (err) {
      console.error('createPlaylist error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
      return null;
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return;

    const isLiked = likedSongIds.includes(trackId);

    try {
      await apiService.toggleLike(user.id, trackId, isLiked);
      setLikedSongIds((prev) =>
        isLiked
          ? prev.filter((id) => id !== trackId)
          : [...prev, trackId]
      );
    } catch (err) {
      console.error('toggleLike error:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
    }
  };

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    if (!user) return;

    const playlist = playlists.find((p) => p.id === playlistId);
    const position = playlist ? playlist.trackIds.length : 0;

    try {
      await apiService.addTrackToPlaylist(playlistId, trackId, position);
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? { ...p, trackIds: [...p.trackIds, trackId] }
            : p
        )
      );
    } catch (err) {
      console.error('addToPlaylist error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to playlist');
    }
  };

  const removeFromPlaylist = async (playlistId: string, trackId: string) => {
    if (!user) return;

    try {
      await apiService.removeTrackFromPlaylist(playlistId, trackId);
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) }
            : p
        )
      );
    } catch (err) {
      console.error('removeFromPlaylist error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove from playlist');
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  return (
    <LibraryContext.Provider
      value={{
        likedSongIds,
        playlists,
        isLoading,
        error,
        createPlaylist,
        toggleLike,
        addToPlaylist,
        removeFromPlaylist,
        refreshLibrary,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};