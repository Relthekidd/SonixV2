import { Request, Response } from 'express';
import { TrackModel, CreateTrackData, UpdateTrackData } from '@/models/Track';
import { ArtistModel } from '@/models/Artist';
import { PlayHistoryModel } from '@/models/PlayHistory';
import { AuthRequest } from '@/middleware/authMiddleware';

export class TrackController {
  static async getAllTracks(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const genre = req.query.genre as string;

      let tracks;
      if (genre) {
        tracks = await TrackModel.getByGenre(genre, limit);
      } else {
        tracks = await TrackModel.getTrending(limit);
      }

      res.status(200).json({
        success: true,
        data: tracks,
        pagination: {
          page,
          limit,
          total: tracks.length
        }
      });
    } catch (error) {
      console.error('Get tracks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tracks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getTrackById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const track = await TrackModel.findById(id);

      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      res.status(200).json({
        success: true,
        data: track
      });
    } catch (error) {
      console.error('Get track error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get track',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async createTrack(req: AuthRequest, res: Response) {
    try {
      const {
        title,
        lyrics,
        audioUrl,
        coverUrl,
        duration,
        trackNumber,
        genres,
        featuredArtists,
        isExplicit,
        price,
        albumId
      } = req.body;

      // Verify user has artist profile
      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist) {
        return res.status(403).json({
          success: false,
          message: 'Artist profile required to create tracks'
        });
      }

      const trackData: CreateTrackData = {
        artist_id: artist.id,
        album_id: albumId,
        title,
        lyrics,
        audio_url: audioUrl,
        cover_url: coverUrl,
        duration,
        track_number: trackNumber,
        genres,
        featured_artists: featuredArtists,
        is_explicit: isExplicit,
        price
      };

      const track = await TrackModel.create(trackData);

      res.status(201).json({
        success: true,
        message: 'Track created successfully',
        data: track
      });
    } catch (error) {
      console.error('Create track error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create track',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateTrack(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateTrackData = req.body;

      // Verify track exists and user owns it
      const track = await TrackModel.findById(id);
      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist || track.artist_id !== artist.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this track'
        });
      }

      const updatedTrack = await TrackModel.update(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Track updated successfully',
        data: updatedTrack
      });
    } catch (error) {
      console.error('Update track error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update track',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async deleteTrack(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verify track exists and user owns it
      const track = await TrackModel.findById(id);
      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist || track.artist_id !== artist.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this track'
        });
      }

      await TrackModel.delete(id);

      res.status(200).json({
        success: true,
        message: 'Track deleted successfully'
      });
    } catch (error) {
      console.error('Delete track error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete track',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async recordPlay(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { playDuration, completed, deviceType } = req.body;

      // Verify track exists
      const track = await TrackModel.findById(id);
      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      // Record play in history
      await PlayHistoryModel.create({
        user_id: req.user.id,
        track_id: id,
        play_duration: playDuration,
        completed,
        device_type: deviceType,
        ip_address: req.ip
      });

      // Increment play count
      await TrackModel.incrementPlayCount(id);

      res.status(200).json({
        success: true,
        message: 'Play recorded successfully'
      });
    } catch (error) {
      console.error('Record play error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record play',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getTrendingTracks(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const tracks = await TrackModel.getTrending(limit);

      res.status(200).json({
        success: true,
        data: tracks
      });
    } catch (error) {
      console.error('Get trending tracks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending tracks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getRecentReleases(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tracks = await TrackModel.getRecentReleases(limit);

      res.status(200).json({
        success: true,
        data: tracks
      });
    } catch (error) {
      console.error('Get recent releases error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent releases',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}