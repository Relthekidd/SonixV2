import React, { createContext, useContext, useState } from 'react';

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
  playTrack: (track: Track, queue?: Track[]) => void;
  pauseTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleLike: (trackId: string) => void;
  createPlaylist: (name: string, description: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  searchMusic: (query: string) => Promise<{ tracks: Track[], albums: Album[], playlists: Playlist[] }>;
}

const MusicContext = createContext<MusicContextType | null>(null);

// Mock data
const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Luna Waves',
    album: 'Ethereal Nights',
    duration: 240,
    coverUrl: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: '',
    isLiked: true,
    genre: 'Electronic',
    releaseDate: '2024-01-15',
  },
  {
    id: '2',
    title: 'Golden Hour',
    artist: 'Sunset Collective',
    album: 'Warm Moments',
    duration: 195,
    coverUrl: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: '',
    isLiked: false,
    genre: 'Indie Pop',
    releaseDate: '2024-02-20',
  },
  {
    id: '3',
    title: 'City Lights',
    artist: 'Neon Pulse',
    album: 'Urban Symphony',
    duration: 220,
    coverUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: '',
    isLiked: true,
    genre: 'Synthwave',
    releaseDate: '2024-03-10',
  },
  {
    id: '4',
    title: 'Ocean Breeze',
    artist: 'Coastal Harmony',
    album: 'Tidal Emotions',
    duration: 280,
    coverUrl: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=400',
    audioUrl: '',
    isLiked: false,
    genre: 'Ambient',
    releaseDate: '2024-01-05',
  },
];

const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'Ethereal Nights',
    artist: 'Luna Waves',
    coverUrl: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
    year: '2024',
    tracks: [mockTracks[0]],
    genre: 'Electronic',
  },
  {
    id: '2',
    title: 'Warm Moments',
    artist: 'Sunset Collective',
    coverUrl: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=400',
    year: '2024',
    tracks: [mockTracks[1]],
    genre: 'Indie Pop',
  },
];

const mockPlaylists: Playlist[] = [
  {
    id: '1',
    name: 'My Favorites',
    description: 'Songs I love the most',
    coverUrl: 'https://images.pexels.com/photos/1649431/pexels-photo-1649431.jpeg?auto=compress&cs=tinysrgb&w=400',
    tracks: mockTracks.filter(track => track.isLiked),
    isPublic: false,
    createdBy: '1',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Chill Vibes',
    description: 'Perfect for relaxing',
    coverUrl: 'https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg?auto=compress&cs=tinysrgb&w=400',
    tracks: [mockTracks[0], mockTracks[3]],
    isPublic: true,
    createdBy: '1',
    createdAt: '2024-02-01',
  },
];

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [likedSongs, setLikedSongs] = useState<Track[]>(mockTracks.filter(track => track.isLiked));
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);
  const [albums] = useState<Album[]>(mockAlbums);
  const [trendingTracks] = useState<Track[]>(mockTracks);
  const [newReleases] = useState<Album[]>(mockAlbums);

  const playTrack = (track: Track, newQueue?: Track[]) => {
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

  const toggleLike = (trackId: string) => {
    setLikedSongs(prev => {
      const track = mockTracks.find(t => t.id === trackId);
      if (!track) return prev;
      
      const isLiked = prev.some(t => t.id === trackId);
      if (isLiked) {
        return prev.filter(t => t.id !== trackId);
      } else {
        return [...prev, { ...track, isLiked: true }];
      }
    });
  };

  const createPlaylist = (name: string, description: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      coverUrl: 'https://images.pexels.com/photos/1649431/pexels-photo-1649431.jpeg?auto=compress&cs=tinysrgb&w=400',
      tracks: [],
      isPublic: false,
      createdBy: '1',
      createdAt: new Date().toISOString(),
    };
    
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: [...playlist.tracks, track] }
        : playlist
    ));
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: playlist.tracks.filter(track => track.id !== trackId) }
        : playlist
    ));
  };

  const searchMusic = async (query: string) => {
    // Simulate API search
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const filteredTracks = mockTracks.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      track.album.toLowerCase().includes(query.toLowerCase())
    );
    
    const filteredAlbums = mockAlbums.filter(album =>
      album.title.toLowerCase().includes(query.toLowerCase()) ||
      album.artist.toLowerCase().includes(query.toLowerCase())
    );
    
    const filteredPlaylists = playlists.filter(playlist =>
      playlist.name.toLowerCase().includes(query.toLowerCase()) ||
      playlist.description.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      tracks: filteredTracks,
      albums: filteredAlbums,
      playlists: filteredPlaylists,
    };
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
        playTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
        toggleLike,
        createPlaylist,
        addToPlaylist,
        removeFromPlaylist,
        searchMusic,
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