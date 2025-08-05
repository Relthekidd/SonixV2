import { useEffect, useState } from 'react';
import { fetchUserStats } from '@/services/stats'; // we'll define this next
import { useAuth } from '@/providers/AuthProvider';

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    playsCount: 0,
    totalTime: 0,
    topArtist: '—',
    topSong: '—',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      setLoading(true);
      const userStats = await fetchUserStats(user.id);
      setStats(userStats);
      setLoading(false);
    };

    loadStats();
  }, [user?.id]);

  return { stats, loading };
}
