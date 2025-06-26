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

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          first_name: string | null;
          last_name: string | null;
          bio: string | null;
          profile_picture_url: string | null;
          role: 'admin' | 'listener' | 'artist';
          is_private: boolean;
          top_artists: any[] | null;
          top_tracks: any[] | null;
          showcase_status: string | null;
          showcase_now_playing: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          first_name?: string | null;
          last_name?: string | null;
          bio?: string | null;
          profile_picture_url?: string | null;
          role?: 'admin' | 'listener' | 'artist';
          is_private?: boolean;
          top_artists?: any[] | null;
          top_tracks?: any[] | null;
          showcase_status?: string | null;
          showcase_now_playing?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          bio?: string | null;
          profile_picture_url?: string | null;
          role?: 'admin' | 'listener' | 'artist';
          is_private?: boolean;
          top_artists?: any[] | null;
          top_tracks?: any[] | null;
          showcase_status?: string | null;
          showcase_now_playing?: string | null;
          created_at?: string;
        };
      };
    };
  };
}