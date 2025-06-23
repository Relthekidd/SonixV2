import express from 'express';
import { query, validationResult } from 'express-validator';
import { TrackModel } from '@/models/Track';
import { ArtistModel } from '@/models/Artist';
import { UserModel } from '@/models/User';
import { optionalAuth, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { db } from '@/database/connection';

const router = express.Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search across tracks, artists, and users
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, tracks, artists, users, albums, playlists]
 *           default: all
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 */
router.get('/', [
  query('q').trim().isLength({ min: 1 }),
  query('type').optional().isIn(['all', 'tracks', 'artists', 'users', 'albums', 'playlists']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const query = req.query.q as string;
  const type = (req.query.type as string) || 'all';
  const limit = parseInt(req.query.limit as string) || 20;

  const results: any = {};

  try {
    if (type === 'all' || type === 'tracks') {
      results.tracks = await TrackModel.search(query, limit);
    }

    if (type === 'all' || type === 'artists') {
      results.artists = await ArtistModel.search(query, limit);
    }

    if (type === 'all' || type === 'users') {
      results.users = await db('users')
        .where('is_active', true)
        .where('is_public', true)
        .where(function() {
          this.whereILike('display_name', `%${query}%`)
              .orWhereILike('first_name', `%${query}%`)
              .orWhereILike('last_name', `%${query}%`);
        })
        .select('id', 'display_name', 'first_name', 'last_name', 'avatar_url', 'role')
        .limit(limit);
    }

    if (type === 'all' || type === 'albums') {
      results.albums = await db('albums')
        .join('artists', 'albums.artist_id', 'artists.id')
        .where('albums.is_published', true)
        .where(function() {
          this.whereILike('albums.title', `%${query}%`)
              .orWhereILike('albums.description', `%${query}%`);
        })
        .select(
          'albums.*',
          'artists.stage_name as artist_name'
        )
        .limit(limit);
    }

    if (type === 'all' || type === 'playlists') {
      results.playlists = await db('playlists')
        .join('users', 'playlists.user_id', 'users.id')
        .where('playlists.is_public', true)
        .where(function() {
          this.whereILike('playlists.name', `%${query}%`)
              .orWhereILike('playlists.description', `%${query}%`);
        })
        .select(
          'playlists.*',
          'users.display_name as creator_name'
        )
        .limit(limit);
    }

    res.json({
      success: true,
      data: {
        query,
        results,
        total_results: Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
}));

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/suggestions', [
  query('q').trim().isLength({ min: 1 })
], optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const query = req.query.q as string;
  const limit = 10;

  try {
    // Get track titles
    const trackSuggestions = await db('tracks')
      .where('is_published', true)
      .whereILike('title', `%${query}%`)
      .select('title as suggestion', db.raw("'track' as type"))
      .limit(limit);

    // Get artist names
    const artistSuggestions = await db('artists')
      .whereILike('stage_name', `%${query}%`)
      .select('stage_name as suggestion', db.raw("'artist' as type"))
      .limit(limit);

    // Get album titles
    const albumSuggestions = await db('albums')
      .where('is_published', true)
      .whereILike('title', `%${query}%`)
      .select('title as suggestion', db.raw("'album' as type"))
      .limit(limit);

    const suggestions = [
      ...trackSuggestions,
      ...artistSuggestions,
      ...albumSuggestions
    ].slice(0, limit);

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
}));

/**
 * @swagger
 * /search/trending:
 *   get:
 *     summary: Get trending search terms
 *     tags: [Search]
 */
router.get('/trending', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  try {
    // This would typically come from a search analytics table
    // For now, return popular genres and artists
    const trendingGenres = ['Pop', 'Hip Hop', 'Electronic', 'Rock', 'R&B', 'Jazz', 'Classical', 'Indie'];
    
    const popularArtists = await db('artists')
      .orderBy('monthly_listeners', 'desc')
      .select('stage_name')
      .limit(10);

    const trending = [
      ...trendingGenres.map(genre => ({ term: genre, type: 'genre' })),
      ...popularArtists.map(artist => ({ term: artist.stage_name, type: 'artist' }))
    ];

    res.json({
      success: true,
      data: { trending }
    });
  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending searches'
    });
  }
}));

export default router;