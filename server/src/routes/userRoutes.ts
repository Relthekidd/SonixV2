import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '@/models/User';
import { authenticate, authorize, AuthRequest } from '@/middleware/authMiddleware';
import { asyncHandler } from '@/middleware/errorMiddleware';
import { uploadAvatar } from '@/middleware/uploadMiddleware';

const router = express.Router();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const user = req.user;
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        role: user.role,
        is_verified: user.is_verified,
        is_public: user.is_public,
        preferences: user.preferences,
        created_at: user.created_at
      }
    }
  });
}));

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', authenticate, uploadAvatar, [
  body('display_name').optional().trim().isLength({ min: 1 }),
  body('first_name').optional().trim().isLength({ min: 1 }),
  body('last_name').optional().trim().isLength({ min: 1 }),
  body('bio').optional().trim(),
  body('is_public').optional().isBoolean()
], asyncHandler(async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const updateData = { ...req.body };
  
  // Add avatar URL if file was uploaded
  if (req.file) {
    updateData.avatar_url = (req.file as any).location;
  }

  const updatedUser = await UserModel.update(req.user.id, updateData);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
}));

/**
 * @swagger
 * /users/{id}/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/follow', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user.id;

  if (targetUserId === currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot follow yourself'
    });
  }

  // Check if target user exists
  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if already following
  const existingFollow = await db('user_follows')
    .where({
      follower_id: currentUserId,
      following_id: targetUserId
    })
    .first();

  if (existingFollow) {
    return res.status(400).json({
      success: false,
      message: 'Already following this user'
    });
  }

  // Create follow relationship
  await db('user_follows').insert({
    follower_id: currentUserId,
    following_id: targetUserId
  });

  res.json({
    success: true,
    message: 'User followed successfully'
  });
}));

/**
 * @swagger
 * /users/{id}/unfollow:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/unfollow', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user.id;

  const deleted = await db('user_follows')
    .where({
      follower_id: currentUserId,
      following_id: targetUserId
    })
    .del();

  if (deleted === 0) {
    return res.status(400).json({
      success: false,
      message: 'Not following this user'
    });
  }

  res.json({
    success: true,
    message: 'User unfollowed successfully'
  });
}));

/**
 * @swagger
 * /users/liked-tracks:
 *   get:
 *     summary: Get user's liked tracks
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/liked-tracks', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const likedTracks = await UserModel.getLikedTracks(req.user.id);
  
  res.json({
    success: true,
    data: { tracks: likedTracks }
  });
}));

export default router;