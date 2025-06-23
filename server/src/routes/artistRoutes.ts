import express from 'express';
import { ArtistController } from '@/controllers/artistController';
import { authenticate, authorize } from '@/middleware/authMiddleware';
import { uploadArtistFiles } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Artist:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         stageName:
 *           type: string
 *         bio:
 *           type: string
 *         avatarUrl:
 *           type: string
 *         bannerUrl:
 *           type: string
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *         socialLinks:
 *           type: object
 *         isVerified:
 *           type: boolean
 *         monthlyListeners:
 *           type: integer
 *         totalPlays:
 *           type: integer
 */

/**
 * @swagger
 * /artists:
 *   get:
 *     summary: Get all artists
 *     tags: [Artists]
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
 *     responses:
 *       200:
 *         description: Artists retrieved successfully
 */
router.get('/', ArtistController.getAllArtists);

/**
 * @swagger
 * /artists/top:
 *   get:
 *     summary: Get top artists
 *     tags: [Artists]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Top artists retrieved successfully
 */
router.get('/top', ArtistController.getTopArtists);

/**
 * @swagger
 * /artists/search:
 *   get:
 *     summary: Search artists
 *     tags: [Artists]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Artists search results
 */
router.get('/search', ArtistController.searchArtists);

/**
 * @swagger
 * /artists/profile:
 *   post:
 *     summary: Create artist profile
 *     tags: [Artists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - stageName
 *             properties:
 *               stageName:
 *                 type: string
 *               bio:
 *                 type: string
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *               socialLinks:
 *                 type: object
 *               avatar:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Artist profile created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/profile', authenticate, uploadArtistFiles, ArtistController.createArtistProfile);

/**
 * @swagger
 * /artists/profile:
 *   put:
 *     summary: Update artist profile
 *     tags: [Artists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               stageName:
 *                 type: string
 *               bio:
 *                 type: string
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *               socialLinks:
 *                 type: object
 *               avatar:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Artist profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, uploadArtistFiles, ArtistController.updateArtistProfile);

/**
 * @swagger
 * /artists/{id}:
 *   get:
 *     summary: Get artist by ID
 *     tags: [Artists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artist retrieved successfully
 *       404:
 *         description: Artist not found
 */
router.get('/:id', ArtistController.getArtistById);

/**
 * @swagger
 * /artists/{id}/tracks:
 *   get:
 *     summary: Get artist tracks
 *     tags: [Artists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: published
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Artist tracks retrieved successfully
 */
router.get('/:id/tracks', ArtistController.getArtistTracks);

export default router;