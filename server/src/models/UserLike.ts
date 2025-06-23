import db from '@/database/connection';

export interface UserLike {
  id: string;
  user_id: string;
  track_id: string;
  liked_at: Date;
}

export class UserLikeModel {
  static async likeTrack(userId: string, trackId: string): Promise<UserLike> {
    const [like] = await db('user_likes')
      .insert({
        user_id: userId,
        track_id: trackId
      })
      .returning('*');
    
    // Increment track like count
    await db('tracks')
      .where({ id: trackId })
      .increment('like_count', 1);
    
    return like;
  }

  static async unlikeTrack(userId: string, trackId: string): Promise<boolean> {
    const deleted = await db('user_likes')
      .where({ user_id: userId, track_id: trackId })
      .del();
    
    if (deleted > 0) {
      // Decrement track like count
      await db('tracks')
        .where({ id: trackId })
        .decrement('like_count', 1);
    }
    
    return deleted > 0;
  }

  static async isTrackLiked(userId: string, trackId: string): Promise<boolean> {
    const like = await db('user_likes')
      .where({ user_id: userId, track_id: trackId })
      .first();
    
    return !!like;
  }

  static async getUserLikedTracks(userId: string, limit = 50, offset = 0): Promise<any[]> {
    const likedTracks = await db('user_likes')
      .join('tracks', 'user_likes.track_id', 'tracks.id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('user_likes.user_id', userId)
      .select(
        'tracks.*',
        'artists.stage_name as artist_name',
        'user_likes.liked_at'
      )
      .orderBy('user_likes.liked_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return likedTracks.map(track => ({
      ...track,
      genres: typeof track.genres === 'string' ? JSON.parse(track.genres) : track.genres,
      featured_artists: typeof track.featured_artists === 'string' 
        ? JSON.parse(track.featured_artists) 
        : track.featured_artists
    }));
  }

  static async getTrackLikeCount(trackId: string): Promise<number> {
    const result = await db('user_likes')
      .where({ track_id: trackId })
      .count('* as count')
      .first();
    
    return parseInt(result?.count as string) || 0;
  }
}