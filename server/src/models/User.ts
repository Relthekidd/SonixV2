import { db } from '@/database/connection';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'listener' | 'artist' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  is_public: boolean;
  preferences: Record<string, any>;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  role?: 'listener' | 'artist' | 'admin';
}

export interface UpdateUserData {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  is_public?: boolean;
  preferences?: Record<string, any>;
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const [user] = await db('users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        display_name: userData.display_name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role || 'listener'
      })
      .returning('*');
    
    return user;
  }

  static async findById(id: string): Promise<User | null> {
    const user = await db('users')
      .where({ id, is_active: true })
      .first();
    
    return user || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await db('users')
      .where({ email, is_active: true })
      .first();
    
    return user || null;
  }

  static async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    const [user] = await db('users')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    return user || null;
  }

  static async updateLastLogin(id: string): Promise<void> {
    await db('users')
      .where({ id })
      .update({ last_login_at: new Date() });
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async changePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await db('users')
      .where({ id })
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date()
      });
  }

  static async deactivate(id: string): Promise<void> {
    await db('users')
      .where({ id })
      .update({ 
        is_active: false,
        updated_at: new Date()
      });
  }

  static async getFollowers(userId: string): Promise<User[]> {
    return db('users')
      .join('user_follows', 'users.id', 'user_follows.follower_id')
      .where('user_follows.following_id', userId)
      .select('users.*');
  }

  static async getFollowing(userId: string): Promise<User[]> {
    return db('users')
      .join('user_follows', 'users.id', 'user_follows.following_id')
      .where('user_follows.follower_id', userId)
      .select('users.*');
  }

  static async getLikedTracks(userId: string): Promise<any[]> {
    return db('tracks')
      .join('user_likes', 'tracks.id', 'user_likes.track_id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('user_likes.user_id', userId)
      .select('tracks.*', 'artists.stage_name as artist_name')
      .orderBy('user_likes.liked_at', 'desc');
  }
}