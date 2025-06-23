import db from '@/database/connection';

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  added_by: string;
  position: number;
  added_at: Date;
}

export interface CreatePlaylistTrackData {
  playlist_id: string;
  track_id: string;
  added_by: string;
}

export class PlaylistTrackModel {
  static async addTrack(data: CreatePlaylistTrackData): Promise<PlaylistTrack> {
    // Get the next position
    const result = await db('playlist_tracks')
      .where({ playlist_id: data.playlist_id })
      .max('position as max_position')
      .first();
    
    const position = (result?.max_position || 0) + 1;

    const [playlistTrack] = await db('playlist_tracks')
      .insert({
        ...data,
        position
      })
      .returning('*');
    
    return playlistTrack;
  }

  static async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    const deleted = await db('playlist_tracks')
      .where({ playlist_id: playlistId, track_id: trackId })
      .del();
    
    return deleted > 0;
  }

  static async getPlaylistTracks(playlistId: string): Promise<any[]> {
    const tracks = await db('playlist_tracks')
      .join('tracks', 'playlist_tracks.track_id', 'tracks.id')
      .join('artists', 'tracks.artist_id', 'artists.id')
      .where('playlist_tracks.playlist_id', playlistId)
      .select(
        'tracks.*',
        'artists.stage_name as artist_name',
        'playlist_tracks.position',
        'playlist_tracks.added_at'
      )
      .orderBy('playlist_tracks.position', 'asc');
    
    return tracks.map(track => ({
      ...track,
      genres: typeof track.genres === 'string' ? JSON.parse(track.genres) : track.genres,
      featured_artists: typeof track.featured_artists === 'string' 
        ? JSON.parse(track.featured_artists) 
        : track.featured_artists
    }));
  }

  static async reorderTracks(playlistId: string, trackOrders: { trackId: string; position: number }[]): Promise<void> {
    const trx = await db.transaction();
    
    try {
      for (const { trackId, position } of trackOrders) {
        await trx('playlist_tracks')
          .where({ playlist_id: playlistId, track_id: trackId })
          .update({ position });
      }
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const result = await db('playlist_tracks')
      .where({ playlist_id: playlistId, track_id: trackId })
      .first();
    
    return !!result;
  }
}