import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, CreateUserData } from '@/models/User';
import { ArtistModel } from '@/models/Artist';
import { AuthRequest } from '@/middleware/authMiddleware';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, displayName, firstName, lastName, role } = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const userData: CreateUserData = {
        email,
        password,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        role: role || 'listener'
      };

      const user = await UserModel.create(userData);

      if (role === 'artist') {
        await ArtistModel.create({
          user_id: user.id,
          stage_name: displayName
        });
      }

      const secret = process.env.JWT_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      if (!secret) throw new Error('JWT_SECRET not set');

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );

      const { password_hash, ...userResponse } = user;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      await UserModel.updateLastLogin(user.id);

      const secret = process.env.JWT_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      if (!secret) throw new Error('JWT_SECRET not set');

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );

      const { password_hash, ...userResponse } = user;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { password_hash, ...userResponse } = user;

      res.status(200).json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isValidPassword = await UserModel.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      await UserModel.changePassword(user.id, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  static async refreshToken(req: AuthRequest, res: Response) {
    try {
      const secret = process.env.JWT_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      if (!secret) throw new Error('JWT_SECRET not set');

      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        secret,
        { expiresIn }
      );

      res.status(200).json({
        success: true,
        data: { token }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
}
