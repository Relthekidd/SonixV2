import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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
  volume: number;
  recentlyPlayed: Track[];
  trendingTracks: Track[];
  newReleases: Track[];
  isLoading: boolean;
  error: string | null;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  refreshData: () => Promise<void>;
  searchMusic: (
    query: string,
    sort?: 'recent' | 'popular',
  ) => Promise<{
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
  setVolume: (value: number) => void;
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
  const [volume, setVolumeState] = useState(1);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library-related state
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Track[]>([]);

  const createPlaylist = async (name: string, description = '') => {
    if (!user) return;
    const { data, error } = await supabase
      .from('playlists')
      .insert({ name, description, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      const newPL: Playlist = {
        id: data.id,
        name: data.name,
        tracks: [],
        coverUrl: data.cover_url || '',
      };
      setPlaylists((prev) => [newPL, ...prev]);
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return;
    const already = likedSongs.some((t) => t.id === trackId);
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
        setLikedSongs((prev) => [...prev, track]);
      }
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

  useEffect(() => {
    return () => {
      if (statusSubRef.current) statusSubRef.current();
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    refreshData();
  }, [user]);

  const playTrack = async (track: Track, queueParam: Track[] = []) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true, volume },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        setCurrentTime(status.positionMillis / 1000);
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      });
      statusSubRef.current = () => sound.setOnPlaybackStatusUpdate(null);
      setCurrentTrack(track);
      if (user && track.artistId) {
        apiService.recordPlay(track.id, track.artistId);
      }
      setQueue(queueParam.length ? queueParam : [track]);
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

  const pauseTrack = async () => {
    try {
      await soundRef.current?.pauseAsync();
    } catch {}
    setIsPlaying(false);
  };

  const nextTrack = async () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    const nxt = queue[idx + 1] || queue[0];
    await playTrack(nxt, queue);
  };

  const previousTrack = async () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    const prev = queue[idx - 1] || queue[queue.length - 1];
    await playTrack(prev, queue);
  };

  const setVolume = (value: number) => {
    const vol = Math.min(1, Math.max(0, value));
    setVolumeState(vol);
    try {
      soundRef.current?.setVolumeAsync(vol);
    } catch {}
  };

  const seekTo = async (seconds: number) => {
    try {
      await soundRef.current?.setPositionAsync(seconds * 1000);
      setCurrentTime(seconds);
    } catch {}
  };

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

      const promises: any[] = [trendingQuery, newQuery];
      if (user) {
        promises.push(
          supabase
            .from('liked_songs')
            .select('track:tracks(*)')
            .eq('user_id', user.id),
          supabase
            .from('playlists')
            .select('id,name,cover_url,playlist_tracks(track:tracks(*))')
            .eq('user_id', user.id),
        );
      }
      const [trendingRes, newRes, likedRes, playlistRes] =
        await Promise.all(promises);

      const mapTrack = (t: any): Track => ({
        id: t.id,
        title: t.title,
        artist: t.artist?.name || t.artist_name || 'Unknown Artist',
        artistId: t.artist_id,
        album: t.album?.title || t.album_title || 'Single',
        albumId: t.album_id,
        duration: t.duration || 0,
        coverUrl: apiService.getPublicUrl(
          'images',
          t.cover_url || t.album?.cover_url || '',
        ),
        audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
        isLiked: likedSongs.some((l) => l.id === t.id),
        genre: Array.isArray(t.genres) ? t.genres[0] : t.genres || '',
        releaseDate: t.release_date || t.created_at,
        playCount: t.play_count,
        trackNumber: t.track_number,
        likeCount: t.like_count,
      });

      setTrendingTracks((trendingRes.data || []).map(mapTrack));
      setNewReleases((newRes.data || []).map(mapTrack));

      if (user && likedRes && playlistRes) {
        const liked = (likedRes.data || []).map((r: any) => ({
          ...r.track,
          id: r.track.id,
        })) as Track[];
        setLikedSongs(liked);
        const pls = (playlistRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          coverUrl: p.cover_url || '',
          tracks: (p.playlist_tracks || []).map((pt: any) => ({
            ...pt.track,
            id: pt.track.id,
          })),
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

      const tracks = (trackRes.data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist?.name || t.artist_name || 'Unknown Artist',
        artistId: t.artist_id,
        album: t.album?.title || t.album_title || 'Single',
        albumId: t.album_id,
        duration: t.duration || 0,
        coverUrl: apiService.getPublicUrl(
          'images',
          t.cover_url || t.album?.cover_url || '',
        ),
        audioUrl: apiService.getPublicUrl('audio-files', t.audio_url),
        isLiked: likedSongs.some((l) => l.id === t.id),
        genre: Array.isArray(t.genres) ? t.genres[0] : t.genres || '',
        releaseDate: t.release_date || t.created_at,
      }));

      return {
        tracks,
        albums: [],
        singles: [],
        artists: artistRes.data || [],
        users: userRes.data || [],
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
        recentlyPlayed,
        trendingTracks,
        newReleases,
        isLoading,
        error,
        playTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
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
