import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
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

type Profile = {
  id: string;
  email: string;
  display_name?: string;
  role?: 'listener' | 'artist';
  [key: string]: any;
};

type AuthContextType = {
  user: Profile | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role?: 'listener' | 'artist',
    additionalData?: Partial<Profile>
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUser(data as Profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      // Always provide a string to setAuthToken
      apiService.setAuthToken(data.session?.access_token ?? '');
      if (data.user) await loadUserProfile(data.user.id);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: 'listener' | 'artist' = 'listener',
      additionalData: Partial<Profile> = {}
    ) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const profile: Profile = {
            id: data.user.id,
            email,
            display_name: displayName,
            role,
            ...additionalData,
          };
          const { error: upError } = await supabase.from('profiles').insert(profile);
          if (upError) throw upError;
          await loadUserProfile(data.user.id);
        }
      } catch (err) {
        console.error('Signup error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserProfile]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      // Clear token on logout
      apiService.setAuthToken('');
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      setIsLoading(true);
      try {
        if (!user) throw new Error('No user to update');
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (error) throw error;
        setUser(prev => (prev ? { ...prev, ...updates } : prev));
      } catch (err) {
        console.error('Update profile error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (err) {
      console.error('Reset password error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      // Trigger sign-up for resend
      const { error } = await supabase.auth.signUp({ email, password: '' });
      if (error) console.warn('Resend confirmation warning:', error.message);
    } catch (err) {
      console.error('Resend confirmation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Register unauthorized callback
    apiService.setOnUnauthorizedCallback(logout);

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      apiService.setAuthToken(session?.access_token ?? '');
      if (session?.user) {
        loadUserProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      apiService.setAuthToken(session?.access_token ?? '');
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      // Remove callback on cleanup
      apiService.setOnUnauthorizedCallback(() => {});
    };
  }, [logout, loadUserProfile]);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, login, signup, logout, updateProfile, resetPassword, resendConfirmation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
