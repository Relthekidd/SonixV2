import { supabase } from '@/services/supabase';

export async function fetchUserStats(userId: string) {
  const { count: playsCount } = await supabase
    .from('song_plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: [{ total_time }] = [{}] } = await supabase.rpc(
    'sum_listening_time',
    { _user_id: userId }
  );

  const { data: topArtistData } = await supabase.rpc('user_top_artist', {
    _user_id: userId,
  });

  const { data: topSongData } = await supabase.rpc('user_top_song', {
    _user_id: userId,
  });

  return {
    playsCount: playsCount || 0,
    totalTime: total_time || 0,
    topArtist: topArtistData?.[0]?.artist_name || '—',
    topSong: topSongData?.[0]?.song_title || '—',
  };
}
