import express from 'express';
import { authenticate, authorize, AuthRequest } from '@/middleware/authMiddleware';
import { upload } from '@/middleware/uploadMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';

const router = express.Router();

/**
 * @swagger
 * /upload/audio:
 *   post:
 *     summary: Upload audio file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 */
router.post('/audio', authenticate, authorize('artist', 'admin'), upload.single('audio'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided'
    });
  }

  const file = req.file as Express.MulterS3.File;

  res.json({
    success: true,
    message: 'Audio file uploaded successfully',
    data: {
      url: file.location,
      key: file.key,
      size: file.size,
      mimetype: file.mimetype
    }
  });
}));

/**
 * @swagger
 * /upload/image:
 *   post:
 *     summary: Upload image file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 */
router.post('/image', authenticate, upload.single('image'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    });
  }

  const file = req.file as Express.MulterS3.File;

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: file.location,
      key: file.key,
      size: file.size,
      mimetype: file.mimetype
    }
  });
}));

export default router;