import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, optionalAuth, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { uploadAlbumFiles } from '@/middleware/uploadMiddleware';
import { db } from '@/database/connection';

const router = express.Router();

/**
 * @swagger
 * /albums:
 *   get:
 *     summary: Get all published albums
 *     tags: [Albums]
 */
router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const albums = await db('albums')
    .join('artists', 'albums.artist_id', 'artists.id')
    .where('albums.is_published', true)
    .select(
      'albums.*',
      'artists.stage_name as artist_name'
    )
    .orderBy('albums.release_date', 'desc');

  res.json({
    success: true,
    data: { albums }
  });
}));

/**
 * @swagger
 * /albums/{id}:
 *   get:
 *     summary: Get album by ID with tracks
 *     tags: [Albums]
 */
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const album = await db('albums')
    .join('artists', 'albums.artist_id', 'artists.id')
    .where('albums.id', req.params.id)
    .select(
      'albums.*',
      'artists.stage_name as artist_name'
    )
    .first();

  if (!album) {
    return res.status(404).json({
      success: false,
      message: 'Album not found'
    });
  }

  // Get album tracks
  const tracks = await db('tracks')
    .where('album_id', req.params.id)
    .where('is_published', true)
    .orderBy('track_number', 'asc');

  res.json({
    success: true,
    data: { 
      album: {
        ...album,
        genres: typeof album.genres === 'string' ? JSON.parse(album.genres) : album.genres
      },
      tracks
    }
  });
}));

/**
 * @swagger
 * /albums:
 *   post:
 *     summary: Create a new album
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('artist', 'admin'), uploadAlbumFiles, [
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('type').optional().isIn(['album', 'ep', 'single']),
  body('genres').optional().isString(),
  body('release_date').optional().isISO8601()
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Get artist profile
  const artist = await db('artists')
    .where('user_id', req.user.id)
    .first();

  if (!artist) {
    return res.status(400).json({
      success: false,
      message: 'Artist profile required to create albums'
    });
  }

  const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
  const coverFile = files.cover ? files.cover[0] : null;

  const albumData = {
    artist_id: artist.id,
    title: req.body.title,
    description: req.body.description,
    cover_url: coverFile?.location,
    type: req.body.type || 'album',
    genres: req.body.genres ? JSON.stringify(JSON.parse(req.body.genres)) : JSON.stringify([]),
    release_date: req.body.release_date ? new Date(req.body.release_date) : new Date()
  };

  const [album] = await db('albums')
    .insert(albumData)
    .returning('*');

  res.status(201).json({
    success: true,
    message: 'Album created successfully',
    data: { album }
  });
}));

export default router;