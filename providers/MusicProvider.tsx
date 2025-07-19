import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { supabase } from '@/providers/AuthProvider';
import { useAuth } from './AuthProvider';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  isLiked: boolean;
  genre: string;
  releaseDate: string;
  playCount?: number;
  trackNumber?: number;
  lyrics?: string;
  likeCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  coverUrl?: string;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: Track[];
  recentlyPlayed: Track[];
  trendingTracks: Track[];
  newReleases: Track[];
  isLoading: boolean;
  error: string | null;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  refreshData: () => Promise<void>;
  searchMusic: (query: string) => Promise<{
    tracks: Track[];
    albums: any[];
    singles: Track[];
    artists: any[];
    users: any[];
  }>;
  // Library-related state & actions
  likedSongs: Track[];
  playlists: Playlist[];
  albums: Track[];
  createPlaylist: (name: string, description?: string) => Promise<void>;
  toggleLike: (trackId: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const soundRef = useRef<Audio.Sound | null>(null);
  const statusSubRef = useRef<(() => void) | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library-related state
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Track[]>([]);

  const createPlaylist = async (name: string, description = '') => {
    const newPL: Playlist = { id: Date.now().toString(), name, tracks: [], coverUrl: '' };
    setPlaylists(prev => [newPL, ...prev]);
  };

  const toggleLike = (trackId: string) => {
    setLikedSongs(prev => {
      if (prev.some(t => t.id === trackId)) {
        return prev.filter(t => t.id !== trackId);
      }
      const track = queue.find(t => t.id === trackId) || currentTrack;
      return track ? [...prev, track] : prev;
    });
  };

  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => prev.map(pl => pl.id === playlistId ? { ...pl, tracks: [...pl.tracks, track] } : pl));
  };

  useEffect(() => () => {
    if (statusSubRef.current) statusSubRef.current();
    if (soundRef.current) soundRef.current.unloadAsync();
  }, []);

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const playTrack = async (track: Track, queueParam: Track[] = []) => {
    setCurrentTrack(track);
    setQueue(queueParam);
    setIsPlaying(true);
  };

  const pauseTrack = async () => {
    setIsPlaying(false);
  };

  const nextTrack = async () => {
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    const nxt = queue[idx + 1] || queue[0];
    await playTrack(nxt, queue);
  };

  const previousTrack = async () => {
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    const prev = queue[idx - 1] || queue[queue.length - 1];
    await playTrack(prev, queue);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      setTrendingTracks([]);
      setNewReleases([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMusic = async (query: string) => ({ tracks: [], albums: [], singles: [], artists: [], users: [] });

  return (
    <MusicContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, queue,
      recentlyPlayed, trendingTracks, newReleases, isLoading, error,
      playTrack, pauseTrack, nextTrack, previousTrack, refreshData, searchMusic,
      likedSongs, playlists, albums, createPlaylist, toggleLike, addToPlaylist
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be inside MusicProvider');
  return ctx;
};
