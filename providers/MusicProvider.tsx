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

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      unloadCurrentSound();
    };
  }, []);

  // Load initial data when user signs in
  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const unloadCurrentSound = async () => {
    if (statusSubRef.current) {
      statusSubRef.current();
      statusSubRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    try {
      await unloadCurrentSound();

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
      if (newQueue) setQueue(newQueue);
      setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 10));

      // Listen for status updates
      statusSubRef.current = sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setCurrentTime(status.positionMillis ?? 0);
        setDuration(status.durationMillis ?? track.duration * 1000);
        setIsPlaying(status.isPlaying ?? false);
        if (status.didJustFinish) {
          nextTrack();
        }
      });
    } catch (e) {
      console.error('Error playing track:', e);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const pauseTrack = async () => {
    try {
      if (!soundRef.current) return;
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error('Error pausing/resuming track:', e);
    }
  };

  const nextTrack = async () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const next = queue[(idx + 1) % queue.length];
    await playTrack(next, queue);
  };

  const previousTrack = async () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const prev = queue[idx === 0 ? queue.length - 1 : idx - 1];
    await playTrack(prev, queue);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Trending
      const { data: trendingData, error: trendErr } = await supabase
        .from('tracks')
        .select('id, title, duration, audio_url, cover_url, release_date, genres, explicit, artist:artist_id (id, name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (trendErr) throw trendErr;

      // New releases
      const { data: newData, error: newErr } = await supabase
        .from('tracks')
        .select('id, title, duration, audio_url, cover_url, release_date, genres, explicit, artist:artist_id (id, name)')
        .eq('is_published', true)
        .order('release_date', { ascending: false })
        .limit(10);
      if (newErr) throw newErr;

      const fmt = (arr: any[]) =>
        arr.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name ?? 'Unknown',
          album: 'Single',
          duration: t.duration,
          coverUrl: t.cover_url ?? '',
          audioUrl: t.audio_url,
          isLiked: false,
          genre: Array.isArray(t.genres) ? t.genres[0] : 'Unknown',
          releaseDate: t.release_date,
          playCount: 0,
        }));

      setTrendingTracks(fmt(trendingData ?? []));
      setNewReleases(fmt(newData ?? []));
    } catch (e) {
      console.error('Error loading music data:', e);
      setError('Failed to load music');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        queue,
        recentlyPlayed,
        trendingTracks,
        newReleases,
        isLoading,
        error,
        playTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
        refreshData,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used inside MusicProvider');
  return ctx;
};
