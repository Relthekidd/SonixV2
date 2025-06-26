import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  profilePictureUrl?: string;
  bio?: string;
  role: 'admin' | 'listener' | 'artist';
  isPrivate: boolean;
  showFavoriteStats: boolean;
  topArtists?: any[];
  topTracks?: any[];
  showcaseStatus?: string;
  showcaseNowPlaying?: string;
  followerCount?: number;
  followingCount?: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, displayName: string, role?: 'listener' | 'artist', additionalData?: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  sendFollowRequest: (userId: string) => Promise<void>;
  respondToFollowRequest: (requestId: string, accept: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        apiService.setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify token is still valid and get updated user data
        try {
          const currentUser = await apiService.getCurrentUser();
          const transformedUser = transformUserData(currentUser);
          setUser(transformedUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(transformedUser));
        } catch (error) {
          // Token is invalid, clear stored data
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearStoredAuth = async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    apiService.setAuthToken(null);
    setUser(null);
  };

  const transformUserData = (apiUser: any): User => ({
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.display_name || apiUser.displayName,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    avatar: apiUser.profile_picture_url || apiUser.avatar,
    profilePictureUrl: apiUser.profile_picture_url,
    bio: apiUser.bio,
    role: apiUser.role || 'listener',
    isPrivate: apiUser.is_private || false,
    showFavoriteStats: apiUser.show_favorite_stats || true,
    topArtists: apiUser.top_artists || [],
    topTracks: apiUser.top_tracks || [],
    showcaseStatus: apiUser.showcase_status,
    showcaseNowPlaying: apiUser.showcase_now_playing,
    followerCount: apiUser.follower_count || 0,
    followingCount: apiUser.following_count || 0,
    createdAt: apiUser.created_at,
  });

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      
      apiService.setAuthToken(response.token);
      const transformedUser = transformUserData(response.user);
      setUser(transformedUser);
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(transformedUser)),
      ]);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement Google OAuth
      // For now, create a mock Google user
      const mockUser: User = {
        id: 'google-user',
        email: 'user@gmail.com',
        displayName: 'Google User',
        role: 'listener',
        isPrivate: false,
        showFavoriteStats: true,
      };
      
      setUser(mockUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: 'listener' | 'artist' = 'listener',
    additionalData?: any
  ) => {
    setIsLoading(true);
    try {
      console.log('🔐 Starting signup process:', {
        email,
        displayName,
        role,
        passwordLength: password.length,
        additionalData,
        timestamp: new Date().toISOString()
      });

      // Validate inputs before making API call
      if (!email?.trim()) {
        throw new Error('Email is required');
      }
      if (!password?.trim()) {
        throw new Error('Password is required');
      }
      if (!displayName?.trim()) {
        throw new Error('Display name is required');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const signupData = {
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role,
        ...additionalData
      };

      const response = await apiService.register(signupData);
      
      console.log('✅ Signup successful, storing auth data');
      
      apiService.setAuthToken(response.token);
      const transformedUser = transformUserData(response.user);
      setUser(transformedUser);
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(transformedUser)),
      ]);
    } catch (error) {
      console.error('❌ Signup error details:', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      
      // Provide more user-friendly error messages
      let userFriendlyMessage = 'Registration failed. Please try again.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if ((error as any).status) {
          userFriendlyMessage = error.message;
        } else if (errorMessage.includes('network') || errorMessage.includes('connect')) {
          userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorMessage.includes('timeout')) {
          userFriendlyMessage = 'Request timed out. Please check your connection and try again.';
        } else if (errorMessage.includes('email') && errorMessage.includes('exist')) {
          userFriendlyMessage = 'An account with this email already exists. Please use a different email or try logging in.';
        } else if (errorMessage.includes('password')) {
          userFriendlyMessage = 'Password does not meet requirements. Please ensure it is at least 6 characters long.';
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          userFriendlyMessage = 'Please check your information and try again. Make sure all fields are filled correctly.';
        } else if (error.message && !error.message.includes('API Error')) {
          userFriendlyMessage = error.message;
        }
      }
      
      throw new Error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearStoredAuth();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const updatedUserData = await apiService.updateUserProfile(updates);
      const transformedUser = transformUserData({ ...user, ...updatedUserData });
      setUser(transformedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(transformedUser));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await apiService.resetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const followUser = async (userId: string) => {
    if (!user) return;

    try {
      await apiService.followUser(userId);
      // Update local user data
      setUser(prev => prev ? { ...prev, followingCount: (prev.followingCount || 0) + 1 } : null);
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return;

    try {
      await apiService.unfollowUser(userId);
      // Update local user data
      setUser(prev => prev ? { ...prev, followingCount: Math.max((prev.followingCount || 0) - 1, 0) } : null);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  };

  const sendFollowRequest = async (userId: string) => {
    if (!user) return;

    try {
      await apiService.sendFollowRequest(userId);
    } catch (error) {
      console.error('Error sending follow request:', error);
      throw error;
    }
  };

  const respondToFollowRequest = async (requestId: string, accept: boolean) => {
    if (!user) return;

    try {
      await apiService.respondToFollowRequest(requestId, accept);
      if (accept) {
        setUser(prev => prev ? { ...prev, followerCount: (prev.followerCount || 0) + 1 } : null);
      }
    } catch (error) {
      console.error('Error responding to follow request:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        updateProfile,
        resetPassword,
        followUser,
        unfollowUser,
        sendFollowRequest,
        respondToFollowRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};