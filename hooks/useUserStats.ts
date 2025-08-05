import { useEffect, useState, useCallback } from 'react';
import { fetchUserStats } from '@/services/stats';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    playsCount: 0,
    totalTime: 0,
    topArtist: '—',
    topSong: '—',
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const userStats = await fetchUserStats(user.id);
    setStats(userStats);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('user-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_plays', filter: `user_id=eq.${user.id}` },
        loadStats,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liked_songs', filter: `user_id=eq.${user.id}` },
        loadStats,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'playlists', filter: `user_id=eq.${user.id}` },
        loadStats,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadStats]);

  return { stats, loading };
}
