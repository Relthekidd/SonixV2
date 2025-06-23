import express from 'express';
import { UploadController } from '@/controllers/uploadController';
import { authenticate } from '@/middleware/authMiddleware';
import { uploadAudio, uploadImage, uploadTrackFiles } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * /upload/audio:
 *   post:
 *     summary: Upload an audio file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (MP3, WAV, FLAC)
 *     responses:
 *       201:
 *         description: Audio file uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     audioUrl:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     mimetype:
 *                       type: string
 *       400:
 *         description: No audio file provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Artist profile required
 */
router.post('/audio', authenticate, uploadAudio, UploadController.uploadAudio);

/**
 * @swagger
 * /upload/image:
 *   post:
 *     summary: Upload an image file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG)
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     mimetype:
 *                       type: string
 *       400:
 *         description: No image file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/image', authenticate, uploadImage, UploadController.uploadImage);

/**
 * @swagger
 * /upload/track:
 *   post:
 *     summary: Upload track files (audio + optional cover)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (MP3, WAV, FLAC)
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image (JPEG, PNG)
 *     responses:
 *       201:
 *         description: Track files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     audioUrl:
 *                       type: string
 *                     coverUrl:
 *                       type: string
 *                     audio:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         mimetype:
 *                           type: string
 *                     cover:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         mimetype:
 *                           type: string
 *       400:
 *         description: No audio file provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Artist profile required
 */
router.post('/track', authenticate, uploadTrackFiles, UploadController.uploadTrackFiles);

export default router;