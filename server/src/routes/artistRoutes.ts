import express from 'express';
import { body, validationResult } from 'express-validator';
import { ArtistModel } from '@/models/Artist';
import { TrackModel } from '@/models/Track';
import { authenticate, authorize, optionalAuth, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { uploadArtistFiles } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * /artists:
 *   get:
 *     summary: Get all artists
 *     tags: [Artists]
 */
router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const artists = await ArtistModel.getAll();
  
  res.json({
    success: true,
    data: { artists }
  });
}));

/**
 * @swagger
 * /artists/profile:
 *   post:
 *     summary: Create artist profile
 *     tags: [Artists]
 *     security:
 *       - bearerAuth: []
 */
router.post('/profile', authenticate, uploadArtistFiles, [
  body('stage_name').trim().isLength({ min: 1 }),
  body('bio').optional().trim(),
  body('genres').optional().isArray()
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Check if user already has an artist profile
  const existingArtist = await ArtistModel.findByUserId(req.user.id);
  if (existingArtist) {
    return res.status(400).json({
      success: false,
      message: 'Artist profile already exists'
    });
  }

  const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
  
  const artistData = {
    user_id: req.user.id,
    stage_name: req.body.stage_name,
    bio: req.body.bio,
    avatar_url: files.avatar ? files.avatar[0].location : undefined,
    banner_url: files.banner ? files.banner[0].location : undefined,
    genres: req.body.genres || [],
    social_links: req.body.social_links ? JSON.parse(req.body.social_links) : {}
  };

  const artist = await ArtistModel.create(artistData);

  res.status(201).json({
    success: true,
    message: 'Artist profile created successfully',
    data: { artist }
  });
}));

/**
 * @swagger
 * /artists/{id}:
 *   get:
 *     summary: Get artist by ID
 *     tags: [Artists]
 */
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const artist = await ArtistModel.findById(req.params.id);
  
  if (!artist) {
    return res.status(404).json({
      success: false,
      message: 'Artist not found'
    });
  }

  // Get artist's tracks
  const tracks = await TrackModel.findByArtist(artist.id);

  res.json({
    success: true,
    data: { 
      artist,
      tracks
    }
  });
}));

/**
 * @swagger
 * /artists/{id}/tracks:
 *   get:
 *     summary: Get tracks by artist
 *     tags: [Artists]
 */
router.get('/:id/tracks', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const tracks = await TrackModel.findByArtist(req.params.id);
  
  res.json({
    success: true,
    data: { tracks }
  });
}));

export default router;