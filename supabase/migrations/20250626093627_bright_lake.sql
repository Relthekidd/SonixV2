/*
  # Complete User Profile and Social System

  1. New Tables
    - `user_top_artists` - User's top played artists
    - `user_top_songs` - User's top played songs  
    - `user_status` - User status updates and showcase
    - `follower_requests` - Follow request management
    - `user_follows` - User following relationships
    - `song_plays` - Track individual song plays for analytics

  2. Enhanced Tables
    - Update `users` table with additional profile fields
    - Update `artists` table with enhanced metadata
    - Update `tracks` table with play tracking

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for privacy controls
*/

-- Enhanced users table with all profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS top_artists jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS top_tracks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS showcase_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS showcase_now_playing text;

-- User top artists tracking
CREATE TABLE IF NOT EXISTS user_top_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  play_count integer DEFAULT 0,
  last_played timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- User top songs tracking  
CREATE TABLE IF NOT EXISTS user_top_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  play_count integer DEFAULT 0,
  last_played timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- User status and showcase
CREATE TABLE IF NOT EXISTS user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status_text text,
  pinned_content_type text CHECK (pinned_content_type IN ('song', 'album', 'playlist')),
  pinned_content_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Follow requests for private accounts
CREATE TABLE IF NOT EXISTS follower_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid REFERENCES users(id) ON DELETE CASCADE,
  to_user uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user, to_user)
);

-- User following relationships
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Song plays tracking for analytics
CREATE TABLE IF NOT EXISTS song_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  play_duration integer DEFAULT 0,
  completed boolean DEFAULT false,
  device_type text DEFAULT 'web',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enhanced artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS followers integer DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS monthly_listeners integer DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS total_plays bigint DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Enhanced tracks table for better metadata
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lyrics text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS track_number integer;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS duration integer DEFAULT 180;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS play_count bigint DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS explicit boolean DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE user_top_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_top_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_top_artists
CREATE POLICY "Users can view own top artists"
  ON user_top_artists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own top artists"
  ON user_top_artists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_top_songs
CREATE POLICY "Users can view own top songs"
  ON user_top_songs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own top songs"
  ON user_top_songs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_status
CREATE POLICY "Users can view public status or own status"
  ON user_status
  FOR SELECT
  TO public
  USING (
    is_active = true AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = user_status.user_id 
        AND users.is_private = false
      ) OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own status"
  ON user_status
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for follower_requests
CREATE POLICY "Users can manage follow requests"
  ON follower_requests
  FOR ALL
  TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid())
  WITH CHECK (from_user = auth.uid() OR to_user = auth.uid());

-- RLS Policies for user_follows
CREATE POLICY "Users can view follows"
  ON user_follows
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON user_follows
  FOR ALL
  TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- RLS Policies for song_plays
CREATE POLICY "Users can view own plays"
  ON song_plays
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own plays"
  ON song_plays
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all plays"
  ON song_plays
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_top_artists_user_id ON user_top_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_top_artists_play_count ON user_top_artists(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_top_songs_user_id ON user_top_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_top_songs_play_count ON user_top_songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_follower_requests_to_user ON follower_requests(to_user);
CREATE INDEX IF NOT EXISTS idx_follower_requests_from_user ON follower_requests(from_user);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_user_id ON song_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_track_id ON song_plays(track_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_created_at ON song_plays(created_at DESC);

-- Add GIN indexes for text search
CREATE INDEX IF NOT EXISTS idx_users_display_name_gin ON users USING gin(display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_name_gin ON artists USING gin(name gin_trgm_ops);

-- Functions to update play counts
CREATE OR REPLACE FUNCTION update_track_play_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update track play count
  UPDATE tracks 
  SET play_count = play_count + 1 
  WHERE id = NEW.track_id;
  
  -- Update artist total plays
  UPDATE artists 
  SET total_plays = total_plays + 1 
  WHERE id = NEW.artist_id;
  
  -- Update user top songs
  INSERT INTO user_top_songs (user_id, track_id, play_count, last_played)
  VALUES (NEW.user_id, NEW.track_id, 1, NEW.created_at)
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    play_count = user_top_songs.play_count + 1,
    last_played = NEW.created_at;
  
  -- Update user top artists
  INSERT INTO user_top_artists (user_id, artist_id, play_count, last_played)
  VALUES (NEW.user_id, NEW.artist_id, 1, NEW.created_at)
  ON CONFLICT (user_id, artist_id)
  DO UPDATE SET 
    play_count = user_top_artists.play_count + 1,
    last_played = NEW.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for play count updates
DROP TRIGGER IF EXISTS trigger_update_play_counts ON song_plays;
CREATE TRIGGER trigger_update_play_counts
  AFTER INSERT ON song_plays
  FOR EACH ROW
  EXECUTE FUNCTION update_track_play_count();

-- Function to calculate monthly listeners for artists
CREATE OR REPLACE FUNCTION update_monthly_listeners()
RETURNS void AS $$
BEGIN
  UPDATE artists 
  SET monthly_listeners = (
    SELECT COUNT(DISTINCT sp.user_id)
    FROM song_plays sp
    JOIN tracks t ON t.id = sp.track_id
    WHERE t.artist_id = artists.id
    AND sp.created_at >= NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql;