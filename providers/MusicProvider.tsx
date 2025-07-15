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
  searchMusic: (query: string) => Promise<{
    tracks: Track[];
    albums: any[];
    singles: Track[];
    artists: any[];
    users: any[];
  }>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const soundRef = useRef<Audio.Sound | null>(null);
  // store cleanup callback for playback status listener
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unloadCurrentSound();
    };
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const unloadCurrentSound = async () => {
    // remove playback status listener
    if (statusSubRef.current) {
      statusSubRef.current();
      statusSubRef.current = null;
    }
    // unload audio
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

      // Register status update and provide a cleanup function
      const updateStatus = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setCurrentTime(status.positionMillis ?? 0);
        setDuration(status.durationMillis ?? track.duration * 1000);
        setIsPlaying(status.isPlaying ?? false);
        if (status.didJustFinish) {
          nextTrack();
        }
      };
      sound.setOnPlaybackStatusUpdate(updateStatus);
      statusSubRef.current = () => {
        sound.setOnPlaybackStatusUpdate(null);
      };
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
      const { data: trendingData, error: trendErr } = await supabase
        .from('tracks')
        .select(
          'id, title, duration, audio_url, cover_url, release_date, genres, explicit, artist:artist_id (id, name)'
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (trendErr) throw trendErr;

      const { data: newData, error: newErr } = await supabase
        .from('tracks')
        .select(
          'id, title, duration, audio_url, cover_url, release_date, genres, explicit, artist:artist_id (id, name)'
        )
        .eq('is_published', true)
        .order('release_date', { ascending: false })
        .limit(10);
      if (newErr) throw newErr;

      const fmt = (arr: any[]) =>
        arr
          .filter((t) => !t.is_deleted && !t.deleted_at)
          .map(t => ({
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

  const searchMusic = async (query: string) => {
    const term = `%${query}%`;
    try {
      const [
        { data: trackData, error: trackErr },
        { data: albumData, error: albumErr },
        { data: artistData, error: artistErr },
        { data: userData, error: userErr },
      ] = await Promise.all([
        supabase
          .from('tracks')
          .select(
            'id, title, duration, audio_url, cover_url, release_date, genres, artist:artist_id (id, name)'
          )
          .ilike('title', term)
          .or('is_deleted.eq.false,deleted_at.is.null'),
        supabase
          .from('albums')
          .select('id, title, cover_url, release_date, artist:artist_id (id, name)')
          .ilike('title', term)
          .or('is_deleted.eq.false,deleted_at.is.null'),
        supabase
          .from('artists')
          .select('id, name, avatar_url')
          .ilike('name', term)
          .or('is_deleted.eq.false,deleted_at.is.null'),
        supabase
          .from('profiles')
          .select('id, display_name, profile_picture_url')
          .ilike('display_name', term)
          .eq('is_private', false),
      ]);

      if (trackErr || albumErr || artistErr || userErr) {
        console.error('Search error:', trackErr || albumErr || artistErr || userErr);
      }

      const fmtTrack = (arr: any[]) =>
        (arr || [])
          .filter((t) => !t.is_deleted && !t.deleted_at)
          .map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist?.name ?? 'Unknown',
            album: t.album ?? 'Single',
            duration: t.duration,
            coverUrl: t.cover_url ?? '',
            audioUrl: t.audio_url,
            isLiked: false,
            genre: Array.isArray(t.genres) ? t.genres[0] : 'Unknown',
            releaseDate: t.release_date,
          }));

      return {
        tracks: fmtTrack(trackData ?? []),
        albums: (albumData || []).filter((a) => !a.is_deleted && !a.deleted_at),
        singles: [],
        artists: (artistData || []).filter((a) => !a.is_deleted && !a.deleted_at),
        users: userData || [],
      };
    } catch (e) {
      console.error('Search failed:', e);
      return { tracks: [], albums: [], singles: [], artists: [], users: [] };
    }
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
        searchMusic,
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
