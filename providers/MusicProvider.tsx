import React, { createContext, useContext, useState, useEffect } from 'react';
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
  likeCount?: number;
  trackNumber?: number;
  lyrics?: string;
  featuredArtists?: string[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: string;
  tracks: Track[];
  genre: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
}

export interface Single {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  track: Track;
  genre: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: Track[];
  recentlyPlayed: Track[];
  likedSongs: Track[];
  playlists: Playlist[];
  albums: Album[];
  singles: Single[];
  trendingTracks: Track[];
  newReleases: Track[];
  isLoading: boolean;
  error: string | null;
  playTrack: (track: Track, queue?: Track[]) => void;
  pauseTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleLike: (trackId: string) => Promise<void>;
  createPlaylist: (name: string, description: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  searchMusic: (query: string) => Promise<{ tracks: Track[], albums: Album[], playlists: Playlist[], singles: Single[] }>;
  refreshData: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [singles, setSingles] = useState<Single[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎵 Loading initial data...');
      
      // Load trending tracks (most played/recent)
      const { data: trendingData, error: trendingError } = await supabase
        .from('tracks')
        .select(`
          id, title, duration, audio_url, cover_url, release_date,
          genres, explicit,
          artist:artist_id ( id, name )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendingError) {
        console.error('❌ Trending tracks error:', trendingError);
        throw trendingError;
      }

      console.log('🎧 Raw trendingTracks:', trendingData);

      // Load new releases (recent tracks)
      const { data: newTracksData, error: newTracksError } = await supabase
        .from('tracks')
        .select(`
          id, title, duration, audio_url, cover_url, release_date,
          genres, explicit,
          artist:artist_id ( id, name )
        `)
        .eq('is_published', true)
        .order('release_date', { ascending: false })
        .limit(10);

      if (newTracksError) {
        console.error('❌ New releases error:', newTracksError);
        throw newTracksError;
      }

      console.log('🆕 Raw newReleases:', newTracksData);

      // Transform trending tracks
      const formattedTrending = trendingData?.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist?.name || 'Unknown Artist',
        album: 'Single',
        duration: track.duration,
        coverUrl: track.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
        audioUrl: track.audio_url,
        isLiked: false,
        genre: Array.isArray(track.genres) ? track.genres[0] : 'Unknown',
        releaseDate: track.release_date,
        playCount: 0,
      })) || [];

      // Transform new releases
      const formattedNewReleases = newTracksData?.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist?.name || 'Unknown Artist',
        album: 'Single',
        duration: track.duration,
        coverUrl: track.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
        audioUrl: track.audio_url,
        isLiked: false,
        genre: Array.isArray(track.genres) ? track.genres[0] : 'Unknown',
        releaseDate: track.release_date,
        playCount: 0,
      })) || [];

      console.log('🎯 Formatted trending tracks:', formattedTrending);
      console.log('🖼️ Formatted new releases:', formattedNewReleases);
      
      setTrendingTracks(formattedTrending);
      setNewReleases(formattedNewReleases);
      
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      setError('Failed to load music data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    console.log('▶️ playTrack called with URL:', track.audioUrl);
    setCurrentTrack(track);
    setIsPlaying(true);
    setDuration(track.duration);
    if (newQueue) setQueue(newQueue);
    setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 10));
  };

  const pauseTrack = () => setIsPlaying(false);

  const nextTrack = () => {
    if (queue.length > 0 && currentTrack) {
      const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % queue.length;
      playTrack(queue[nextIndex]);
    }
  };

  const previousTrack = () => {
    if (queue.length > 0 && currentTrack) {
      const currentIndex = queue.findIndex(track => track.id === currentTrack.id);
      const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
      playTrack(queue[prevIndex]);
    }
  };

  const toggleLike = async (trackId: string) => { /* unchanged */ };
  const createPlaylist = async (name: string, description: string) => { /* unchanged */ };
  const addToPlaylist = async (playlistId: string, track: Track) => { /* unchanged */ };
  const removeFromPlaylist = async (playlistId: string, trackId: string) => { /* unchanged */ };

  const searchMusic = async (query: string) => {
    try {
      console.log('🔍 Searching for:', query);
      
      const { data: searchResults, error } = await supabase
        .from('tracks')
        .select(`
          id, title, duration, audio_url, cover_url, release_date,
          genres, explicit,
          artist:artist_id ( id, name )
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${query}%,artist.name.ilike.%${query}%`)
        .limit(50);

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }

      console.log('🎯 Search results:', searchResults);

      const formattedTracks = searchResults?.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist?.name || 'Unknown Artist',
        album: 'Single',
        duration: track.duration,
        coverUrl: track.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
        audioUrl: track.audio_url,
        isLiked: false,
        genre: Array.isArray(track.genres) ? track.genres[0] : 'Unknown',
        releaseDate: track.release_date,
        playCount: 0,
      })) || [];

      return {
        tracks: formattedTracks,
        albums: [],
        playlists: [],
        singles: [],
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      return { tracks: [], albums: [], playlists: [], singles: [] };
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
        likedSongs,
        playlists,
        albums,
        singles,
        trendingTracks,
        newReleases,
        isLoading,
        error,
        playTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
        toggleLike,
        createPlaylist,
        addToPlaylist,
        removeFromPlaylist,
        searchMusic,
        refreshData,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within a MusicProvider');
  return context;
};
