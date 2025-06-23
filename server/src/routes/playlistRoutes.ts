import express from 'express';
import { PlaylistController } from '@/controllers/playlistController';
import { authenticate } from '@/middleware/authMiddleware';
import { uploadCover } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         coverUrl:
 *           type: string
 *         isPublic:
 *           type: boolean
 *         isCollaborative:
 *           type: boolean
 *         totalTracks:
 *           type: integer
 *         totalDuration:
 *           type: integer
 *         followerCount:
 *           type: integer
 */

/**
 * @swagger
 * /playlists:
 *   get:
 *     summary: Get public playlists
 *     tags: [Playlists]
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
 *         description: Public playlists retrieved successfully
 */
router.get('/', PlaylistController.getPublicPlaylists);

/**
 * @swagger
 * /playlists/my:
 *   get:
 *     summary: Get user playlists
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User playlists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, PlaylistController.getUserPlaylists);

/**
 * @swagger
 * /playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *               isCollaborative:
 *                 type: boolean
 *                 default: false
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Playlist created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, uploadCover, PlaylistController.createPlaylist);

/**
 * @swagger
 * /playlists/{id}:
 *   get:
 *     summary: Get playlist by ID
 *     tags: [Playlists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Playlist retrieved successfully
 *       404:
 *         description: Playlist not found
 */
router.get('/:id', PlaylistController.getPlaylistById);

/**
 * @swagger
 * /playlists/{id}:
 *   put:
 *     summary: Update playlist
 *     tags: [Playlists]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               isCollaborative:
 *                 type: boolean
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Playlist updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this playlist
 *       404:
 *         description: Playlist not found
 */
router.put('/:id', authenticate, uploadCover, PlaylistController.updatePlaylist);

/**
 * @swagger
 * /playlists/{id}:
 *   delete:
 *     summary: Delete playlist
 *     tags: [Playlists]
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
 *         description: Playlist deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this playlist
 *       404:
 *         description: Playlist not found
 */
router.delete('/:id', authenticate, PlaylistController.deletePlaylist);

/**
 * @swagger
 * /playlists/{id}/tracks:
 *   post:
 *     summary: Add track to playlist
 *     tags: [Playlists]
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
 *             required:
 *               - trackId
 *             properties:
 *               trackId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Track added to playlist successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to add tracks to this playlist
 *       404:
 *         description: Playlist or track not found
 */
router.post('/:id/tracks', authenticate, PlaylistController.addTrackToPlaylist);

/**
 * @swagger
 * /playlists/{id}/tracks/{trackId}:
 *   delete:
 *     summary: Remove track from playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: trackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Track removed from playlist successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to remove tracks from this playlist
 *       404:
 *         description: Playlist not found
 */
router.delete('/:id/tracks/:trackId', authenticate, PlaylistController.removeTrackFromPlaylist);

export default router;