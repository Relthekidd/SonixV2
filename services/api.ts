import { supabase } from './supabase';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://sonix-backend-production.up.railway.app/api/v1';
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: headers,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: await response.text() || 'Unknown error' };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: userProfile,
      token: data.session.access_token,
    };
  }

  async register(signupData: any): Promise<{ user: any; token: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
    });

    if (error) throw error;

    if (!data.user) throw new Error('User creation failed');

    // Insert user profile into users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: signupData.email,
        display_name: signupData.displayName,
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        bio: signupData.bio,
        role: signupData.role || 'listener',
        is_private: signupData.isPrivate || false,
        profile_picture_url: signupData.profilePictureUrl,
      });

    if (insertError) throw insertError;

    // Get the created user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: userProfile,
      token: data.session?.access_token || '',
    };
  }

  async getCurrentUser(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return userProfile;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  // Artist management methods
  async getPendingArtists(): Promise<any[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'artist')
      .is('artist_verified', false);
    
    if (error) throw error;
    return data || [];
  }

  async updateArtistStatus(artistId: string, isVerified: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ artist_verified: isVerified })
      .eq('id', artistId);
    
    if (error) throw error;
  }

  async getMyArtistProfile(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'artist')
      .single();
    
    if (error) throw error;
    return data;
  }

  async getArtistTracks(artistId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('artist_id', artistId);
    
    if (error) throw error;
    return data || [];
  }

  async createTrack(trackData: FormData): Promise<any> {
    return this.request('/tracks', { method: 'POST', body: trackData });
  }

  // Search methods
  async getTrendingSearches(limit: number): Promise<string[]> {
    return ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Indie', 'R&B'].slice(0, limit);
  }

  async getSearchSuggestions(query: string, limit: number): Promise<any[]> {
    const mockSuggestions = [
      { title: 'Bohemian Rhapsody' }, 
      { title: 'Stairway to Heaven' }, 
      { name: 'Queen' }, 
      { name: 'Led Zeppelin' }, 
      { stage_name: 'Adele' }
    ];
    return mockSuggestions
      .filter(s => (s.title || s.name || s.stage_name)?.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  async search(query: string, type: string, limit: number): Promise<any> {
    if (type === 'tracks') {
      const { data, error } = await supabase
        .from('tracks')
        .select('*, artists(stage_name)')
        .ilike('title', `%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { tracks: data || [] };
    } else if (type === 'albums') {
      const { data, error } = await supabase
        .from('albums')
        .select('*, artists(stage_name)')
        .ilike('title', `%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { albums: data || [] };
    } else if (type === 'artists') {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .ilike('stage_name', `%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return { artists: data || [] };
    }
    return {};
  }

  // Content methods
  async getSingles(options: { limit?: number }): Promise<any[]> {
    const { data, error } = await supabase
      .from('singles')
      .select('*, artists(stage_name)')
      .limit(options.limit || 10);
    
    if (error) throw error;
    return data || [];
  }

  async getAlbumById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('albums')
      .select('*, tracks(*), artists(stage_name)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getArtistById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getTrackById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*, artists(stage_name)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { ...data, artist_name: data.artists?.stage_name || 'Unknown Artist' };
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUserProfile(updates: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Follow methods
  async sendFollowRequest(targetUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('follower_requests')
      .insert({
        from_user: user.id,
        to_user: targetUserId,
        status: 'pending'
      });
    
    if (error) throw error;
  }

  async unfollowUser(targetUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);
    
    if (error) throw error;
  }

  async followUser(targetUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user.id,
        following_id: targetUserId
      });
    
    if (error) throw error;
  }

  async getArtists(options: { limit?: number }): Promise<any[]> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .limit(options.limit || 100);
    
    if (error) throw error;
    return data || [];
  }

  // Music data methods
  async getTrendingTracks(limit: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*, artists(stage_name)')
      .order('play_count', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  async getAlbums(options: { limit?: number }): Promise<any[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*, artists(stage_name)')
      .limit(options.limit || 10);
    
    if (error) throw error;
    return data || [];
  }

  async getUserPlaylists(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    return data || [];
  }

  async getPublicPlaylists(options: { limit?: number }): Promise<any[]> {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('is_public', true)
      .limit(options.limit || 10);
    
    if (error) throw error;
    return data || [];
  }

  async getLikedTracks(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    // This would need a likes table or similar
    return [];
  }

  async createPlaylist(playlistData: any): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        ...playlistData,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: trackId
      });
    
    if (error) throw error;
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);
    
    if (error) throw error;
  }

  async likeTrack(trackId: string): Promise<void> {
    // Implementation would depend on your likes table structure
    console.log('Like track:', trackId);
  }

  async unlikeTrack(trackId: string): Promise<void> {
    // Implementation would depend on your likes table structure
    console.log('Unlike track:', trackId);
  }

  async recordPlay(trackId: string, playData: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('song_plays')
      .insert({
        user_id: user.id,
        track_id: trackId,
        ...playData
      });
    
    if (error) console.error('Error recording play:', error);
  }
}

export const apiService = new ApiService();