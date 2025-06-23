import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { TrackModel } from '@/models/Track';
import { ArtistModel } from '@/models/Artist';
import { authenticate, authorize, optionalAuth, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { uploadTrackFiles } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Track:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         artist_id:
 *           type: string
 *         album_id:
 *           type: string
 *         duration:
 *           type: integer
 *         audio_url:
 *           type: string
 *         cover_url:
 *           type: string
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *         is_published:
 *           type: boolean
 *         play_count:
 *           type: integer
 */

/**
 * @swagger
 * /tracks:
 *   get:
 *     summary: Get all published tracks
 *     tags: [Tracks]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('genre').optional().isString()
], optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const genre = req.query.genre as string;

  let tracks;
  if (genre) {
    tracks = await TrackModel.getByGenre(genre, limit);
  } else {
    tracks = await TrackModel.getTrending(limit);
  }

  res.json({
    success: true,
    data: {
      tracks,
      pagination: {
        limit,
        offset,
        total: tracks.length
      }
    }
  });
}));

/**
 * @swagger
 * /tracks/trending:
 *   get:
 *     summary: Get trending tracks
 *     tags: [Tracks]
 */
router.get('/trending', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const tracks = await TrackModel.getTrending(50);
  
  res.json({
    success: true,
    data: { tracks }
  });
}));

/**
 * @swagger
 * /tracks/recent:
 *   get:
 *     summary: Get recent releases
 *     tags: [Tracks]
 */
router.get('/recent', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const tracks = await TrackModel.getRecentReleases(20);
  
  res.json({
    success: true,
    data: { tracks }
  });
}));

/**
 * @swagger
 * /tracks/{id}:
 *   get:
 *     summary: Get track by ID
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const track = await TrackModel.findById(req.params.id);
  
  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  res.json({
    success: true,
    data: { track }
  });
}));

/**
 * @swagger
 * /tracks:
 *   post:
 *     summary: Create a new track
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - duration
 *               - audio
 *             properties:
 *               title:
 *                 type: string
 *               lyrics:
 *                 type: string
 *               duration:
 *                 type: integer
 *               track_number:
 *                 type: integer
 *               genres:
 *                 type: string
 *               is_explicit:
 *                 type: boolean
 *               price:
 *                 type: number
 *               audio:
 *                 type: string
 *                 format: binary
 *               cover:
 *                 type: string
 *                 format: binary
 */
router.post('/', authenticate, authorize('artist', 'admin'), uploadTrackFiles, [
  body('title').trim().isLength({ min: 1 }),
  body('duration').isInt({ min: 1 }),
  body('track_number').optional().isInt({ min: 1 }),
  body('genres').optional().isString(),
  body('is_explicit').optional().isBoolean(),
  body('price').optional().isFloat({ min: 0 })
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Check if user has an artist profile
  const artist = await ArtistModel.findByUserId(req.user.id);
  if (!artist) {
    return res.status(400).json({
      success: false,
      message: 'Artist profile required to upload tracks'
    });
  }

  const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
  
  if (!files.audio || files.audio.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Audio file is required'
    });
  }

  const audioFile = files.audio[0];
  const coverFile = files.cover ? files.cover[0] : null;

  const trackData = {
    artist_id: artist.id,
    title: req.body.title,
    lyrics: req.body.lyrics,
    audio_url: audioFile.location,
    cover_url: coverFile?.location,
    duration: parseInt(req.body.duration),
    track_number: req.body.track_number ? parseInt(req.body.track_number) : undefined,
    genres: req.body.genres ? JSON.parse(req.body.genres) : [],
    is_explicit: req.body.is_explicit === 'true',
    price: req.body.price ? parseFloat(req.body.price) : 0
  };

  const track = await TrackModel.create(trackData);

  res.status(201).json({
    success: true,
    message: 'Track created successfully',
    data: { track }
  });
}));

/**
 * @swagger
 * /tracks/{id}:
 *   put:
 *     summary: Update track
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', authenticate, authorize('artist', 'admin'), [
  body('title').optional().trim().isLength({ min: 1 }),
  body('lyrics').optional().isString(),
  body('track_number').optional().isInt({ min: 1 }),
  body('genres').optional().isArray(),
  body('is_explicit').optional().isBoolean(),
  body('is_published').optional().isBoolean(),
  body('price').optional().isFloat({ min: 0 })
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const track = await TrackModel.findById(req.params.id);
  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Check ownership (unless admin)
  if (req.user.role !== 'admin') {
    const artist = await ArtistModel.findByUserId(req.user.id);
    if (!artist || artist.id !== track.artist_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this track'
      });
    }
  }

  const updatedTrack = await TrackModel.update(req.params.id, req.body);

  res.json({
    success: true,
    message: 'Track updated successfully',
    data: { track: updatedTrack }
  });
}));

/**
 * @swagger
 * /tracks/{id}:
 *   delete:
 *     summary: Delete track
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', authenticate, authorize('artist', 'admin'), asyncHandler(async (req: AuthRequest, res) => {
  const track = await TrackModel.findById(req.params.id);
  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Check ownership (unless admin)
  if (req.user.role !== 'admin') {
    const artist = await ArtistModel.findByUserId(req.user.id);
    if (!artist || artist.id !== track.artist_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this track'
      });
    }
  }

  await TrackModel.delete(req.params.id);

  res.json({
    success: true,
    message: 'Track deleted successfully'
  });
}));

/**
 * @swagger
 * /tracks/{id}/play:
 *   post:
 *     summary: Record track play
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:id/play', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const track = await TrackModel.findById(req.params.id);
  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  await TrackModel.incrementPlayCount(req.params.id);

  res.json({
    success: true,
    message: 'Play recorded successfully'
  });
}));

export default router;