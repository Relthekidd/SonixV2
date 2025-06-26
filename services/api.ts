import { User } from '@/providers/AuthProvider';
import { Track, Album, Playlist } from '@/providers/MusicProvider';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sonix-backend-production.up.railway.app/api/v1';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    role: 'listener' | 'artist' = 'listener'
  ): Promise<{ user: User; token: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/auth/me');
  }

  async resetPassword(email: string): Promise<void> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Tracks
  async getTracks(params?: { page?: number; limit?: number; genre?: string }): Promise<Track[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.genre) searchParams.append('genre', params.genre);
    
    const query = searchParams.toString();
    return this.request(`/tracks${query ? `?${query}` : ''}`);
  }

  async getTrackById(id: string): Promise<Track> {
    return this.request(`/tracks/${id}`);
  }

  async getTrendingTracks(limit = 50): Promise<Track[]> {
    return this.request(`/tracks/trending?limit=${limit}`);
  }

  async getRecentReleases(limit = 20): Promise<Track[]> {
    return this.request(`/tracks/recent?limit=${limit}`);
  }

  async createTrack(trackData: FormData): Promise<Track> {
    return this.request('/tracks', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: trackData,
    });
  }

  async recordPlay(trackId: string, playData: {
    playDuration?: number;
    completed?: boolean;
    deviceType?: string;
  }): Promise<void> {
    return this.request(`/tracks/${trackId}/play`, {
      method: 'POST',
      body: JSON.stringify(playData),
    });
  }

  // Artists
  async getArtists(params?: { page?: number; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/artists${query ? `?${query}` : ''}`);
  }

  async getArtistById(id: string): Promise<any> {
    return this.request(`/artists/${id}`);
  }

  async getMyArtistProfile(): Promise<any> {
    return this.request('/artists/me');
  }

  async getTopArtists(limit = 20): Promise<any[]> {
    return this.request(`/artists/top?limit=${limit}`);
  }

  async getArtistTracks(artistId: string): Promise<Track[]> {
    return this.request(`/artists/${artistId}/tracks`);
  }

  async createArtistProfile(profileData: FormData): Promise<any> {
    return this.request('/artists/profile', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: profileData,
    });
  }

  // Admin - Artist Management
  async getPendingArtists(): Promise<any[]> {
    return this.request('/artists/pending');
  }

  async updateArtistStatus(artistId: string, isVerified: boolean): Promise<any> {
    return this.request(`/artists/${artistId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  }

  // Albums
  async getAlbums(params?: { page?: number; limit?: number }): Promise<Album[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/albums${query ? `?${query}` : ''}`);
  }

  async getAlbumById(id: string): Promise<Album> {
    return this.request(`/albums/${id}`);
  }

  // Playlists
  async getPublicPlaylists(params?: { page?: number; limit?: number }): Promise<Playlist[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/playlists${query ? `?${query}` : ''}`);
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    return this.request('/playlists/my');
  }

  async getPlaylistById(id: string): Promise<Playlist> {
    return this.request(`/playlists/${id}`);
  }

  async createPlaylist(playlistData: {
    name: string;
    description?: string;
    isPublic?: boolean;
    isCollaborative?: boolean;
  }): Promise<Playlist> {
    return this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify(playlistData),
    });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    });
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    return this.request(`/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
    });
  }

  // Search
  async search(query: string, type: 'all' | 'tracks' | 'artists' | 'albums' | 'playlists' = 'all', limit = 20): Promise<{
    tracks?: Track[];
    artists?: any[];
    albums?: Album[];
    playlists?: Playlist[];
  }> {
    const searchParams = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString(),
    });
    
    return this.request(`/search?${searchParams.toString()}`);
  }

  async getSearchSuggestions(query: string, limit = 10): Promise<any[]> {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    
    return this.request(`/search/suggestions?${searchParams.toString()}`);
  }

  async getTrendingSearches(limit = 10): Promise<string[]> {
    return this.request(`/search/trending?limit=${limit}`);
  }

  // User Likes
  async likeTrack(trackId: string): Promise<void> {
    return this.request(`/tracks/${trackId}/like`, {
      method: 'POST',
    });
  }

  async unlikeTrack(trackId: string): Promise<void> {
    return this.request(`/tracks/${trackId}/like`, {
      method: 'DELETE',
    });
  }

  async getLikedTracks(): Promise<Track[]> {
    return this.request('/users/liked-tracks');
  }

  // File Uploads
  async uploadAudio(audioFile: File): Promise<{ audioUrl: string }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return this.request('/upload/audio', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async uploadImage(imageFile: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.request('/upload/image', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async uploadTrackFiles(audioFile: File, coverFile?: File): Promise<{
    audioUrl: string;
    coverUrl?: string;
  }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }
    
    return this.request('/upload/track', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }
}

export const apiService = new ApiService();