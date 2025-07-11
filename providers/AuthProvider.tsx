import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
  emailConfirmed?: boolean;
  artistVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, role?: 'listener' | 'artist', additionalData?: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Logging out user:', user?.id);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Clear API service token
      apiService.setAuthToken(null);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // Set up the unauthorized callback for API service
    apiService.setOnUnauthorizedCallback(logout);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      
      // Sync auth token with API service
      apiService.setAuthToken(session?.access_token || null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setSession(session);
      
      // Always sync the auth token with API service when session changes
      apiService.setAuthToken(session?.access_token || null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Optionally refresh user profile on token refresh
        await loadUserProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Clear the callback when component unmounts
      apiService.setOnUnauthorizedCallback(null);
    };
  }, [logout]);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId);
      
      // First try to get existing user profile
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        console.log('User profile not found, attempting to create...');
        
        // Try to use the get_or_create_user_profile function
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_or_create_user_profile', { user_id: userId });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          setIsLoading(false);
          return;
        }

        if (profileData && profileData.length > 0) {
          data = profileData[0];
        } else {
          console.log('Could not create user profile');
          setIsLoading(false);
          return;
        }
      } else if (error) {
        console.error('Error loading user profile:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const transformedUser: User = {
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          firstName: data.first_name,
          lastName: data.last_name,
          profilePictureUrl: data.profile_picture_url,
          bio: data.bio,
          role: data.role,
          isPrivate: data.is_private || false,
          showFavoriteStats: data.show_favorite_stats !== false, // Default to true
          topArtists: data.top_artists || [],
          topTracks: data.top_tracks || [],
          showcaseStatus: data.showcase_status,
          showcaseNowPlaying: data.showcase_now_playing,
          createdAt: data.created_at,
          emailConfirmed: true, // If we can load profile, email is confirmed
          artistVerified: data.artist_verified || false,
        };
        
        console.log('User profile loaded:', transformedUser.displayName, transformedUser.role);
        setUser(transformedUser);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        
        throw new Error(error.message || 'Login failed');
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        // loadUserProfile will be called by the auth state change listener
      }
    } catch (error: any) {
      console.error('Login error:', error);
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
      console.log('🔐 Starting Supabase signup process:', {
        email,
        displayName,
        role,
        timestamp: new Date().toISOString()
      });

      // Validate inputs
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

      // Prepare user metadata - DO NOT include any timestamp fields
      const userMetadata = {
        display_name: displayName.trim(),
        displayName: displayName.trim(), // Include both for compatibility
        role,
        first_name: additionalData?.firstName?.trim() || '',
        firstName: additionalData?.firstName?.trim() || '', // Include both for compatibility
        last_name: additionalData?.lastName?.trim() || '',
        lastName: additionalData?.lastName?.trim() || '', // Include both for compatibility
        bio: additionalData?.bio?.trim() || '',
        is_private: additionalData?.isPrivate || false,
        isPrivate: additionalData?.isPrivate || false, // Include both for compatibility
        profile_picture_url: additionalData?.profilePictureUrl || '',
        profilePictureUrl: additionalData?.profilePictureUrl || '', // Include both for compatibility
      };

      console.log('📝 User metadata payload:', userMetadata);

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: userMetadata,
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        } else if (error.message.includes('Password should be at least')) {
          throw new Error('Password must be at least 6 characters long.');
        } else if (error.message.includes('Unable to validate email address')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('Signup is disabled')) {
          throw new Error('Account registration is currently disabled. Please contact support.');
        }
        
        throw new Error(error.message || 'Signup failed');
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      console.log('✅ Supabase signup successful:', data.user.id);

      // Check if email confirmation is required
      if (!data.session && data.user && !data.user.email_confirmed_at) {
        console.log('📧 Email confirmation required');
        throw new Error('Please check your email and click the confirmation link to complete your registration.');
      }

      // If user is immediately confirmed and we have a session, the auth state change will handle profile loading
      if (data.session) {
        console.log('✅ User immediately confirmed with session');
        // The auth state change listener will call loadUserProfile
      }

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('Updating profile for user:', user.id);
      
      const updateData: any = {};
      
      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.profilePictureUrl !== undefined) updateData.profile_picture_url = updates.profilePictureUrl;
      if (updates.isPrivate !== undefined) updateData.is_private = updates.isPrivate;
      if (updates.showFavoriteStats !== undefined) updateData.show_favorite_stats = updates.showFavoriteStats;
      if (updates.showcaseStatus !== undefined) updateData.showcase_status = updates.showcaseStatus;
      if (updates.showcaseNowPlaying !== undefined) updateData.showcase_now_playing = updates.showcaseNowPlaying;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'sonix://reset-password',
      });

      if (error) {
        console.error('Reset password error:', error);
        
        if (error.message.includes('For security purposes')) {
          throw new Error('For security purposes, we cannot confirm if this email exists. If you have an account, you will receive a reset link.');
        }
        
        throw error;
      }
      
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      console.log('Resending confirmation email to:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Resend confirmation error:', error);
        throw error;
      }
      
      console.log('✅ Confirmation email resent');
    } catch (error) {
      console.error('Resend confirmation error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        resetPassword,
        resendConfirmation,
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