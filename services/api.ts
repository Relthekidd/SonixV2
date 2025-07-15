import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sonix-backend-production.up.railway.app/api/v1';

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.loadStoredToken();
    
    // Log the API base URL for debugging
    console.log('🌐 API Base URL:', this.baseURL);
  }

  private async loadStoredToken() {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    } catch (error) {
      console.error('Error loading stored token:', error);
    }
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  setOnUnauthorizedCallback(callback: (() => void) | null) {
    this.onUnauthorizedCallback = callback;
  }

  private getErrorMessage(error: any, response?: Response): string {
    // Handle AWS-specific errors
    if (error.message?.includes('AWS Access Key Id') || error.message?.includes('does not exist in our records')) {
      return 'Server configuration error: Invalid AWS credentials. Please contact support.';
    }
    
    if (error.message?.includes('AWS')) {
      return 'Server storage error: AWS service unavailable. Please try again later or contact support.';
    }

    // Handle network errors
    if (error.message?.includes('Network request failed')) {
      return `Cannot connect to server at ${this.baseURL}. Please check your network connection and ensure the backend server is running.`;
    }

    // Handle HTTP errors
    if (response) {
      if (response.status === 404) {
        return `API endpoint not found: ${response.url}. Please check if your backend server is running and the URL is correct.`;
      }
      
      if (response.status >= 500) {
        return 'Server error occurred. Please try again later or contact support.';
      }
    }

    return error.message || 'An unexpected error occurred';
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAutoLogout: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('🔄 API Request:', {
      method: options.method || 'GET',
      url,
      hasToken: !!this.token,
      skipAutoLogout
    });

    const headers: HeadersInit = {
      ...options.headers,
    };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        url
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If we can't parse JSON, use default error message
        }

        // Handle 401 Unauthorized responses, but skip auto-logout for uploads if specified
        if (response.status === 401 && !skipAutoLogout && this.onUnauthorizedCallback) {
          console.log('🔒 Unauthorized response detected, triggering logout');
          this.onUnauthorizedCallback();
          throw new Error('Session expired. Please log in again.');
        }

        // Check for "Invalid token" message, but respect skipAutoLogout flag
        if (errorMessage.toLowerCase().includes('invalid token') && !skipAutoLogout && this.onUnauthorizedCallback) {
          console.log('🔒 Invalid token detected in error message, triggering logout');
          this.onUnauthorizedCallback();
          throw new Error('Session expired. Please log in again.');
        }
        
        console.error('❌ API Error:', errorMessage);
        
        // Create error with improved message
        const error = new Error(this.getErrorMessage({ message: errorMessage }, response));
        throw error;
      }

      const data = await response.json();
      console.log('✅ API Success:', { endpoint, dataKeys: Object.keys(data) });
      return data.data || data;
    } catch (error) {
      console.error('🚨 Network Error:', {
        message: error.message,
        url,
        endpoint
      });
      
      // Use improved error message
      const improvedError = new Error(this.getErrorMessage(error));
      throw improvedError;
    }
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any): Promise<{ user: any; token: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser(): Promise<any> {
    return this.request('/auth/me');
  }

  async resetPassword(email: string): Promise<void> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<any> {
    return this.request(`/users/${userId}/profile`);
  }

  async updateUserProfile(updates: any): Promise<any> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async followUser(userId: string): Promise<void> {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<void> {
    return this.request(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  }

  async sendFollowRequest(userId: string): Promise<void> {
    return this.request(`/users/${userId}/follow-request`, {
      method: 'POST',
    });
  }

  async respondToFollowRequest(requestId: string, accept: boolean): Promise<void> {
    return this.request(`/follow-requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ accept }),
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

  async getArtistTracks(artistId: string): Promise<any[]> {
    return this.request(`/artists/${artistId}/tracks`);
  }

  async getPendingArtists(): Promise<any[]> {
    return this.request('/artists/pending');
  }

  async updateArtistStatus(artistId: string, isVerified: boolean): Promise<any> {
    return this.request(`/artists/${artistId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  }

  // Tracks
  async getTracks(params?: { page?: number; limit?: number; genre?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.genre) searchParams.append('genre', params.genre);
    
    const query = searchParams.toString();
    return this.request(`/tracks${query ? `?${query}` : ''}`);
  }

  async getTrackById(id: string): Promise<any> {
    return this.request(`/tracks/${id}`);
  }

  async getTrendingTracks(limit = 50): Promise<any[]> {
    return this.request(`/tracks/trending?limit=${limit}`);
  }

  async createTrack(trackData: FormData): Promise<any> {
    // Skip auto-logout for track uploads to prevent session termination during file upload
    return this.request('/tracks', {
      method: 'POST',
      body: trackData,
    }, true); // skipAutoLogout = true
  }

  async recordPlay(trackId: string, playData: any): Promise<void> {
    return this.request(`/tracks/${trackId}/play`, {
      method: 'POST',
      body: JSON.stringify(playData),
    });
  }

  // Albums
  async getAlbums(params?: { page?: number; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/albums${query ? `?${query}` : ''}`);
  }

  async getAlbumById(id: string): Promise<any> {
    return this.request(`/albums/${id}`);
  }

  async createAlbum(albumData: FormData): Promise<any> {
    // Skip auto-logout for album uploads
    return this.request('/albums', {
      method: 'POST',
      body: albumData,
    }, true); // skipAutoLogout = true
  }

  // Singles - Use tracks endpoint as fallback since singles endpoint doesn't exist
  async getSingles(params?: { page?: number; limit?: number }): Promise<any[]> {
    console.log('⚠️ Singles endpoint not available, using tracks endpoint as fallback');
    // Filter tracks that are singles (not part of albums)
    const tracks = await this.getTracks(params);
    return tracks.filter((track: any) => !track.album_id);
  }

  async getSingleById(id: string): Promise<any> {
    console.log('⚠️ Singles endpoint not available, using tracks endpoint as fallback');
    return this.getTrackById(id);
  }

  async createSingle(singleData: FormData): Promise<any> {
    console.log('⚠️ Singles endpoint not available, using tracks endpoint as fallback');
    // Mark as single by ensuring no album_id is set
    singleData.append('is_single', 'true');
    return this.createTrack(singleData);
  }

  // Playlists
  async getPublicPlaylists(params?: { page?: number; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/playlists${query ? `?${query}` : ''}`);
  }

  async getUserPlaylists(): Promise<any[]> {
    return this.request('/playlists/my');
  }

  async getPlaylistById(id: string): Promise<any> {
    return this.request(`/playlists/${id}`);
  }

  async createPlaylist(playlistData: any): Promise<any> {
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
  async search(query: string, type: string = 'all', limit = 20): Promise<any> {
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

  async getLikedTracks(): Promise<any[]> {
    return this.request('/tracks/my-liked');
  }

  // File Uploads
  async uploadAudio(audioFile: File): Promise<{ audioUrl: string }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return this.request('/upload/audio', {
      method: 'POST',
      body: formData,
    }, true); // skipAutoLogout = true
  }

  async uploadImage(imageFile: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.request('/upload/image', {
      method: 'POST',
      body: formData,
    }, true); // skipAutoLogout = true
  }

  // Admin
  async getAdminStats(): Promise<any> {
    return this.request('/admin/stats');
  }

  async getAnalytics(params?: any): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.metric) searchParams.append('metric', params.metric);
    
    const query = searchParams.toString();
    return this.request(`/admin/analytics${query ? `?${query}` : ''}`);
  }

  // Get recently uploaded content
  async getRecentUploads(): Promise<{ singles: any[], albums: any[], tracks: any[] }> {
    try {
      const [albums, tracks] = await Promise.all([
        this.getAlbums({ limit: 10 }),
        this.getTracks({ limit: 10 })
      ]);

      // Separate singles from tracks (singles are tracks without album_id)
      const singles = tracks.filter((track: any) => !track.album_id);
      const albumTracks = tracks.filter((track: any) => track.album_id);

      return { singles, albums, tracks: albumTracks };
    } catch (error) {
      console.error('Error fetching recent uploads:', error);
      // Return empty arrays as fallback
      return { singles: [], albums: [], tracks: [] };
    }
  }
}

export const apiService = new ApiService();