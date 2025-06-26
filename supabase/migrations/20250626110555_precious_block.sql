-- Create user_follows table for follow relationships
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create follower_requests table for private account follow requests
CREATE TABLE IF NOT EXISTS follower_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid REFERENCES users(id) ON DELETE CASCADE,
  to_user uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user, to_user)
);

-- Create user_top_artists table for tracking top listened artists
CREATE TABLE IF NOT EXISTS user_top_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  play_count integer DEFAULT 0,
  last_played timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- Create user_top_songs table for tracking top listened songs
CREATE TABLE IF NOT EXISTS user_top_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  play_count integer DEFAULT 0,
  last_played timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create user_status table for custom showcase sections
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

-- Create song_plays table for detailed play tracking
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follower_requests_from_user ON follower_requests(from_user);
CREATE INDEX IF NOT EXISTS idx_follower_requests_to_user ON follower_requests(to_user);
CREATE INDEX IF NOT EXISTS idx_user_top_artists_user_id ON user_top_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_top_artists_play_count ON user_top_artists(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_top_songs_user_id ON user_top_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_top_songs_play_count ON user_top_songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_user_id ON song_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_track_id ON song_plays(track_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_created_at ON song_plays(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_top_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_top_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_plays ENABLE ROW LEVEL SECURITY;

-- Drop existing policies, triggers, and functions in correct order to avoid conflicts
DO $$ 
BEGIN
  -- Drop triggers first (they depend on functions)
  DROP TRIGGER IF EXISTS trigger_update_play_counts ON song_plays;
  
  -- Drop functions
  DROP FUNCTION IF EXISTS update_track_play_count() CASCADE;
  DROP FUNCTION IF EXISTS send_follow_request(uuid) CASCADE;
  DROP FUNCTION IF EXISTS respond_to_follow_request(uuid, boolean) CASCADE;
  DROP FUNCTION IF EXISTS unfollow_user(uuid) CASCADE;
  DROP FUNCTION IF EXISTS get_user_profile_with_stats(uuid) CASCADE;
  DROP FUNCTION IF EXISTS get_admin_statistics() CASCADE;
  DROP FUNCTION IF EXISTS update_user_status(text, text, uuid) CASCADE;
  DROP FUNCTION IF EXISTS search_users(text, integer) CASCADE;
  
  -- Drop policies
  DROP POLICY IF EXISTS "Users can view follows" ON user_follows;
  DROP POLICY IF EXISTS "Users can manage own follows" ON user_follows;
  DROP POLICY IF EXISTS "Users can manage follow requests" ON follower_requests;
  DROP POLICY IF EXISTS "Users can view own top artists" ON user_top_artists;
  DROP POLICY IF EXISTS "Users can manage own top artists" ON user_top_artists;
  DROP POLICY IF EXISTS "Users can view own top songs" ON user_top_songs;
  DROP POLICY IF EXISTS "Users can manage own top songs" ON user_top_songs;
  DROP POLICY IF EXISTS "Users can view public status or own status" ON user_status;
  DROP POLICY IF EXISTS "Users can manage own status" ON user_status;
  DROP POLICY IF EXISTS "Users can view own plays" ON song_plays;
  DROP POLICY IF EXISTS "Users can insert own plays" ON song_plays;
  DROP POLICY IF EXISTS "Service role can manage all plays" ON song_plays;
  DROP POLICY IF EXISTS "Users can view public playlists or own playlists" ON playlists;
  DROP POLICY IF EXISTS "Users can manage own playlists" ON playlists;
  DROP POLICY IF EXISTS "Users can view playlist tracks based on playlist access" ON playlist_tracks;
  DROP POLICY IF EXISTS "Users can manage own playlist tracks" ON playlist_tracks;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if policies or functions don't exist
    NULL;
END $$;

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

-- RLS Policies for follower_requests
CREATE POLICY "Users can manage follow requests"
  ON follower_requests
  FOR ALL
  TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid())
  WITH CHECK (from_user = auth.uid() OR to_user = auth.uid());

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

-- Function to update track play count when a play is recorded
CREATE OR REPLACE FUNCTION update_track_play_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update track play count
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1 
  WHERE id = NEW.track_id;
  
  -- Update artist total plays
  UPDATE artists 
  SET total_plays = COALESCE(total_plays, 0) + 1 
  WHERE id = NEW.artist_id;
  
  -- Update user's top songs
  INSERT INTO user_top_songs (user_id, track_id, play_count, last_played)
  VALUES (NEW.user_id, NEW.track_id, 1, NEW.created_at)
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    play_count = user_top_songs.play_count + 1,
    last_played = NEW.created_at;
  
  -- Update user's top artists
  INSERT INTO user_top_artists (user_id, artist_id, play_count, last_played)
  VALUES (NEW.user_id, NEW.artist_id, 1, NEW.created_at)
  ON CONFLICT (user_id, artist_id)
  DO UPDATE SET 
    play_count = user_top_artists.play_count + 1,
    last_played = NEW.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update play counts
CREATE TRIGGER trigger_update_play_counts
  AFTER INSERT ON song_plays
  FOR EACH ROW EXECUTE FUNCTION update_track_play_count();

-- Function to send follow request
CREATE OR REPLACE FUNCTION send_follow_request(target_user_id uuid)
RETURNS void AS $$
DECLARE
  target_is_private boolean;
  request_exists boolean;
  already_following boolean;
BEGIN
  -- Check if user exists and get privacy setting
  SELECT is_private INTO target_is_private
  FROM users
  WHERE id = target_user_id;
  
  IF target_is_private IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already following
  SELECT EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = auth.uid() AND following_id = target_user_id
  ) INTO already_following;
  
  IF already_following THEN
    RAISE EXCEPTION 'Already following this user';
  END IF;
  
  -- Check if request already exists
  SELECT EXISTS (
    SELECT 1 FROM follower_requests
    WHERE from_user = auth.uid() AND to_user = target_user_id AND status = 'pending'
  ) INTO request_exists;
  
  IF request_exists THEN
    RAISE EXCEPTION 'Follow request already sent';
  END IF;
  
  -- If public profile, follow directly
  IF NOT target_is_private THEN
    INSERT INTO user_follows (follower_id, following_id)
    VALUES (auth.uid(), target_user_id);
  ELSE
    -- If private profile, create follow request
    INSERT INTO follower_requests (from_user, to_user, status)
    VALUES (auth.uid(), target_user_id, 'pending');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to respond to follow request
CREATE OR REPLACE FUNCTION respond_to_follow_request(request_id uuid, accept boolean)
RETURNS void AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request details
  SELECT * INTO request_record
  FROM follower_requests
  WHERE id = request_id AND to_user = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Follow request not found or already processed';
  END IF;
  
  -- Update request status
  UPDATE follower_requests
  SET status = CASE WHEN accept THEN 'accepted' ELSE 'denied' END,
      updated_at = now()
  WHERE id = request_id;
  
  -- If accepted, create follow relationship
  IF accept THEN
    INSERT INTO user_follows (follower_id, following_id)
    VALUES (request_record.from_user, request_record.to_user)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfollow user
CREATE OR REPLACE FUNCTION unfollow_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM user_follows
  WHERE follower_id = auth.uid() AND following_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not following this user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with stats
CREATE OR REPLACE FUNCTION get_user_profile_with_stats(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  first_name text,
  last_name text,
  bio text,
  profile_picture_url text,
  role text,
  is_private boolean,
  artist_verified boolean,
  created_at timestamptz,
  follower_count bigint,
  following_count bigint,
  is_following boolean,
  has_pending_request boolean,
  can_view boolean,
  top_artists jsonb,
  top_songs jsonb,
  status_text text,
  pinned_content_type text,
  pinned_content_id uuid
) AS $$
DECLARE
  can_view_profile boolean;
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if current user can view this profile
  SELECT 
    CASE 
      WHEN target_user_id = current_user_id THEN true
      WHEN u.is_private = false THEN true
      WHEN EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = current_user_id AND following_id = target_user_id
      ) THEN true
      ELSE false
    END
  INTO can_view_profile
  FROM users u
  WHERE u.id = target_user_id;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.display_name,
    u.first_name,
    u.last_name,
    u.bio,
    u.profile_picture_url,
    u.role,
    u.is_private,
    u.artist_verified,
    u.created_at,
    COALESCE(follower_stats.count, 0) as follower_count,
    COALESCE(following_stats.count, 0) as following_count,
    COALESCE(follow_status.is_following, false) as is_following,
    COALESCE(request_status.has_pending, false) as has_pending_request,
    can_view_profile as can_view,
    CASE 
      WHEN can_view_profile THEN COALESCE(top_artists_json.artists, '[]'::jsonb)
      ELSE '[]'::jsonb
    END as top_artists,
    CASE 
      WHEN can_view_profile THEN COALESCE(top_songs_json.songs, '[]'::jsonb)
      ELSE '[]'::jsonb
    END as top_songs,
    CASE 
      WHEN can_view_profile THEN us.status_text
      ELSE NULL
    END as status_text,
    CASE 
      WHEN can_view_profile THEN us.pinned_content_type
      ELSE NULL
    END as pinned_content_type,
    CASE 
      WHEN can_view_profile THEN us.pinned_content_id
      ELSE NULL
    END as pinned_content_id
  FROM users u
  LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM user_follows
    WHERE following_id = target_user_id
    GROUP BY following_id
  ) follower_stats ON u.id = follower_stats.following_id
  LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM user_follows
    WHERE follower_id = target_user_id
    GROUP BY follower_id
  ) following_stats ON u.id = following_stats.follower_id
  LEFT JOIN (
    SELECT following_id, true as is_following
    FROM user_follows
    WHERE follower_id = current_user_id AND following_id = target_user_id
  ) follow_status ON u.id = follow_status.following_id
  LEFT JOIN (
    SELECT to_user, true as has_pending
    FROM follower_requests
    WHERE from_user = current_user_id AND to_user = target_user_id AND status = 'pending'
  ) request_status ON u.id = request_status.to_user
  LEFT JOIN (
    SELECT 
      uta.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'avatar_url', a.avatar_url,
          'play_count', uta.play_count
        ) ORDER BY uta.play_count DESC
      ) as artists
    FROM user_top_artists uta
    JOIN artists a ON uta.artist_id = a.id
    WHERE uta.user_id = target_user_id
    GROUP BY uta.user_id
  ) top_artists_json ON u.id = top_artists_json.user_id
  LEFT JOIN (
    SELECT 
      uts.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'title', t.title,
          'artist', COALESCE(a.name, 'Unknown Artist'),
          'cover_url', COALESCE(t.cover_url, ''),
          'play_count', uts.play_count
        ) ORDER BY uts.play_count DESC
      ) as songs
    FROM user_top_songs uts
    JOIN tracks t ON uts.track_id = t.id
    LEFT JOIN artists a ON t.artist_id = a.id
    WHERE uts.user_id = target_user_id
    GROUP BY uts.user_id
  ) top_songs_json ON u.id = top_songs_json.user_id
  LEFT JOIN (
    SELECT DISTINCT ON (user_id) *
    FROM user_status
    WHERE user_id = target_user_id AND is_active = true
    ORDER BY user_id, created_at DESC
  ) us ON u.id = us.user_id
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_statistics()
RETURNS TABLE (
  total_users bigint,
  total_tracks bigint,
  total_albums bigint,
  total_artists bigint,
  total_plays bigint,
  total_likes bigint,
  new_users_today bigint,
  new_tracks_today bigint,
  plays_today bigint,
  top_tracks jsonb,
  top_artists jsonb,
  recent_users jsonb
) AS $$
BEGIN
  -- Only allow admins to access statistics
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM tracks) as total_tracks,
    (SELECT COUNT(*) FROM albums) as total_albums,
    (SELECT COUNT(*) FROM artists) as total_artists,
    (SELECT COUNT(*) FROM song_plays) as total_plays,
    (SELECT COUNT(*) FROM user_top_songs) as total_likes,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM tracks WHERE created_at >= CURRENT_DATE) as new_tracks_today,
    (SELECT COUNT(*) FROM song_plays WHERE created_at >= CURRENT_DATE) as plays_today,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'title', t.title,
          'artist', COALESCE(a.name, 'Unknown Artist'),
          'play_count', t.play_count
        ) ORDER BY t.play_count DESC
      )
      FROM tracks t
      LEFT JOIN artists a ON t.artist_id = a.id
      WHERE t.play_count > 0
      LIMIT 10
    ) as top_tracks,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'total_plays', a.total_plays,
          'monthly_listeners', a.monthly_listeners
        ) ORDER BY a.total_plays DESC
      )
      FROM artists a
      WHERE a.total_plays > 0
      LIMIT 10
    ) as top_artists,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'display_name', u.display_name,
          'email', u.email,
          'role', u.role,
          'created_at', u.created_at
        ) ORDER BY u.created_at DESC
      )
      FROM users u
      LIMIT 10
    ) as recent_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user showcase status
