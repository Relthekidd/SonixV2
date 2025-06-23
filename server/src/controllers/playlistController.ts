import { Request, Response } from 'express';
import { PlaylistModel, CreatePlaylistData, UpdatePlaylistData } from '@/models/Playlist';
import { PlaylistTrackModel } from '@/models/PlaylistTrack';
import { TrackModel } from '@/models/Track';
import { AuthRequest } from '@/middleware/authMiddleware';

export class PlaylistController {
  static async getUserPlaylists(req: AuthRequest, res: Response) {
    try {
      const playlists = await PlaylistModel.findByUserId(req.user.id);

      res.status(200).json({
        success: true,
        data: playlists
      });
    } catch (error) {
      console.error('Get user playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get playlists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getPublicPlaylists(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const playlists = await PlaylistModel.getPublic(limit, offset);

      res.status(200).json({
        success: true,
        data: playlists,
        pagination: {
          page,
          limit,
          total: playlists.length
        }
      });
    } catch (error) {
      console.error('Get public playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get public playlists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getPlaylistById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const playlist = await PlaylistModel.findById(id);

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Get playlist tracks
      const tracks = await PlaylistTrackModel.getPlaylistTracks(id);

      res.status(200).json({
        success: true,
        data: {
          ...playlist,
          tracks
        }
      });
    } catch (error) {
      console.error('Get playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async createPlaylist(req: AuthRequest, res: Response) {
    try {
      const { name, description, coverUrl, isPublic, isCollaborative } = req.body;

      const playlistData: CreatePlaylistData = {
        user_id: req.user.id,
        name,
        description,
        cover_url: coverUrl,
        is_public: isPublic,
        is_collaborative: isCollaborative
      };

      const playlist = await PlaylistModel.create(playlistData);

      res.status(201).json({
        success: true,
        message: 'Playlist created successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Create playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updatePlaylist(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdatePlaylistData = req.body;

      // Verify playlist exists and user owns it
      const playlist = await PlaylistModel.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      if (playlist.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this playlist'
        });
      }

      const updatedPlaylist = await PlaylistModel.update(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Playlist updated successfully',
        data: updatedPlaylist
      });
    } catch (error) {
      console.error('Update playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async deletePlaylist(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verify playlist exists and user owns it
      const playlist = await PlaylistModel.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      if (playlist.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this playlist'
        });
      }

      await PlaylistModel.delete(id);

      res.status(200).json({
        success: true,
        message: 'Playlist deleted successfully'
      });
    } catch (error) {
      console.error('Delete playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async addTrackToPlaylist(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { trackId } = req.body;

      // Verify playlist exists and user has access
      const playlist = await PlaylistModel.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      if (playlist.user_id !== req.user.id && !playlist.is_collaborative) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add tracks to this playlist'
        });
      }

      // Verify track exists
      const track = await TrackModel.findById(trackId);
      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      // Add track to playlist
      await PlaylistTrackModel.addTrack({
        playlist_id: id,
        track_id: trackId,
        added_by: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Track added to playlist successfully'
      });
    } catch (error) {
      console.error('Add track to playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add track to playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async removeTrackFromPlaylist(req: AuthRequest, res: Response) {
    try {
      const { id, trackId } = req.params;

      // Verify playlist exists and user has access
      const playlist = await PlaylistModel.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      if (playlist.user_id !== req.user.id && !playlist.is_collaborative) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to remove tracks from this playlist'
        });
      }

      // Remove track from playlist
      await PlaylistTrackModel.removeTrack(id, trackId);

      res.status(200).json({
        success: true,
        message: 'Track removed from playlist successfully'
      });
    } catch (error) {
      console.error('Remove track from playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove track from playlist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}