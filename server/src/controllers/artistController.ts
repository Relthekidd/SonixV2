import { Request, Response } from 'express';
import { ArtistModel, CreateArtistData, UpdateArtistData } from '@/models/Artist';
import { TrackModel } from '@/models/Track';
import { AuthRequest } from '@/middleware/authMiddleware';

export class ArtistController {
  static async getAllArtists(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const artists = await ArtistModel.getAll(limit, offset);

      res.status(200).json({
        success: true,
        data: artists,
        pagination: {
          page,
          limit,
          total: artists.length
        }
      });
    } catch (error) {
      console.error('Get artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getArtistById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const artist = await ArtistModel.findById(id);

      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.status(200).json({
        success: true,
        data: artist
      });
    } catch (error) {
      console.error('Get artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getMeArtistProfile(req: AuthRequest, res: Response) {
    try {
      const artist = await ArtistModel.findByUserId(req.user.id);

      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: artist
      });
    } catch (error) {
      console.error('Get my artist profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artist profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async createArtistProfile(req: AuthRequest, res: Response) {
    try {
      const { stageName, bio, genres, socialLinks } = req.body;

      // Check if user already has an artist profile
      const existingArtist = await ArtistModel.findByUserId(req.user.id);
      if (existingArtist) {
        return res.status(400).json({
          success: false,
          message: 'Artist profile already exists'
        });
      }

      const artistData: CreateArtistData = {
        user_id: req.user.id,
        stage_name: stageName,
        bio,
        genres,
        social_links: socialLinks
      };

      const artist = await ArtistModel.create(artistData);

      res.status(201).json({
        success: true,
        message: 'Artist application submitted successfully. Please wait for admin approval.',
        data: artist
      });
    } catch (error) {
      console.error('Create artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create artist profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateArtistProfile(req: AuthRequest, res: Response) {
    try {
      const { stageName, bio, genres, socialLinks } = req.body;

      // Find artist profile
      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist profile not found'
        });
      }

      const updateData: UpdateArtistData = {
        stage_name: stageName,
        bio,
        genres,
        social_links: socialLinks
      };

      const updatedArtist = await ArtistModel.update(artist.id, updateData);

      res.status(200).json({
        success: true,
        message: 'Artist profile updated successfully',
        data: updatedArtist
      });
    } catch (error) {
      console.error('Update artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update artist profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getArtistTracks(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const published = req.query.published !== 'false';

      const tracks = await TrackModel.findByArtist(id, published);

      res.status(200).json({
        success: true,
        data: tracks
      });
    } catch (error) {
      console.error('Get artist tracks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artist tracks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getTopArtists(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const artists = await ArtistModel.getTopArtists(limit);

      res.status(200).json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Get top artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get top artists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async searchArtists(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const artists = await ArtistModel.search(q as string, limit);

      res.status(200).json({
        success: true,
        data: artists,
        query: q
      });
    } catch (error) {
      console.error('Search artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search artists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getPendingArtists(req: AuthRequest, res: Response) {
    try {
      const pendingArtists = await ArtistModel.getUnverifiedArtists();

      res.status(200).json({
        success: true,
        data: pendingArtists
      });
    } catch (error) {
      console.error('Get pending artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending artists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateArtistStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;

      if (typeof isVerified !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isVerified must be a boolean value'
        });
      }

      const artist = await ArtistModel.findById(id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      const updatedArtist = await ArtistModel.updateVerificationStatus(id, isVerified);

      res.status(200).json({
        success: true,
        message: `Artist ${isVerified ? 'approved' : 'rejected'} successfully`,
        data: updatedArtist
      });
    } catch (error) {
      console.error('Update artist status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update artist status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}