import db from '@/database/connection';

export class AnalyticsService {
  // Track user engagement metrics
  static async trackUserEngagement(userId: string, action: string, metadata?: any) {
    try {
      await db('user_analytics').insert({
        user_id: userId,
        action,
        metadata: JSON.stringify(metadata || {}),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking user engagement:', error);
    }
  }

  // Get artist analytics
  static async getArtistAnalytics(artistId: string, timeframe = '30 days') {
    try {
      const [plays, likes, followers] = await Promise.all([
        // Total plays
        db('play_history')
          .join('tracks', 'play_history.track_id', 'tracks.id')
          .where('tracks.artist_id', artistId)
          .where('play_history.played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as total_plays')
          .first(),

        // Total likes
        db('user_likes')
          .join('tracks', 'user_likes.track_id', 'tracks.id')
          .where('tracks.artist_id', artistId)
          .where('user_likes.liked_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as total_likes')
          .first(),

        // New followers
        db('user_follows')
          .join('artists', 'user_follows.following_id', 'artists.user_id')
          .where('artists.id', artistId)
          .where('user_follows.followed_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as new_followers')
          .first()
      ]);

      // Top tracks
      const topTracks = await db('tracks')
        .join('play_history', 'tracks.id', 'play_history.track_id')
        .where('tracks.artist_id', artistId)
        .where('play_history.played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .groupBy('tracks.id', 'tracks.title')
        .select('tracks.id', 'tracks.title', db.raw('COUNT(*) as play_count'))
        .orderBy('play_count', 'desc')
        .limit(10);

      // Demographics
      const demographics = await db('play_history')
        .join('tracks', 'play_history.track_id', 'tracks.id')
        .join('users', 'play_history.user_id', 'users.id')
        .where('tracks.artist_id', artistId)
        .where('play_history.played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .select('play_history.device_type')
        .groupBy('play_history.device_type')
        .count('* as count');

      return {
        totalPlays: parseInt(plays?.total_plays) || 0,
        totalLikes: parseInt(likes?.total_likes) || 0,
        newFollowers: parseInt(followers?.new_followers) || 0,
        topTracks,
        demographics,
        timeframe
      };
    } catch (error) {
      console.error('Error getting artist analytics:', error);
      throw error;
    }
  }

  // Get platform analytics (admin only)
  static async getPlatformAnalytics(timeframe = '30 days') {
    try {
      const [users, tracks, plays, uploads] = await Promise.all([
        // New users
        db('users')
          .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as new_users')
          .first(),

        // New tracks
        db('tracks')
          .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as new_tracks')
          .first(),

        // Total plays
        db('play_history')
          .where('played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .count('* as total_plays')
          .first(),

        // File uploads
        db('tracks')
          .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
          .sum('duration as total_duration')
          .first()
      ]);

      // Top genres
      const topGenres = await db('tracks')
        .join('play_history', 'tracks.id', 'play_history.track_id')
        .where('play_history.played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .select(db.raw('jsonb_array_elements_text(genres) as genre'))
        .groupBy('genre')
        .count('* as play_count')
        .orderBy('play_count', 'desc')
        .limit(10);

      // User activity by day
      const dailyActivity = await db('play_history')
        .where('played_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .select(db.raw('DATE(played_at) as date'))
        .groupBy('date')
        .count('* as plays')
        .orderBy('date', 'desc');

      return {
        newUsers: parseInt(users?.new_users) || 0,
        newTracks: parseInt(tracks?.new_tracks) || 0,
        totalPlays: parseInt(plays?.total_plays) || 0,
        totalDuration: parseInt(uploads?.total_duration) || 0,
        topGenres,
        dailyActivity,
        timeframe
      };
    } catch (error) {
      console.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  // Generate trending content
  static async updateTrendingContent() {
    try {
      // Update trending tracks based on recent plays and engagement
      const trendingTracks = await db('tracks')
        .join('play_history', 'tracks.id', 'play_history.track_id')
        .where('play_history.played_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .groupBy('tracks.id')
        .select('tracks.id', db.raw('COUNT(*) as recent_plays'))
        .orderBy('recent_plays', 'desc')
        .limit(50);

      // Update trending artists
      const trendingArtists = await db('artists')
        .join('tracks', 'artists.id', 'tracks.artist_id')
        .join('play_history', 'tracks.id', 'play_history.track_id')
        .where('play_history.played_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .groupBy('artists.id')
        .select('artists.id', db.raw('COUNT(*) as recent_plays'))
        .orderBy('recent_plays', 'desc')
        .limit(20);

      // Store trending data (you might want to create a trending table)
      console.log('Trending content updated:', {
        tracks: trendingTracks.length,
        artists: trendingArtists.length
      });

      return { trendingTracks, trendingArtists };
    } catch (error) {
      console.error('Error updating trending content:', error);
      throw error;
    }
  }
}