CREATE OR REPLACE FUNCTION update_user_status(
  status_text text DEFAULT NULL,
  pinned_type text DEFAULT NULL,
  pinned_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Deactivate existing status
  UPDATE user_status 
  SET is_active = false 
  WHERE user_id = auth.uid();
  
  -- Insert new status if provided
  IF status_text IS NOT NULL OR pinned_type IS NOT NULL THEN
    INSERT INTO user_status (
      user_id, 
      status_text, 
      pinned_content_type, 
      pinned_content_id,
      is_active
    )
    VALUES (
      auth.uid(), 
      status_text, 
      pinned_type, 
      pinned_id,
      true
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users (respecting privacy)
CREATE OR REPLACE FUNCTION search_users(search_query text, limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  display_name text,
  profile_picture_url text,
  role text,
  is_private boolean,
  follower_count bigint,
  is_following boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.display_name,
    u.profile_picture_url,
    u.role,
    u.is_private,
    COALESCE(follower_stats.count, 0) as follower_count,
    COALESCE(follow_status.is_following, false) as is_following
  FROM users u
  LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM user_follows
    GROUP BY following_id
  ) follower_stats ON u.id = follower_stats.following_id
  LEFT JOIN (
    SELECT following_id, true as is_following
    FROM user_follows
    WHERE follower_id = auth.uid()
  ) follow_status ON u.id = follow_status.following_id
  WHERE 
    u.display_name ILIKE '%' || search_query || '%'
    OR u.first_name ILIKE '%' || search_query || '%'
    OR u.last_name ILIKE '%' || search_query || '%'
  ORDER BY 
    CASE WHEN u.is_private THEN 1 ELSE 0 END,
    follower_stats.count DESC NULLS LAST,
    u.display_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update playlists table to have proper RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlists
CREATE POLICY "Users can view public playlists or own playlists"
  ON playlists
  FOR SELECT
  TO public
  USING (
    is_public = true 
    OR user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = playlists.user_id 
        AND users.is_private = false
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = auth.uid() 
        AND following_id = playlists.user_id
      )
    )
  );

CREATE POLICY "Users can manage own playlists"
  ON playlists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable RLS on playlist_tracks
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view playlist tracks based on playlist access"
  ON playlist_tracks
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_tracks.playlist_id
      AND (
        p.is_public = true 
        OR p.user_id = auth.uid()
        OR (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = p.user_id 
            AND users.is_private = false
          )
        )
        OR (
          EXISTS (
            SELECT 1 FROM user_follows 
            WHERE follower_id = auth.uid() 
            AND following_id = p.user_id
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage own playlist tracks"
  ON playlist_tracks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_tracks.playlist_id
      AND p.user_id = auth.uid()
    )
  );

-- Log completion using DO block instead of RAISE LOG
DO $$
BEGIN
  PERFORM 1;
  -- Log is inside a DO block, which is valid
END $$;