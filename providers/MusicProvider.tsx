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

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  isLiked: boolean;
  genre: string;
  genres?: string[];
  releaseDate: string;
  year?: string;
  description?: string;
  playCount?: number;
  trackNumber?: number;
  lyrics?: string;
  likeCount?: number;
}

export interface Playlist {
  id: string;
  title: string;
  trackIds: string[];
}

export interface TrackRow {
  id: string;
  title: string;
  artist_id?: string | null;
  artist?: { name?: string } | null;
  artist_name?: string | null;
  album_id?: string | null;
  album?: { title?: string; cover_url?: string | null } | null;
  album_title?: string | null;
  duration?: number | null;
  cover_url?: string | null;
  audio_url: string;
  genres?: string[] | string | null;
  release_date?: string | null;
  created_at?: string;
  play_count?: number | null;
  track_number?: number | null;
  like_count?: number | null;
  description?: string | null;
  lyrics?: string | null;
}

interface Artist {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface UserProfile {
  id: string;
  display_name: string;
  profile_picture_url?: string | null;
}

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
    albums: Track[];
    singles: Track[];
    artists: Artist[];
    users: UserProfile[];
  }>;
  // Library-related state & actions
  likedSongIds: string[];
  playlists: Playlist[];
  createPlaylist: (title: string) => Promise<Playlist | null>;
  toggleLike: (trackId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  setVolume: (value: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  // Library-related state
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const logPlay = useCallback(
    (duration: number) => {
      if (user && currentTrack) {
        apiService.recordPlay(
          currentTrack.id,
          currentTrack.artistId,
          user.id,
          Math.floor(duration),
        );
      }
    },
    [user, currentTrack],
  );

  const mapTrack = (
    t: TrackRow,
    liked = false,
    likedIds: string[] = likedSongIds,
  ): Track => ({
    id: t.id,
    title: t.title,
    artist: t.artist?.name || t.artist_name || 'Unknown Artist',
    artistId: t.artist_id || undefined,
    album: t.album?.title || t.album_title || 'Single',
    albumId: t.album_id || undefined,
    duration: t.duration ?? 0,
    coverUrl: apiService.getPublicUrl(
      'images',
      t.cover_url || t.album?.cover_url || '',
    ),
    audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
    isLiked: liked || likedIds.includes(t.id),
    genre: Array.isArray(t.genres) ? t.genres[0] : (t.genres as string) || '',
    genres: Array.isArray(t.genres)
      ? (t.genres as string[])
      : typeof t.genres === 'string'
        ? [t.genres]
        : [],
    releaseDate: t.release_date || t.created_at || '',
    year: t.release_date
      ? new Date(t.release_date).getFullYear().toString()
      : undefined,
    description: t.description || '',
    playCount: t.play_count || undefined,
    trackNumber: t.track_number || undefined,
    lyrics: t.lyrics || undefined,
    likeCount: t.like_count || undefined,
  });

  const shuffleArray = (arr: Track[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const createPlaylist = async (title: string): Promise<Playlist | null> => {
    if (!user) return null;
    try {
      const data = await apiService.createPlaylist(user.id, title);
      const newPL: Playlist = { id: data.id, title: data.title, trackIds: [] };
      setPlaylists((prev) => [newPL, ...prev]);
      return newPL;
    } catch (err) {
      console.error('createPlaylist error', err);
      return null;
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return;
    const already = likedSongIds.includes(trackId);
    try {
      await apiService.toggleLike(user.id, trackId, already);
      setLikedSongIds((prev) =>
        already ? prev.filter((id) => id !== trackId) : [...prev, trackId],
      );

      const updateTrack = (t: Track) =>
        t.id === trackId ? { ...t, isLiked: !already } : t;

      setQueue((prev) => prev.map(updateTrack));
      setTrendingTracks((prev) => prev.map(updateTrack));
      setNewReleases((prev) => prev.map(updateTrack));
      setRecentlyPlayed((prev) => prev.map(updateTrack));
      setCurrentTrack((ct) =>
        ct && ct.id === trackId ? { ...ct, isLiked: !already } : ct,
      );
    } catch (err) {
      console.error('toggleLike error', err);
    }
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    if (!user) return;
    const pl = playlists.find((p) => p.id === playlistId);
    const position = pl ? pl.trackIds.length : 0;
    try {
      await apiService.addTrackToPlaylist(playlistId, track.id, position);
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? { ...p, trackIds: [...p.trackIds, track.id] }
            : p,
        ),
      );
    } catch (err) {
      console.error('addToPlaylist error', err);
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
            : p,
        ),
      );
    } catch (err) {
      console.error('removeFromPlaylist error', err);
    }
  };

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

      const [trendingRes, newRes, library] = await Promise.all([
        trendingQuery,
        newQuery,
        user ? apiService.getUserLibrary(user.id) : Promise.resolve(null),
      ]);

      const libraryData =
        (library as { likedSongIds: string[]; playlists: Playlist[] }) ||
        { likedSongIds: [], playlists: [] };
      setLikedSongIds(libraryData.likedSongIds);
      setPlaylists(libraryData.playlists);

      const trendingData =
        (trendingRes as { data?: TrackRow[] | null })?.data ?? [];
      setTrendingTracks(
        trendingData.map((t) => mapTrack(t, false, libraryData.likedSongIds)),
      );

      const newData = (newRes as { data?: TrackRow[] | null })?.data ?? [];
      setNewReleases(
        newData.map((t) => mapTrack(t, false, libraryData.likedSongIds)),
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
      return { tracks: [], albums: [], singles: [], artists: [], users: [] };
    }

    try {
      const [trackRes, artistRes, userRes] = await Promise.all([
        supabase
          .from('tracks')
          .select(`*, artist:artist_id(*), album:album_id(*)`)
          .or(
            `title.ilike.%${term}%,artist.name.ilike.%${term}%,genres.cs.{"${term}"}`,
          )
          .eq('is_published', true)
          .order(sort === 'popular' ? 'play_count' : 'created_at', {
            ascending: false,
          })
          .limit(10),
        supabase
          .from('artists')
          .select('id,name,avatar_url')
          .ilike('name', `%${term}%`)
          .limit(10),
        supabase.rpc('search_users', { search_query: term, limit_count: 10 }),
      ]);

      const tracks = (trackRes.data || []).map((t: TrackRow) => mapTrack(t));

      return {
        tracks,
        albums: [],
        singles: [],
        artists: (artistRes.data || []) as Artist[],
        users: (userRes.data || []) as UserProfile[],
      };
    } catch (err) {
      console.error('searchMusic error', err);
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
        likedSongIds,
        playlists,
        createPlaylist,
        toggleLike,
        addToPlaylist,
        removeFromPlaylist,
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
