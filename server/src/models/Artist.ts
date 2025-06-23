import db from '@/database/connection';

export interface Artist {
  id: string;
  user_id: string;
  stage_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  genres: string[];
  social_links: Record<string, string>;
  is_verified: boolean;
  monthly_listeners: number;
  total_plays: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateArtistData {
  user_id: string;
  stage_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  genres?: string[];
  social_links?: Record<string, string>;
}

export interface UpdateArtistData {
  stage_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  genres?: string[];
  social_links?: Record<string, string>;
}

export class ArtistModel {
  static async create(artistData: CreateArtistData): Promise<Artist> {
    const [artist] = await db('artists')
      .insert({
        ...artistData,
        genres: JSON.stringify(artistData.genres || []),
        social_links: JSON.stringify(artistData.social_links || {}),
        is_verified: false // Artists start as unverified
      })
      .returning('*');
    
    return this.parseArtist(artist);
  }

  static async findById(id: string): Promise<Artist | null> {
    const artist = await db('artists')
      .where({ id })
      .first();
    
    return artist ? this.parseArtist(artist) : null;
  }

  static async findByUserId(userId: string): Promise<Artist | null> {
    const artist = await db('artists')
      .where({ user_id: userId })
      .first();
    
    return artist ? this.parseArtist(artist) : null;
  }

  static async findByStage(stageName: string): Promise<Artist | null> {
    const artist = await db('artists')
      .whereILike('stage_name', stageName)
      .first();
    
    return artist ? this.parseArtist(artist) : null;
  }

  static async update(id: string, updateData: UpdateArtistData): Promise<Artist | null> {
    const dataToUpdate = { ...updateData };
    
    if (updateData.genres) {
      dataToUpdate.genres = JSON.stringify(updateData.genres) as any;
    }
    
    if (updateData.social_links) {
      dataToUpdate.social_links = JSON.stringify(updateData.social_links) as any;
    }
    
    const [artist] = await db('artists')
      .where({ id })
      .update({
        ...dataToUpdate,
        updated_at: new Date()
      })
      .returning('*');
    
    return artist ? this.parseArtist(artist) : null;
  }

  static async getAll(limit = 50, offset = 0): Promise<Artist[]> {
    const artists = await db('artists')
      .where({ is_verified: true }) // Only show verified artists in public listings
      .orderBy('monthly_listeners', 'desc')
      .limit(limit)
      .offset(offset);
    
    return artists.map(this.parseArtist);
  }

  static async getUnverifiedArtists(): Promise<any[]> {
    const artists = await db('artists')
      .join('users', 'artists.user_id', 'users.id')
      .where('artists.is_verified', false)
      .select(
        'artists.*',
        'users.email',
        'users.display_name',
        'users.created_at as user_created_at'
      )
      .orderBy('artists.created_at', 'desc');
    
    return artists.map(artist => ({
      ...this.parseArtist(artist),
      email: artist.email,
      display_name: artist.display_name,
      user_created_at: artist.user_created_at
    }));
  }

  static async updateVerificationStatus(artistId: string, isVerified: boolean): Promise<Artist | null> {
    const [artist] = await db('artists')
      .where({ id: artistId })
      .update({
        is_verified: isVerified,
        updated_at: new Date()
      })
      .returning('*');
    
    return artist ? this.parseArtist(artist) : null;
  }

  static async search(query: string, limit = 20): Promise<Artist[]> {
    const artists = await db('artists')
      .where({ is_verified: true }) // Only search verified artists
      .where(function() {
        this.whereILike('stage_name', `%${query}%`)
            .orWhereILike('bio', `%${query}%`);
      })
      .limit(limit);
    
    return artists.map(this.parseArtist);
  }

  static async getTopArtists(limit = 20): Promise<Artist[]> {
    const artists = await db('artists')
      .where({ is_verified: true })
      .orderBy('monthly_listeners', 'desc')
      .limit(limit);
    
    return artists.map(this.parseArtist);
  }

  static async getByGenre(genre: string, limit = 20): Promise<Artist[]> {
    const artists = await db('artists')
      .where({ is_verified: true })
      .whereRaw('genres::jsonb ? ?', [genre])
      .limit(limit);
    
    return artists.map(this.parseArtist);
  }

  static async updateStats(id: string, monthlyListeners: number, totalPlays: number): Promise<void> {
    await db('artists')
      .where({ id })
      .update({
        monthly_listeners: monthlyListeners,
        total_plays: totalPlays,
        updated_at: new Date()
      });
  }

  private static parseArtist(artist: any): Artist {
    return {
      ...artist,
      genres: typeof artist.genres === 'string' ? JSON.parse(artist.genres) : artist.genres,
      social_links: typeof artist.social_links === 'string' 
        ? JSON.parse(artist.social_links) 
        : artist.social_links
    };
  }
}