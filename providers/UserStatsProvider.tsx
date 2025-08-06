import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { fetchUserStats } from '@/services/stats';

interface UserStatsContextType {
  listeningTime: number;
  topSong: string;
  topArtist: string;
  playsCount: number;
  refreshStats: () => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextType | null>(null);

export function UserStatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [listeningTime, setListeningTime] = useState(0);
  const [topSong, setTopSong] = useState('—');
  const [topArtist, setTopArtist] = useState('—');
  const [playsCount, setPlaysCount] = useState(0);

  const refreshStats = useCallback(async () => {
    if (!user?.id) return;
    const stats = await fetchUserStats(user.id);
    setListeningTime(stats.totalTime);
    setTopSong(stats.topSong);
    setTopArtist(stats.topArtist);
    setPlaysCount(stats.playsCount);
  }, [user?.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <UserStatsContext.Provider
      value={{ listeningTime, topSong, topArtist, playsCount, refreshStats }}
    >
      {children}
    </UserStatsContext.Provider>
  );
}

export function useUserStats() {
  const ctx = useContext(UserStatsContext);
  if (!ctx) throw new Error('useUserStats must be used within UserStatsProvider');
  return ctx;
}
