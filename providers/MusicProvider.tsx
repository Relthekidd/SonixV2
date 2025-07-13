import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
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
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  nextTrack: () => void;
  previousTrack: () => void;
  queue: Track[];
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      unloadAudio();
    };
  }, []);

  const unloadAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    try {
      await unloadAudio();

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
      if (newQueue) setQueue(newQueue);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          nextTrack();
        }
      });

    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const pauseTrack = async () => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const nextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIndex], queue);
  };

  const previousTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    playTrack(queue[prevIndex], queue);
  };

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playTrack,
        pauseTrack,
        nextTrack,
        previousTrack,
        queue
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
