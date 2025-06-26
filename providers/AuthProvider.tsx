import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  role: 'admin' | 'listener' | 'artist';
  isPublic: boolean;
  showFavoriteStats: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, displayName: string, role?: 'listener' | 'artist') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
        
        // Verify token is still valid
        try {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      
      apiService.setAuthToken(response.token);
      setUser(response.user);
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
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
        isPublic: true,
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

  const signup = async (email: string, password: string, displayName: string, role: 'listener' | 'artist' = 'listener') => {
    setIsLoading(true);
    try {
      console.log('🔐 Starting signup process:', {
        email,
        displayName,
        role,
        passwordLength: password.length,
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

      const response = await apiService.register(email.trim(), password, displayName.trim(), role);
      
      console.log('✅ Signup successful, storing auth data');
      
      apiService.setAuthToken(response.token);
      setUser(response.user);
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
      ]);
    } catch (error) {
      console.error('❌ Signup error details:', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
        status: (error as any).status,
        data: (error as any).data,
        url: (error as any).url,
        endpoint: (error as any).endpoint,
        originalMessage: (error as any).originalMessage,
        timestamp: new Date().toISOString()
      });
      
      // Provide more user-friendly error messages
      let userFriendlyMessage = 'Registration failed. Please try again.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Check if the error already has a user-friendly message from the API service
        if ((error as any).status) {
          // This error came from the API service and already has a user-friendly message
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
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
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