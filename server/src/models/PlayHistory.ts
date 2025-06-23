import db from '@/database/connection';

export interface PlayHistory {
  id: string;
  user_id: string;
  track_id: string;
  played_at: Date;
  play_duration?: number;
  completed: boolean;
  device_type?: string;
  ip_address?: string;
}

export interface CreatePlayHistoryData {
  user_id: string;
  track_id: string;
  play_duration?: number;
  completed?: boolean;
  device_type?: string;
  ip_address?: string;
}

export class PlayHistoryModel {
  static async create(data: CreatePlayHistoryData): Promise<PlayHistory> {
    const [playHistory] = await db('play_history')
      .insert(data)
      .returning('*');
    
    return playHistory;
  }

  static async getUserHistory(userId: string, limit = 50, offset = 0): Promise<any[]> {
    const history = await db('play_history')
      .join('tracks', 'play_history.track_id', 'tracks.id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('play_history.user_id', userId)
      .select(
        'play_history.*',
        'tracks.title',
        'tracks.cover_url',
        'tracks.duration',
        'artists.stage_name as artist_name'
      )
      .orderBy('play_history.played_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return history;
  }

  static async getRecentlyPlayed(userId: string, limit = 20): Promise<any[]> {
    const recent = await db('play_history')
      .join('tracks', 'play_history.track_id', 'tracks.id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('play_history.user_id', userId)
      .select(
        'tracks.*',
        'artists.stage_name as artist_name',
        'play_history.played_at'
      )
      .orderBy('play_history.played_at', 'desc')
      .limit(limit);
    
    return recent.map(track => ({
      ...track,
      genres: typeof track.genres === 'string' ? JSON.parse(track.genres) : track.genres,
      featured_artists: typeof track.featured_artists === 'string' 
        ? JSON.parse(track.featured_artists) 
        : track.featured_artists
    }));
  }

  static async getTopTracks(userId: string, timeframe = '30 days', limit = 20): Promise<any[]> {
    const topTracks = await db('play_history')
      .join('tracks', 'play_history.track_id', 'tracks.id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('play_history.user_id', userId)
      .where('play_history.played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
      .groupBy('tracks.id', 'artists.stage_name')
      .select(
        'tracks.*',
        'artists.stage_name as artist_name',
        db.raw('COUNT(*) as play_count')
      )
      .orderBy('play_count', 'desc')
      .limit(limit);
    
    return topTracks.map(track => ({
      ...track,
      genres: typeof track.genres === 'string' ? JSON.parse(track.genres) : track.genres,
      featured_artists: typeof track.featured_artists === 'string' 
        ? JSON.parse(track.featured_artists) 
        : track.featured_artists
    }));
  }

  static async getListeningStats(userId: string, timeframe = '30 days'): Promise<any> {
    const stats = await db('play_history')
      .where('user_id', userId)
      .where('played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
      .select(
        db.raw('COUNT(*) as total_plays'),
        db.raw('SUM(play_duration) as total_listening_time'),
        db.raw('COUNT(DISTINCT track_id) as unique_tracks'),
        db.raw('AVG(play_duration) as avg_play_duration')
      )
      .first();
    
    return stats;
  }
}