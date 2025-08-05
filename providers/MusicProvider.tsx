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
  tracks: Track[];
  coverUrl?: string;
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

interface PlaylistTrackRow {
  track: TrackRow;
}

interface PlaylistRow {
  id: string;
  title: string;
  cover_url?: string | null;
  playlist_tracks?: PlaylistTrackRow[];
}

interface LikedSongRow {
  track: TrackRow;
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
  likedSongs: Track[];
  playlists: Playlist[];
  albums: Track[];
  createPlaylist: (title: string, description?: string) => Promise<void>;
  toggleLike: (trackId: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  setVolume: (value: number) => void;
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
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Track[]>([]);

  const mapTrack = (t: TrackRow, liked = false): Track => ({
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
    isLiked: liked || likedSongs.some((l) => l.id === t.id),
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

  const createPlaylist = async (title: string, description = '') => {
    if (!user) return;
    const { data, error } = await supabase
      .from('playlists')
      .insert({ title, description, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      const newPL: Playlist = {
        id: data.id,
        title: data.title,
        tracks: [],
        coverUrl: data.cover_url || '',
      };
      setPlaylists((prev) => [newPL, ...prev]);
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return;
    const already = likedSongs.some((t) => t.id === trackId);
    try {
      if (already) {
        await supabase
          .from('liked_songs')
          .delete()
          .match({ user_id: user.id, track_id: trackId });
        setLikedSongs((prev) => prev.filter((t) => t.id !== trackId));
      } else {
        const track = queue.find((t) => t.id === trackId) || currentTrack;
        if (track) {
          await supabase
            .from('liked_songs')
            .upsert({ user_id: user.id, track_id: trackId });
          setLikedSongs((prev) => [...prev, { ...track, isLiked: true }]);
        }
      }

      const updateTrack = (t: Track) =>
        t.id === trackId ? { ...t, isLiked: !already } : t;

      setQueue((prev) => prev.map(updateTrack));
      setTrendingTracks((prev) => prev.map(updateTrack));
      setNewReleases((prev) => prev.map(updateTrack));
      setRecentlyPlayed((prev) => prev.map(updateTrack));
      setPlaylists((prev) =>
        prev.map((pl) => ({
          ...pl,
          tracks: pl.tracks.map(updateTrack),
        })),
      );
      setCurrentTrack((ct) =>
        ct && ct.id === trackId ? { ...ct, isLiked: !already } : ct,
      );
    } catch (err) {
      console.error('toggleLike error', err);
    }
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    if (!user) return;
    await supabase
      .from('playlist_tracks')
      .upsert({ playlist_id: playlistId, track_id: track.id });
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId ? { ...pl, tracks: [...pl.tracks, track] } : pl,
      ),
    );
  };

  const handleTrackEnd = async () => {
    if (!queue.length) return;
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
        return;
      }
    }
    const next = queue[nextIdx];
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
      if (user && track.artistId) {
        apiService.recordPlay(track.id, track.artistId);
      }
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

      const [trendingRes, newRes, likedRes, playlistRes] = await Promise.all([
        trendingQuery,
        newQuery,
        user
          ? supabase
              .from('liked_songs')
              .select('track:tracks!fk_liked_songs_track(*)')
              .eq('user_id', user.id)
          : Promise.resolve(null),
        user
          ? supabase
              .from('playlists')
              .select(
                'id,title,cover_url,playlist_tracks:playlist_tracks!fk_playlist_tracks_playlist(track:tracks!fk_playlist_tracks_track(*))',
              )
              .eq('user_id', user.id)
          : Promise.resolve(null),
      ]);

      const trendingData =
        ((trendingRes as { data?: TrackRow[] | null })?.data ?? []);
      setTrendingTracks(trendingData.map((t) => mapTrack(t)));

      const newData = ((newRes as { data?: TrackRow[] | null })?.data ?? []);
      setNewReleases(newData.map((t) => mapTrack(t)));

      if (user && likedRes && playlistRes) {
        const likedData =
          ((likedRes as { data?: LikedSongRow[] | null })?.data ?? []);
        const liked = likedData.map((r) => mapTrack(r.track, true));
        setLikedSongs(liked);
        const plsData =
          ((playlistRes as { data?: PlaylistRow[] | null })?.data ?? []);
        const pls = plsData.map((p) => ({
          id: p.id,
          title: p.title,
          coverUrl: p.cover_url || '',
          tracks: (p.playlist_tracks || []).map((pt: PlaylistTrackRow) =>
            mapTrack(pt.track),
          ),
        }));
        setPlaylists(pls);
      }
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
            `title.ilike.%${term}%,artist.name.ilike.%${term}%,genres.cs.{\"${term}\"}`,
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
        likedSongs,
        playlists,
        albums,
        createPlaylist,
        toggleLike,
        addToPlaylist,
        setVolume,
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
