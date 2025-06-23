import { Request, Response } from 'express';
import { AuthRequest } from '@/middleware/authMiddleware';
import { ArtistModel } from '@/models/Artist';

export class UploadController {
  static async uploadAudio(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided'
        });
      }

      // Verify user has artist profile
      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist) {
        return res.status(403).json({
          success: false,
          message: 'Artist profile required to upload audio'
        });
      }

      const audioUrl = (req.file as any).location || req.file.path;

      res.status(201).json({
        success: true,
        message: 'Audio file uploaded successfully',
        data: {
          audioUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Upload audio error:', error);
      res.status(500).json({
        success: false,
        message: 'Audio upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const imageUrl = (req.file as any).location || req.file.path;

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Image upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async uploadTrackFiles(req: AuthRequest, res: Response) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.audio || files.audio.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
      }

      // Verify user has artist profile
      const artist = await ArtistModel.findByUserId(req.user.id);
      if (!artist) {
        return res.status(403).json({
          success: false,
          message: 'Artist profile required to upload tracks'
        });
      }

      const audioFile = files.audio[0];
      const coverFile = files.cover ? files.cover[0] : null;

      const audioUrl = (audioFile as any).location || audioFile.path;
      const coverUrl = coverFile ? ((coverFile as any).location || coverFile.path) : null;

      res.status(201).json({
        success: true,
        message: 'Track files uploaded successfully',
        data: {
          audioUrl,
          coverUrl,
          audio: {
            filename: audioFile.filename,
            size: audioFile.size,
            mimetype: audioFile.mimetype
          },
          cover: coverFile ? {
            filename: coverFile.filename,
            size: coverFile.size,
            mimetype: coverFile.mimetype
          } : null
        }
      });
    } catch (error) {
      console.error('Upload track files error:', error);
      res.status(500).json({
        success: false,
        message: 'Track files upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}