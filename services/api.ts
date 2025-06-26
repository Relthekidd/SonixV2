import { User } from '@/providers/AuthProvider';
import { Track, Album, Playlist } from '@/providers/MusicProvider';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sonix-backend-production.up.railway.app/api/v1';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('🔧 ApiService initialized with baseURL:', this.baseURL);
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
      timeout: 10000, // 10 second timeout
    };

    // Enhanced logging for debugging
    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      timestamp: new Date().toISOString()
    });

    try {
      // Test network connectivity first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData: any = {};
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
            
            // Log detailed error information
            console.error('❌ API Error Details:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              url,
              endpoint,
              timestamp: new Date().toISOString()
            });
          } else {
            const textError = await response.text();
            errorMessage = textError || errorMessage;
            console.error('❌ API Error (Non-JSON):', {
              status: response.status,
              statusText: response.statusText,
              textError,
              url,
              endpoint,
              timestamp: new Date().toISOString()
            });
          }
        } catch (parseError) {
          console.error('❌ Error parsing error response:', parseError);
        }

        // Create a more descriptive error
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).data = errorData;
        (error as any).url = url;
        (error as any).endpoint = endpoint;
        throw error;
      }

      const data = await response.json();
      console.log('✅ API Success:', {
        data,
        url,
        endpoint,
        timestamp: new Date().toISOString()
      });
      return data.data || data;
    } catch (error) {
      // Enhanced error logging with network diagnostics
      if (error.name === 'AbortError') {
        console.error('🚨 Request Timeout:', {
          message: 'Request timed out after 10 seconds',
          url,
          endpoint,
          baseURL: this.baseURL,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Request timeout: Unable to connect to ${this.baseURL}. Please check if the server is running and accessible.`);
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        console.error('🚨 Network Connection Error:', {
          message: 'Network request failed - server may be unreachable',
          url,
          endpoint,
          baseURL: this.baseURL,
          possibleCauses: [
            'Backend server is not running',
            'Incorrect API URL in environment variables',
            'Network connectivity issues',
            'Firewall blocking the connection',
            'CORS configuration issues'
          ],
          timestamp: new Date().toISOString()
        });
        throw new Error(`Network Error: Cannot connect to ${this.baseURL}. Please verify the server is running and the API URL is correct.`);
      }

      console.error('🚨 API Request Error:', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
        url,
        endpoint,
        baseURL: this.baseURL,
        timestamp: new Date().toISOString()
      });
      
      // Re-throw with additional context
      if (error instanceof Error) {
        throw new Error(`API Error (${endpoint}): ${error.message}`);
      }
      throw error;
    }
  }

  // Health check method to test connectivity
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      console.log('🏥 Performing health check...');
      return await this.request('/health');
    } catch (error) {
      console.error('🏥 Health check failed:', error);
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
    // Enhanced logging for registration requests
    console.log('🔐 Registration attempt:', {
      email,
      displayName,
      role,
      passwordLength: password.length,
      apiUrl: this.baseURL,
      timestamp: new Date().toISOString()
    });

    // Validate input before making request
    if (!email || !password || !displayName) {
      throw new Error('Missing required fields: email, password, and displayName are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    try {
      // First, try a health check to ensure the server is reachable
      console.log('🏥 Testing server connectivity before registration...');
      await this.healthCheck();
      console.log('✅ Server is reachable, proceeding with registration');
    } catch (healthError) {
      console.error('❌ Server health check failed:', healthError);
      throw new Error(`Cannot connect to server at ${this.baseURL}. Please check if the backend server is running and accessible.`);
    }

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