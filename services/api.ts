import { User } from '@/providers/AuthProvider';
import { Track, Album, Playlist } from '@/providers/MusicProvider';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sonix-backend-production.up.railway.app/api/v1';
const ROOT_API_URL_DERIVED = API_BASE_URL.replace('/api/v1', '');

class ApiService {
  private baseURL: string;
  private rootURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.rootURL = ROOT_API_URL_DERIVED;
    console.log('🔧 ApiService initialized with baseURL:', this.baseURL);
    console.log('🔧 ApiService initialized with rootURL:', this.rootURL);
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    baseOverride?: string
  ): Promise<T> {
    const baseUrl = baseOverride || this.baseURL;
    const url = `${baseUrl}${endpoint}`;
    
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
      timeout: 15000, // Increased timeout to 15 seconds
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
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
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
            
            // Extract meaningful error message from various possible response formats
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.details) {
              errorMessage = errorData.details;
            } else if (errorData.errors && Array.isArray(errorData.errors)) {
              errorMessage = errorData.errors.join(', ');
            }
            
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

        // Provide more specific error messages based on status codes
        let userFriendlyMessage = errorMessage;
        
        switch (response.status) {
          case 400:
            userFriendlyMessage = errorMessage || 'Invalid request. Please check your input and try again.';
            break;
          case 401:
            userFriendlyMessage = 'Authentication failed. Please check your credentials.';
            break;
          case 403:
            userFriendlyMessage = 'Access denied. You do not have permission to perform this action.';
            break;
          case 404:
            userFriendlyMessage = 'The requested resource was not found.';
            break;
          case 409:
            userFriendlyMessage = errorMessage || 'Conflict: This resource already exists.';
            break;
          case 422:
            userFriendlyMessage = errorMessage || 'Validation failed. Please check your input.';
            break;
          case 429:
            userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 500:
            userFriendlyMessage = 'Server error occurred. Please try again later or contact support if the problem persists.';
            break;
          case 502:
            userFriendlyMessage = 'Service temporarily unavailable. Please try again in a few moments.';
            break;
          case 503:
            userFriendlyMessage = 'Service is currently under maintenance. Please try again later.';
            break;
          default:
            userFriendlyMessage = errorMessage || `An error occurred (${response.status}). Please try again.`;
        }

        // Create a more descriptive error with additional context
        const error = new Error(userFriendlyMessage);
        (error as any).status = response.status;
        (error as any).data = errorData;
        (error as any).url = url;
        (error as any).endpoint = endpoint;
        (error as any).originalMessage = errorMessage;
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
          message: 'Request timed out after 15 seconds',
          url,
          endpoint,
          baseURL: baseUrl,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Request timeout: Unable to connect to ${baseUrl}. The server may be slow or unreachable.`);
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        console.error('🚨 Network Connection Error:', {
          message: 'Network request failed - server may be unreachable',
          url,
          endpoint,
          baseURL: baseUrl,
          possibleCauses: [
            'Backend server is not running',
            'Incorrect API URL in environment variables',
            'Network connectivity issues',
            'Firewall blocking the connection',
            'CORS configuration issues'
          ],
          timestamp: new Date().toISOString()
        });
        throw new Error(`Network Error: Cannot connect to ${baseUrl}. Please check your internet connection and try again.`);
      }

      console.error('🚨 API Request Error:', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
        url,
        endpoint,
        baseURL: baseUrl,
        timestamp: new Date().toISOString()
      });
      
      // Re-throw the error without additional wrapping if it already has context
      if ((error as any).status || (error as any).endpoint) {
        throw error;
      }
      
      // Only wrap if it's a generic error
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

  // Health check method to test connectivity
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      console.log('🏥 Performing health check...');
      return await this.request('/health', {}, this.rootURL);
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
      throw new Error(`Cannot connect to server. Please check your internet connection and try again later.`);
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

  async createAlbum(albumData: FormData): Promise<any> {
    return this.request('/albums', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: albumData,
    });
  }

  // Singles
  async getSingles(params?: { page?: number; limit?: number }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/singles${query ? `?${query}` : ''}`);
  }

  async getSingleById(id: string): Promise<any> {
    return this.request(`/singles/${id}`);
  }

  async createSingle(singleData: FormData): Promise<any> {
    return this.request('/singles', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: singleData,
    });
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
  async search(query: string, type: 'all' | 'tracks' | 'artists' | 'albums' | 'playlists' | 'singles' = 'all', limit = 20): Promise<{
    tracks?: Track[];
    artists?: any[];
    albums?: Album[];
    playlists?: Playlist[];
    singles?: any[];
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
    return this.request('/tracks/my-liked');
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

  // Admin Analytics
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalTracks: number;
    totalPlays: number;
    totalLikes: number;
    newUsersToday: number;
    tracksUploadedToday: number;
  }> {
    return this.request('/admin/stats');
  }

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    metric?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.metric) searchParams.append('metric', params.metric);
    
    const query = searchParams.toString();
    return this.request(`/admin/analytics${query ? `?${query}` : ''}`);
  }
}

export const apiService = new ApiService();