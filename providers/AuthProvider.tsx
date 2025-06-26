import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        throw error;
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
          showFavoriteStats: data.show_favorite_stats || true,
          topArtists: data.top_artists || [],
          topTracks: data.top_tracks || [],
          showcaseStatus: data.showcase_status,
          showcaseNowPlaying: data.showcase_now_playing,
          createdAt: data.created_at,
        };
        
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
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

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            role,
            first_name: additionalData?.firstName?.trim() || '',
            last_name: additionalData?.lastName?.trim() || '',
            bio: additionalData?.bio?.trim() || '',
            is_private: additionalData?.isPrivate || false,
            profile_picture_url: additionalData?.profilePictureUrl || '',
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      console.log('✅ Supabase signup successful:', data.user.id);

      // If user is immediately confirmed, load their profile
      if (data.user && !data.user.email_confirmed_at) {
        console.log('📧 Email confirmation required');
        // For development, we might want to auto-confirm
        // In production, user will need to confirm email
      }

      // The trigger will automatically create the user profile
      // Load the profile if user is confirmed
      if (data.user && data.session) {
        await loadUserProfile(data.user.id);
      }

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      
      let userFriendlyMessage = 'Registration failed. Please try again.';
      
      if (error.message) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('email') && errorMessage.includes('already')) {
          userFriendlyMessage = 'An account with this email already exists. Please use a different email or try logging in.';
        } else if (errorMessage.includes('password')) {
          userFriendlyMessage = 'Password does not meet requirements. Please ensure it is at least 6 characters long.';
        } else if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
          userFriendlyMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('weak password')) {
          userFriendlyMessage = 'Password is too weak. Please choose a stronger password.';
        } else {
          userFriendlyMessage = error.message;
        }
      }
      
      throw new Error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
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
        throw error;
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Reset password error:', error);
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