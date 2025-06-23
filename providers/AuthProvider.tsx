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
      const response = await apiService.register(email, password, displayName, role);
      
      apiService.setAuthToken(response.token);
      setUser(response.user);
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
      ]);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
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