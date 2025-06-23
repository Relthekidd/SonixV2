import { Request, Response } from 'express';
import { TrackModel } from '@/models/Track';
import { ArtistModel } from '@/models/Artist';
import { AlbumModel } from '@/models/Album';
import { PlaylistModel } from '@/models/Playlist';

export class SearchController {
  static async search(req: Request, res: Response) {
    try {
      const { q, type = 'all' } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const query = q as string;
      let results: any = {};

      if (type === 'all' || type === 'tracks') {
        results.tracks = await TrackModel.search(query, limit);
      }

      if (type === 'all' || type === 'artists') {
        results.artists = await ArtistModel.search(query, limit);
      }

      if (type === 'all' || type === 'albums') {
        results.albums = await AlbumModel.search(query, limit);
      }

      if (type === 'all' || type === 'playlists') {
        results.playlists = await PlaylistModel.search(query, limit);
      }

      res.status(200).json({
        success: true,
        data: results,
        query,
        type
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getSuggestions(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const query = q as string;

      // Get suggestions from different sources
      const [tracks, artists, albums] = await Promise.all([
        TrackModel.search(query, Math.ceil(limit / 3)),
        ArtistModel.search(query, Math.ceil(limit / 3)),
        AlbumModel.search(query, Math.ceil(limit / 3))
      ]);

      const suggestions = [
        ...tracks.map(track => ({ type: 'track', ...track })),
        ...artists.map(artist => ({ type: 'artist', ...artist })),
        ...albums.map(album => ({ type: 'album', ...album }))
      ].slice(0, limit);

      res.status(200).json({
        success: true,
        data: suggestions,
        query
      });
    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getTrendingSearches(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      // This would typically come from a search analytics table
      // For now, return popular content
      const [trendingTracks, topArtists] = await Promise.all([
        TrackModel.getTrending(Math.ceil(limit / 2)),
        ArtistModel.getTopArtists(Math.ceil(limit / 2))
      ]);

      const trending = [
        ...trendingTracks.map(track => track.title),
        ...topArtists.map(artist => artist.stage_name)
      ].slice(0, limit);

      res.status(200).json({
        success: true,
        data: trending
      });
    } catch (error) {
      console.error('Get trending searches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending searches',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}