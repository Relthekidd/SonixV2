import { db } from '@/database/connection';

export interface Track {
  id: string;
  artist_id: string;
  album_id?: string;
  title: string;
  lyrics?: string;
  audio_url: string;
  cover_url?: string;
  duration: number;
  track_number?: number;
  genres: string[];
  featured_artists: string[];
  is_explicit: boolean;
  is_published: boolean;
  play_count: number;
  like_count: number;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTrackData {
  artist_id: string;
  album_id?: string;
  title: string;
  lyrics?: string;
  audio_url: string;
  cover_url?: string;
  duration: number;
  track_number?: number;
  genres?: string[];
  featured_artists?: string[];
  is_explicit?: boolean;
  price?: number;
}

export interface UpdateTrackData {
  title?: string;
  lyrics?: string;
  cover_url?: string;
  track_number?: number;
  genres?: string[];
  featured_artists?: string[];
  is_explicit?: boolean;
  is_published?: boolean;
  price?: number;
}

export class TrackModel {
  static async create(trackData: CreateTrackData): Promise<Track> {
    const [track] = await db('tracks')
      .insert({
        ...trackData,
        genres: JSON.stringify(trackData.genres || []),
        featured_artists: JSON.stringify(trackData.featured_artists || [])
      })
      .returning('*');
    
    return this.parseTrack(track);
  }

  static async findById(id: string): Promise<Track | null> {
    const track = await db('tracks')
      .where({ id })
      .first();
    
    return track ? this.parseTrack(track) : null;
  }

  static async findByArtist(artistId: string, published = true): Promise<Track[]> {
    const query = db('tracks')
      .where({ artist_id: artistId });
    
    if (published) {
      query.where({ is_published: true });
    }
    
    const tracks = await query.orderBy('created_at', 'desc');
    return tracks.map(this.parseTrack);
  }

  static async findByAlbum(albumId: string): Promise<Track[]> {
    const tracks = await db('tracks')
      .where({ album_id: albumId, is_published: true })
      .orderBy('track_number', 'asc');
    
    return tracks.map(this.parseTrack);
  }

  static async update(id: string, updateData: UpdateTrackData): Promise<Track | null> {
    const dataToUpdate = { ...updateData };
    
    if (updateData.genres) {
      dataToUpdate.genres = JSON.stringify(updateData.genres) as any;
    }
    
    if (updateData.featured_artists) {
      dataToUpdate.featured_artists = JSON.stringify(updateData.featured_artists) as any;
    }
    
    const [track] = await db('tracks')
      .where({ id })
      .update({
        ...dataToUpdate,
        updated_at: new Date()
      })
      .returning('*');
    
    return track ? this.parseTrack(track) : null;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('tracks')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async incrementPlayCount(id: string): Promise<void> {
    await db('tracks')
      .where({ id })
      .increment('play_count', 1);
  }

  static async getTrending(limit = 50): Promise<Track[]> {
    const tracks = await db('tracks')
      .where({ is_published: true })
      .orderBy('play_count', 'desc')
      .limit(limit);
    
    return tracks.map(this.parseTrack);
  }

  static async getRecentReleases(limit = 20): Promise<Track[]> {
    const tracks = await db('tracks')
      .where({ is_published: true })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return tracks.map(this.parseTrack);
  }

  static async search(query: string, limit = 20): Promise<Track[]> {
    const tracks = await db('tracks')
      .where({ is_published: true })
      .where(function() {
        this.whereILike('title', `%${query}%`)
            .orWhereILike('lyrics', `%${query}%`);
      })
      .limit(limit);
    
    return tracks.map(this.parseTrack);
  }

  static async getByGenre(genre: string, limit = 20): Promise<Track[]> {
    const tracks = await db('tracks')
      .where({ is_published: true })
      .whereRaw('genres::jsonb ? ?', [genre])
      .limit(limit);
    
    return tracks.map(this.parseTrack);
  }

  private static parseTrack(track: any): Track {
    return {
      ...track,
      genres: typeof track.genres === 'string' ? JSON.parse(track.genres) : track.genres,
      featured_artists: typeof track.featured_artists === 'string' 
        ? JSON.parse(track.featured_artists) 
        : track.featured_artists
    };
  }
}