import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
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
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: string;
  tracks: Track[];
  genre: string;
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
  trendingTracks: Track[];
  newReleases: Album[];
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
  searchMusic: (query: string) => Promise<{ tracks: Track[], albums: Album[], playlists: Playlist[] }>;
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
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Album[]>([]);
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
      const [
        trendingData,
        albumsData,
        playlistsData,
        likedData,
      ] = await Promise.all([
        apiService.getTrendingTracks(20),
        apiService.getAlbums({ limit: 10 }),
        user ? apiService.getUserPlaylists() : apiService.getPublicPlaylists({ limit: 10 }),
        user ? apiService.getLikedTracks() : Promise.resolve([]),
      ]);

      setTrendingTracks(trendingData.map(transformTrack));
      setNewReleases(albumsData.map(transformAlbum));
      setPlaylists(playlistsData.map(transformPlaylist));
      setLikedSongs(likedData.map(transformTrack));
      setAlbums(albumsData.map(transformAlbum));
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load music data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  // Transform API data to match frontend interface
  const transformTrack = (apiTrack: any): Track => ({
    id: apiTrack.id,
    title: apiTrack.title,
    artist: apiTrack.artist_name || apiTrack.artist || 'Unknown Artist',
    album: apiTrack.album || 'Unknown Album',
    duration: apiTrack.duration,
    coverUrl: apiTrack.cover_url || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: apiTrack.audio_url,
    isLiked: apiTrack.is_liked || false,
    genre: Array.isArray(apiTrack.genres) ? apiTrack.genres[0] : apiTrack.genre || 'Unknown',
    releaseDate: apiTrack.created_at || apiTrack.release_date || new Date().toISOString(),
    playCount: apiTrack.play_count,
    likeCount: apiTrack.like_count,
  });

  const transformAlbum = (apiAlbum: any): Album => ({
    id: apiAlbum.id,
    title: apiAlbum.title,
    artist: apiAlbum.artist_name || apiAlbum.artist || 'Unknown Artist',
    coverUrl: apiAlbum.cover_url || 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
    year: apiAlbum.release_date ? new Date(apiAlbum.release_date).getFullYear().toString() : '2024',
    tracks: apiAlbum.tracks ? apiAlbum.tracks.map(transformTrack) : [],
    genre: Array.isArray(apiAlbum.genres) ? apiAlbum.genres[0] : apiAlbum.genre || 'Unknown',
  });

  const transformPlaylist = (apiPlaylist: any): Playlist => ({
    id: apiPlaylist.id,
    name: apiPlaylist.name,
    description: apiPlaylist.description || '',
    coverUrl: apiPlaylist.cover_url || 'https://images.pexels.com/photos/1649431/pexels-photo-1649431.jpeg?auto=compress&cs=tinysrgb&w=400',
    tracks: apiPlaylist.tracks ? apiPlaylist.tracks.map(transformTrack) : [],
    isPublic: apiPlaylist.is_public,
    createdBy: apiPlaylist.user_id,
    createdAt: apiPlaylist.created_at,
  });

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setDuration(track.duration);
    
    if (newQueue) {
      setQueue(newQueue);
    }
    
    // Add to recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 10);
    });

    // Record play with backend
    if (user) {
      try {
        await apiService.recordPlay(track.id, {
          deviceType: 'web',
          completed: false,
        });
      } catch (error) {
        console.error('Error recording play:', error);
      }
    }
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

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

  const toggleLike = async (trackId: string) => {
    if (!user) return;

    try {
      const isCurrentlyLiked = likedSongs.some(track => track.id === trackId);
      
      if (isCurrentlyLiked) {
        await apiService.unlikeTrack(trackId);
        setLikedSongs(prev => prev.filter(track => track.id !== trackId));
      } else {
        await apiService.likeTrack(trackId);
        // Fetch the track details to add to liked songs
        const track = await apiService.getTrackById(trackId);
        setLikedSongs(prev => [...prev, transformTrack(track)]);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setError('Failed to update like status');
    }
  };

  const createPlaylist = async (name: string, description: string) => {
    if (!user) return;

    try {
      const newPlaylist = await apiService.createPlaylist({
        name,
        description,
        isPublic: false,
        isCollaborative: false,
      });
      
      setPlaylists(prev => [...prev, transformPlaylist(newPlaylist)]);
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError('Failed to create playlist');
      throw error;
    }
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    if (!user) return;

    try {
      await apiService.addTrackToPlaylist(playlistId, track.id);
      
      setPlaylists(prev => prev.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, tracks: [...playlist.tracks, track] }
          : playlist
      ));
    } catch (error) {
      console.error('Error adding to playlist:', error);
      setError('Failed to add track to playlist');
      throw error;
    }
  };

  const removeFromPlaylist = async (playlistId: string, trackId: string) => {
    if (!user) return;

    try {
      await apiService.removeTrackFromPlaylist(playlistId, trackId);
      
      setPlaylists(prev => prev.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, tracks: playlist.tracks.filter(track => track.id !== trackId) }
          : playlist
      ));
    } catch (error) {
      console.error('Error removing from playlist:', error);
      setError('Failed to remove track from playlist');
      throw error;
    }
  };

  const searchMusic = async (query: string) => {
    try {
      const results = await apiService.search(query, 'all', 20);
      
      return {
        tracks: (results.tracks || []).map(transformTrack),
        albums: (results.albums || []).map(transformAlbum),
        playlists: (results.playlists || []).map(transformPlaylist),
      };
    } catch (error) {
      console.error('Error searching music:', error);
      setError('Search failed');
      return { tracks: [], albums: [], playlists: [] };
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
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};