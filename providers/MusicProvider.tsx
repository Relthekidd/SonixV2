import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { apiService } from '@/services/api';
import { useAuth } from './AuthProvider';
import { useUserStats } from './UserStatsProvider';
import { useLibrary } from './LibraryProvider';
import {
  Track,
  Playlist,
  TrackRow,
  Artist,
  AlbumResult,
  PlaylistResult,
  UserResult,
} from '@/types';
import { transformTrack, transformAlbum, transformPlaylist, transformArtist, transformUser } from '@/utils/dataTransformers';

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: Track[];
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  recentlyPlayed: Track[];
  trendingTracks: Track[];
  newReleases: Track[];
  isLoading: boolean;
  error: string | null;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  resumeTrack: () => Promise<void>;
  pauseTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seekTo: (seconds: number) => Promise<void>;
  refreshData: () => Promise<void>;
  searchMusic: (
    query: string,
    sort?: 'recent' | 'popular',
  ) => Promise<{
    tracks: Track[];
    albums: AlbumResult[];
    playlists: PlaylistResult[];
    artists: Artist[];
    users: UserResult[];
  }>;
  setVolume: (value: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refreshStats } = useUserStats();
  const { likedSongIds, playlists, toggleLike, addToPlaylist, removeFromPlaylist, createPlaylist } = useLibrary();
  const soundRef = useRef<Audio.Sound | null>(null);
  const statusSubRef = useRef<(() => void) | null>(null);
  const originalQueueRef = useRef<Track[]>([]);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logPlay = useCallback(
    (duration: number) => {
      if (user && currentTrack) {
        apiService
          .recordPlay(
            currentTrack.id,
            currentTrack.artistId,
            user.id,
            Math.floor(duration),
          )
          .then(() => refreshStats());
      }
    },
    [user, currentTrack, refreshStats],
  );

  const shuffleArray = (arr: Track[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Update track liked status when library changes
  useEffect(() => {
    const updateTrack = (t: Track) => ({ ...t, isLiked: likedSongIds.includes(t.id) });
    
    setQueue((prev) => prev.map(updateTrack));
    setTrendingTracks((prev) => prev.map(updateTrack));
    setNewReleases((prev) => prev.map(updateTrack));
    setRecentlyPlayed((prev) => prev.map(updateTrack));
    setCurrentTrack((ct) => ct ? updateTrack(ct) : ct);
  }, [likedSongIds]);

  const addToQueue = (track: Track) => {
    setQueue((prev) => {
      const updated = [...prev, track];
      originalQueueRef.current = updated;
      return updated;
    });
  };

  const removeFromQueue = (trackId: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((t) => t.id === trackId);
      const updated = prev.filter((t) => t.id !== trackId);
      originalQueueRef.current = updated;
      if (index !== -1) {
        setCurrentIndex((prevIdx) => {
          if (index < prevIdx) return prevIdx - 1;
          if (index === prevIdx) return Math.min(prevIdx, updated.length - 1);
          return prevIdx;
        });
      }
      return updated;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    originalQueueRef.current = [];
    setCurrentIndex(-1);
  };

  const reorderQueue = (from: number, to: number) => {
    setQueue((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      originalQueueRef.current = updated;
      return updated;
    });
    setCurrentIndex((prevIdx) => {
      if (prevIdx === from) return to;
      if (from < prevIdx && to >= prevIdx) return prevIdx - 1;
      if (from > prevIdx && to <= prevIdx) return prevIdx + 1;
      return prevIdx;
    });
  };

  const handleTrackEnd = async () => {
    if (!queue.length) return;
    logPlay(duration);
    if (repeatMode === 'one') {
      try {
        await soundRef.current?.setPositionAsync(0);
        await soundRef.current?.playAsync();
      } catch (err) {
        console.error('repeat one error', err);
      }
      return;
    }
    let nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        setCurrentTrack(null);
        setCurrentTime(0);
        return;
      }
    }
    const next = queue[nextIdx];
    setCurrentTrack(null);
    setCurrentTime(0);
    await playTrack(next);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    if (status.didJustFinish && !status.isLooping) {
      handleTrackEnd();
    }
  };

  const playTrack = async (track: Track, queueParam: Track[] = []) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current.setOnPlaybackStatusUpdate(null);
      }

      if (currentTrack) {
        logPlay(currentTime);
      }

      if (queueParam.length) {
        originalQueueRef.current = queueParam;
        let workingQueue = queueParam;
        if (isShuffled) {
          const rest = queueParam.filter((t) => t.id !== track.id);
          workingQueue = [track, ...shuffleArray(rest)];
          setCurrentIndex(0);
        } else {
          const idx = queueParam.findIndex((t) => t.id === track.id);
          setCurrentIndex(idx);
        }
        setQueue(workingQueue);
      } else {
        if (queue.length === 0) {
          originalQueueRef.current = [track];
          setQueue([track]);
          setCurrentIndex(0);
        } else {
          const idx = queue.findIndex((t) => t.id === track.id);
          if (idx !== -1) setCurrentIndex(idx);
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true, volume },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
      statusSubRef.current = () => sound.setOnPlaybackStatusUpdate(null);
      setCurrentTrack(track);
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((t) => t.id !== track.id);
        return [track, ...filtered].slice(0, 20);
      });
    } catch (err) {
      console.error('playTrack error', err);
      Alert.alert('Playback Error', 'Unable to play this track.');
      setError((err as Error).message);
    }
  };

  const resumeTrack = async () => {
    try {
      await soundRef.current?.playAsync();
    } catch (err) {
      console.error('resumeTrack error', err);
    }
  };

  const pauseTrack = async () => {
    try {
      await soundRef.current?.pauseAsync();
    } catch (err) {
      console.error('pauseTrack error', err);
    }
    setIsPlaying(false);
  };

  const nextTrack = async () => {
    if (!queue.length) return;
    let nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else return;
    }
    await playTrack(queue[nextIdx]);
  };

  const previousTrack = async () => {
    if (!queue.length) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      if (repeatMode === 'all') prevIdx = queue.length - 1;
      else prevIdx = 0;
    }
    await playTrack(queue[prevIdx]);
  };

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const newVal = !prev;
      if (newVal) {
        if (currentTrack) {
          const shuffled = [
            currentTrack,
            ...shuffleArray(
              originalQueueRef.current.filter((t) => t.id !== currentTrack.id),
            ),
          ];
          setQueue(shuffled);
          setCurrentIndex(0);
        }
      } else {
        const idx = originalQueueRef.current.findIndex(
          (t) => t.id === currentTrack?.id,
        );
        setQueue(originalQueueRef.current);
        if (idx !== -1) setCurrentIndex(idx);
      }
      return newVal;
    });
  }, [currentTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) =>
      prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off',
    );
  }, []);

  const setVolume = (value: number) => {
    const vol = Math.min(1, Math.max(0, value));
    setVolumeState(vol);
    try {
      soundRef.current?.setVolumeAsync(vol);
    } catch (err) {
      console.error('setVolume error', err);
    }
  };

  const seekTo = async (seconds: number) => {
    try {
      await soundRef.current?.setPositionAsync(seconds * 1000);
      setCurrentTime(seconds);
    } catch (err) {
      console.error('seekTo error', err);
    }
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (statusSubRef.current) statusSubRef.current();
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const trendingQuery = supabase
        .from('tracks')
        .select(`*, artist:artist_id(*), album:album_id(*)`)
        .eq('is_published', true)
        .order('play_count', { ascending: false })
        .limit(20);
      const newQuery = supabase
        .from('tracks')
        .select(`*, artist:artist_id(*), album:album_id(*)`)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const [trendingRes, newRes] = await Promise.all([
        trendingQuery,
        newQuery,
      ]);

      const trendingData =
        (trendingRes as { data?: TrackRow[] | null })?.data ?? [];
      setTrendingTracks(
        trendingData.map((t) => transformTrack(t, likedSongIds)),
      );

      const newData = (newRes as { data?: TrackRow[] | null })?.data ?? [];
      setNewReleases(
        newData.map((t) => transformTrack(t, likedSongIds)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMusic = async (
    query: string,
    sort: 'recent' | 'popular' = 'recent',
  ) => {
    const term = query.trim();
    if (!term) {
      return {
        tracks: [],
        albums: [],
        playlists: [],
        artists: [],
        users: [],
      };
    }

    try {
      const [
        trackRes,
        albumRes,
        playlistRes,
        artistRes,
        profileRes,
      ] = await Promise.all([
        supabase
          .from('tracks')
          .select(`*, artist:artist_id(*), album:album_id(*)`)
          .ilike('title', `%${term}%`)
          .eq('is_published', true)
          .order(sort === 'popular' ? 'play_count' : 'created_at', {
            ascending: false,
          })
          .limit(10),
        supabase
          .from('albums')
          .select('id,title,cover_url,artist:artist_id(name)')
          .ilike('title', `%${term}%`)
          .limit(10),
        supabase
          .from('playlists')
          .select('id,title,cover_url')
          .eq('is_public', true)
          .ilike('title', `%${term}%`)
          .limit(10),
        supabase
          .from('artists')
          .select('id,name,avatar_url')
          .ilike('name', `%${term}%`)
          .limit(10),
        supabase
          .from('profiles')
          .select('id,username,avatar_url')
          .ilike('username', `%${term}%`)
          .limit(10),
      ]);

      const tracks = (trackRes.data || []).map((t: TrackRow) => transformTrack(t, likedSongIds));
      const albums = (albumRes.data || []).map(transformAlbum);
      const playlists = (playlistRes.data || []).map(transformPlaylist);
      const artists = (artistRes.data || []).map(transformArtist);
      const users = (profileRes.data || []).map(transformUser);

      return {
        tracks,
        albums,
        playlists,
        artists,
        users,
      };
    } catch (err) {
      console.error('searchMusic error', err);
      return {
        tracks: [],
        albums: [],
        playlists: [],
        artists: [],
        users: [],
      };
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
        volume,
        isShuffled,
        repeatMode,
        recentlyPlayed,
        trendingTracks,
        newReleases,
        isLoading,
        error,
        playTrack,
        resumeTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
        toggleShuffle,
        toggleRepeat,
        seekTo,
        refreshData,
        searchMusic,
        setVolume,
        addToQueue,
        removeFromQueue,
        clearQueue,
        reorderQueue,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be inside MusicProvider');
  return ctx;
};
