import db from '@/database/connection';

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  is_collaborative: boolean;
  total_tracks: number;
  total_duration: number;
  follower_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlaylistData {
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
}

export interface UpdatePlaylistData {
  name?: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
}

export class PlaylistModel {
  static async create(playlistData: CreatePlaylistData): Promise<Playlist> {
    const [playlist] = await db('playlists')
      .insert(playlistData)
      .returning('*');
    
    return playlist;
  }

  static async findById(id: string): Promise<Playlist | null> {
    const playlist = await db('playlists')
      .where({ id })
      .first();
    
    return playlist || null;
  }

  static async findByUserId(userId: string): Promise<Playlist[]> {
    const playlists = await db('playlists')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    return playlists;
  }

  static async update(id: string, updateData: UpdatePlaylistData): Promise<Playlist | null> {
    const [playlist] = await db('playlists')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    return playlist || null;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('playlists')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async getPublic(limit = 50, offset = 0): Promise<Playlist[]> {
    const playlists = await db('playlists')
      .where({ is_public: true })
      .orderBy('follower_count', 'desc')
      .limit(limit)
      .offset(offset);
    
    return playlists;
  }

  static async search(query: string, limit = 20): Promise<Playlist[]> {
    const playlists = await db('playlists')
      .where({ is_public: true })
      .where(function() {
        this.whereILike('name', `%${query}%`)
            .orWhereILike('description', `%${query}%`);
      })
      .limit(limit);
    
    return playlists;
  }

  static async updateStats(id: string, totalTracks: number, totalDuration: number): Promise<void> {
    await db('playlists')
      .where({ id })
      .update({
        total_tracks: totalTracks,
        total_duration: totalDuration,
        updated_at: new Date()
      });
  }

  static async incrementFollowerCount(id: string): Promise<void> {
    await db('playlists')
      .where({ id })
      .increment('follower_count', 1);
  }

  static async decrementFollowerCount(id: string): Promise<void> {
    await db('playlists')
      .where({ id })
      .decrement('follower_count', 1);
  }
}