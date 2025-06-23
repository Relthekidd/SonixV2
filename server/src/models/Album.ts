import db from '@/database/connection';

export interface Album {
  id: string;
  artist_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  type: 'album' | 'ep' | 'single';
  genres: string[];
  release_date?: Date;
  is_published: boolean;
  total_tracks: number;
  total_duration: number;
  play_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAlbumData {
  artist_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  type?: 'album' | 'ep' | 'single';
  genres?: string[];
  release_date?: Date;
}

export interface UpdateAlbumData {
  title?: string;
  description?: string;
  cover_url?: string;
  type?: 'album' | 'ep' | 'single';
  genres?: string[];
  release_date?: Date;
  is_published?: boolean;
}

export class AlbumModel {
  static async create(albumData: CreateAlbumData): Promise<Album> {
    const [album] = await db('albums')
      .insert({
        ...albumData,
        genres: JSON.stringify(albumData.genres || [])
      })
      .returning('*');
    
    return this.parseAlbum(album);
  }

  static async findById(id: string): Promise<Album | null> {
    const album = await db('albums')
      .where({ id })
      .first();
    
    return album ? this.parseAlbum(album) : null;
  }

  static async findByArtist(artistId: string, published = true): Promise<Album[]> {
    const query = db('albums')
      .where({ artist_id: artistId });
    
    if (published) {
      query.where({ is_published: true });
    }
    
    const albums = await query.orderBy('release_date', 'desc');
    return albums.map(this.parseAlbum);
  }

  static async update(id: string, updateData: UpdateAlbumData): Promise<Album | null> {
    const dataToUpdate = { ...updateData };
    
    if (updateData.genres) {
      dataToUpdate.genres = JSON.stringify(updateData.genres) as any;
    }
    
    const [album] = await db('albums')
      .where({ id })
      .update({
        ...dataToUpdate,
        updated_at: new Date()
      })
      .returning('*');
    
    return album ? this.parseAlbum(album) : null;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('albums')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async getAll(limit = 50, offset = 0): Promise<Album[]> {
    const albums = await db('albums')
      .where({ is_published: true })
      .orderBy('release_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    return albums.map(this.parseAlbum);
  }

  static async search(query: string, limit = 20): Promise<Album[]> {
    const albums = await db('albums')
      .where({ is_published: true })
      .where(function() {
        this.whereILike('title', `%${query}%`)
            .orWhereILike('description', `%${query}%`);
      })
      .limit(limit);
    
    return albums.map(this.parseAlbum);
  }

  static async getByGenre(genre: string, limit = 20): Promise<Album[]> {
    const albums = await db('albums')
      .where({ is_published: true })
      .whereRaw('genres::jsonb ? ?', [genre])
      .limit(limit);
    
    return albums.map(this.parseAlbum);
  }

  static async getNewReleases(limit = 20): Promise<Album[]> {
    const albums = await db('albums')
      .where({ is_published: true })
      .orderBy('release_date', 'desc')
      .limit(limit);
    
    return albums.map(this.parseAlbum);
  }

  static async updateStats(id: string, totalTracks: number, totalDuration: number): Promise<void> {
    await db('albums')
      .where({ id })
      .update({
        total_tracks: totalTracks,
        total_duration: totalDuration,
        updated_at: new Date()
      });
  }

  private static parseAlbum(album: any): Album {
    return {
      ...album,
      genres: typeof album.genres === 'string' ? JSON.parse(album.genres) : album.genres
    };
  }
}