import express from 'express';
import { TrackController } from '@/controllers/trackController';
import { authenticate, authorize } from '@/middleware/authMiddleware';
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
 *         artistId:
 *           type: string
 *         albumId:
 *           type: string
 *         title:
 *           type: string
 *         lyrics:
 *           type: string
 *         audioUrl:
 *           type: string
 *         coverUrl:
 *           type: string
 *         duration:
 *           type: integer
 *         trackNumber:
 *           type: integer
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *         featuredArtists:
 *           type: array
 *           items:
 *             type: string
 *         isExplicit:
 *           type: boolean
 *         isPublished:
 *           type: boolean
 *         playCount:
 *           type: integer
 *         likeCount:
 *           type: integer
 *         price:
 *           type: number
 */

/**
 * @swagger
 * /tracks:
 *   get:
 *     summary: Get all tracks
 *     tags: [Tracks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracks retrieved successfully
 */
router.get('/', TrackController.getAllTracks);

/**
 * @swagger
 * /tracks/trending:
 *   get:
 *     summary: Get trending tracks
 *     tags: [Tracks]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Trending tracks retrieved successfully
 */
router.get('/trending', TrackController.getTrendingTracks);

/**
 * @swagger
 * /tracks/recent:
 *   get:
 *     summary: Get recent releases
 *     tags: [Tracks]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent releases retrieved successfully
 */
router.get('/recent', TrackController.getRecentReleases);

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
 *               - audio
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               lyrics:
 *                 type: string
 *               duration:
 *                 type: integer
 *               trackNumber:
 *                 type: integer
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *               featuredArtists:
 *                 type: array
 *                 items:
 *                   type: string
 *               isExplicit:
 *                 type: boolean
 *               price:
 *                 type: number
 *               albumId:
 *                 type: string
 *               audio:
 *                 type: string
 *                 format: binary
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Track created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Artist profile required
 */
router.post('/', authenticate, uploadTrackFiles, TrackController.createTrack);

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
 *     responses:
 *       200:
 *         description: Track retrieved successfully
 *       404:
 *         description: Track not found
 */
router.get('/:id', TrackController.getTrackById);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               lyrics:
 *                 type: string
 *               trackNumber:
 *                 type: integer
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *               featuredArtists:
 *                 type: array
 *                 items:
 *                   type: string
 *               isExplicit:
 *                 type: boolean
 *               isPublished:
 *                 type: boolean
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Track updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this track
 *       404:
 *         description: Track not found
 */
router.put('/:id', authenticate, TrackController.updateTrack);

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
 *     responses:
 *       200:
 *         description: Track deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this track
 *       404:
 *         description: Track not found
 */
router.delete('/:id', authenticate, TrackController.deleteTrack);

/**
 * @swagger
 * /tracks/{id}/play:
 *   post:
 *     summary: Record track play
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playDuration:
 *                 type: integer
 *               completed:
 *                 type: boolean
 *               deviceType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Play recorded successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Track not found
 */
router.post('/:id/play', authenticate, TrackController.recordPlay);

export default router;