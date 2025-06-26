import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
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
      // Load mock data for now - replace with actual Supabase queries
      const mockTracks: Track[] = [
        {
          id: '1',
          title: 'Midnight Dreams',
          artist: 'Luna Eclipse',
          album: 'Nocturnal Vibes',
          duration: 245,
          coverUrl: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
          audioUrl: 'https://example.com/audio1.mp3',
          isLiked: false,
          genre: 'Electronic',
          releaseDate: '2024-01-15',
          playCount: 15420,
          likeCount: 892,
        },
        {
          id: '2',
          title: 'Ocean Waves',
          artist: 'Coastal Sounds',
          album: 'Serenity',
          duration: 198,
          coverUrl: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
          audioUrl: 'https://example.com/audio2.mp3',
          isLiked: true,
          genre: 'Ambient',
          releaseDate: '2024-02-10',
          playCount: 8765,
          likeCount: 543,
        },
      ];

      const mockAlbums: Album[] = [
        {
          id: '1',
          title: 'Nocturnal Vibes',
          artist: 'Luna Eclipse',
          coverUrl: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
          year: '2024',
          tracks: [mockTracks[0]],
          genre: 'Electronic',
          description: 'A journey through the night with electronic beats and ambient sounds.',
          releaseDate: '2024-01-15',
          genres: ['Electronic', 'Ambient'],
        },
      ];

      setTrendingTracks(mockTracks);
      setAlbums(mockAlbums);
      setNewReleases(mockAlbums);
      setLikedSongs(mockTracks.filter(track => track.isLiked));
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

    // Record play with Supabase if user is logged in
    if (user) {
      try {
        await supabase
          .from('song_plays')
          .insert({
            user_id: user.id,
            track_id: track.id,
            play_duration: 0,
            completed: false,
            device_type: 'web',
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
        // Unlike track - remove from liked songs
        setLikedSongs(prev => prev.filter(track => track.id !== trackId));
        
        // Remove from database
        await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', trackId);
      } else {
        // Like track - add to liked songs
        const track = trendingTracks.find(t => t.id === trackId);
        if (track) {
          setLikedSongs(prev => [...prev, { ...track, isLiked: true }]);
          
          // Add to database
          await supabase
            .from('user_likes')
            .insert({
              user_id: user.id,
              track_id: trackId,
            });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setError('Failed to update like status');
    }
  };

  const createPlaylist = async (name: string, description: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          title: name,
          description,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newPlaylist: Playlist = {
        id: data.id,
        name: data.title,
        description: data.description || '',
        coverUrl: 'https://images.pexels.com/photos/1649431/pexels-photo-1649431.jpeg?auto=compress&cs=tinysrgb&w=400',
        tracks: [],
        isPublic: data.is_public,
        createdBy: data.user_id,
        createdAt: data.created_at,
      };
      
      setPlaylists(prev => [...prev, newPlaylist]);
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError('Failed to create playlist');
      throw error;
    }
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    if (!user) return;

    try {
      await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          position: 0, // You might want to calculate the actual position
        });
      
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
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);
      
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
      // Mock search for now - replace with actual Supabase queries
      const filteredTracks = trendingTracks.filter(track =>
        track.title.toLowerCase().includes(query.toLowerCase()) ||
        track.artist.toLowerCase().includes(query.toLowerCase())
      );
      
      const filteredAlbums = albums.filter(album =>
        album.title.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        tracks: filteredTracks,
        albums: filteredAlbums,
        playlists: [],
        singles: [],
      };
    } catch (error) {
      console.error('Error searching music:', error);
      setError('Search failed');
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
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};