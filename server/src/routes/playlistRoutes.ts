import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, optionalAuth, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { db } from '@/database/connection';

const router = express.Router();

/**
 * @swagger
 * /playlists:
 *   get:
 *     summary: Get public playlists
 *     tags: [Playlists]
 */
router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const playlists = await db('playlists')
    .join('users', 'playlists.user_id', 'users.id')
    .where('playlists.is_public', true)
    .select(
      'playlists.*',
      'users.display_name as creator_name'
    )
    .orderBy('playlists.created_at', 'desc');

  res.json({
    success: true,
    data: { playlists }
  });
}));

/**
 * @swagger
 * /playlists/{id}:
 *   get:
 *     summary: Get playlist by ID with tracks
 *     tags: [Playlists]
 */
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const playlist = await db('playlists')
    .join('users', 'playlists.user_id', 'users.id')
    .where('playlists.id', req.params.id)
    .select(
      'playlists.*',
      'users.display_name as creator_name'
    )
    .first();

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: 'Playlist not found'
    });
  }

  // Check if playlist is public or user owns it
  if (!playlist.is_public && (!req.user || req.user.id !== playlist.user_id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to private playlist'
    });
  }

  // Get playlist tracks
  const tracks = await db('playlist_tracks')
    .join('tracks', 'playlist_tracks.track_id', 'tracks.id')
    .join('artists', 'tracks.artist_id', 'artists.id')
    .where('playlist_tracks.playlist_id', req.params.id)
    .select(
      'tracks.*',
      'artists.stage_name as artist_name',
      'playlist_tracks.position',
      'playlist_tracks.added_at'
    )
    .orderBy('playlist_tracks.position', 'asc');

  res.json({
    success: true,
    data: { 
      playlist,
      tracks
    }
  });
}));

/**
 * @swagger
 * /playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('is_public').optional().isBoolean(),
  body('is_collaborative').optional().isBoolean()
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const playlistData = {
    user_id: req.user.id,
    name: req.body.name,
    description: req.body.description,
    is_public: req.body.is_public !== false, // Default to true
    is_collaborative: req.body.is_collaborative || false
  };

  const [playlist] = await db('playlists')
    .insert(playlistData)
    .returning('*');

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully',
    data: { playlist }
  });
}));

/**
 * @swagger
 * /playlists/{id}/tracks:
 *   post:
 *     summary: Add track to playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/tracks', authenticate, [
  body('track_id').isUUID()
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const playlistId = req.params.id;
  const { track_id } = req.body;

  // Check if playlist exists and user has permission
  const playlist = await db('playlists')
    .where('id', playlistId)
    .first();

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: 'Playlist not found'
    });
  }

  if (playlist.user_id !== req.user.id && !playlist.is_collaborative) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to modify this playlist'
    });
  }

  // Check if track exists
  const track = await db('tracks')
    .where('id', track_id)
    .where('is_published', true)
    .first();

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Check if track is already in playlist
  const existingTrack = await db('playlist_tracks')
    .where({
      playlist_id: playlistId,
      track_id: track_id
    })
    .first();

  if (existingTrack) {
    return res.status(400).json({
      success: false,
      message: 'Track already in playlist'
    });
  }

  // Get next position
  const lastTrack = await db('playlist_tracks')
    .where('playlist_id', playlistId)
    .orderBy('position', 'desc')
    .first();

  const position = lastTrack ? lastTrack.position + 1 : 1;

  // Add track to playlist
  await db('playlist_tracks').insert({
    playlist_id: playlistId,
    track_id: track_id,
    added_by: req.user.id,
    position: position
  });

  // Update playlist stats
  await db('playlists')
    .where('id', playlistId)
    .increment('total_tracks', 1)
    .increment('total_duration', track.duration);

  res.json({
    success: true,
    message: 'Track added to playlist successfully'
  });
}));

export default router;