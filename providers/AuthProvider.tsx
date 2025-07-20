import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
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
  role?: 'listener' | 'artist' | 'admin';
  [key: string]: any;
};

type AuthContextType = {
  user: Profile | null;
  session: Session | null;
  isLoading: boolean;
  hasUser: boolean;
  userId: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role?: 'listener' | 'artist' | 'admin',
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

  const hasUser = !isLoading && !!user && !!session;
  const userId = session?.user?.id || null;

  const prevTokenRef = useRef<string | null>(null);
  const prevUidRef = useRef<string | null>(null);

  const loadUserProfile = useCallback(async (uid: string) => {
    console.log('[Auth] loadUserProfile start for', uid);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (error) throw error;

      setUser(prev => {
        // Only update if profile actually changed
        if (
          prev && prev.id === data.id && prev.role === data.role &&
          JSON.stringify(prev) === JSON.stringify(data)
        ) {
          console.log('[Auth] loadUserProfile: no changes, skip');
          return prev;
        }
        console.log('[Auth] loadUserProfile success, updating');
        return data as Profile;
      });
    } catch (err) {
      console.error('[Auth] loadUserProfile error', err);
      setUser(null);
    }
  }, []);

  const syncSession = useCallback(
    async (sess: Session | null) => {
      setSession(sess);

      const token = sess?.access_token ?? null;
      if (token && prevTokenRef.current !== token) {
        apiService.setAuthToken(token);
        prevTokenRef.current = token;
      } else if (!token) {
        apiService.setAuthToken('');
        prevTokenRef.current = null;
      }

      const uid = sess?.user?.id;
      if (uid && prevUidRef.current !== uid) {
        prevUidRef.current = uid;
        await loadUserProfile(uid);
      }
    },
    [loadUserProfile]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      console.log('[Auth] login start', email);
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log('[Auth] signInWithPassword result', { data, error });
        if (error) throw error;

        await syncSession(data.session!);
      } catch (err) {
        console.error('[Auth] login error', err);
        throw err;
      } finally {
        setIsLoading(false);
        console.log('[Auth] login end');
      }
    },
    [syncSession]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: 'listener' | 'artist' | 'admin' = 'listener',
      additionalData: Partial<Profile> = {}
    ) => {
      console.log('[Auth] signup start', email);
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log('[Auth] signUp result', { data, error });
        if (error) throw error;

        const newUser = data.user!;
        const uid = newUser.id;
        const profile: Profile = { id: uid, email, display_name: displayName, role, ...additionalData };
        const { error: upError } = await supabase.from('profiles').insert(profile);
        if (upError) throw upError;
        console.log('[Auth] profile insert success');

        await loadUserProfile(uid);
      } catch (err) {
        console.error('[Auth] signup error', err);
        throw err;
      } finally {
        setIsLoading(false);
        console.log('[Auth] signup end');
      }
    },
    [loadUserProfile]
  );

  const logout = useCallback(async () => {
    console.log('[Auth] logout start');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      console.log('[Auth] signOut result', { error });
      if (error) throw error;

      setUser(null);
      prevUidRef.current = null;
      prevTokenRef.current = null;
      await syncSession(null);
    } catch (err) {
      console.error('[Auth] logout error', err);
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[Auth] logout end');
    }
  }, [syncSession]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      console.log('[Auth] updateProfile start', updates);
      if (!user) throw new Error('No user to update');
      setIsLoading(true);
      try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        console.log('[Auth] updateProfile result', { error });
        if (error) throw error;
        setUser(prev => (prev ? { ...prev, ...updates } : prev));
      } catch (err) {
        console.error('[Auth] updateProfile error', err);
        throw err;
      } finally {
        setIsLoading(false);
        console.log('[Auth] updateProfile end');
      }
    },
    [user]
  );

  const resetPassword = useCallback(async (email: string) => {
    console.log('[Auth] resetPassword start', email);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      console.log('[Auth] resetPassword result', { error });
      if (error) throw error;
    } catch (err) {
      console.error('[Auth] resetPassword error', err);
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[Auth] resetPassword end');
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    console.log('[Auth] resendConfirmation start', email);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password: '' });
      console.log('[Auth] resendConfirmation result', { error });
      if (error) console.warn('[Auth] resendConfirmation warning', error.message);
    } catch (err) {
      console.error('[Auth] resendConfirmation error', err);
    } finally {
      setIsLoading(false);
      console.log('[Auth] resendConfirmation end');
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] initializing provider');
    apiService.setOnUnauthorizedCallback(logout);
    let mounted = true;

    // Initial session fetch
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('[Auth] initial getSession', initialSession);
      if (!mounted) return;
      await syncSession(initialSession);
      setIsLoading(false);
    });

    // Listen to auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('[Auth] onAuthStateChange', event);
      if (!mounted) return;

      switch (event) {
        case 'SIGNED_IN':
        case 'INITIAL_SESSION':
          syncSession(sess).finally(() => {
            if (mounted) setIsLoading(false);
          });
          break;

        case 'SIGNED_OUT':
          setUser(null);
          prevUidRef.current = null;
          prevTokenRef.current = null;
          syncSession(null).finally(() => setIsLoading(false));
          break;

        case 'TOKEN_REFRESHED':
          syncSession(sess);
          break;

        default:
          break;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      apiService.setOnUnauthorizedCallback(() => {});
    };
  }, [logout, syncSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        hasUser,
        userId,
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
