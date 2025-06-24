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
        res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
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

      const secret = process.env.JWT_SECRET as string;
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      if (!secret) throw new Error('JWT_SECRET not set');

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: expiresIn as string }
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
      return;
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
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      await UserModel.updateLastLogin(user.id);

      const secret = process.env.JWT_SECRET as string;
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      if (!secret) throw new Error('JWT_SECRET not set');

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: expiresIn as string }
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
      return;
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

  // Other methods (getMe, changePassword, refreshToken) should follow the same pattern
}