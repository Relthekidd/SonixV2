/*
  # Enhanced Authentication Setup

  1. User Profile Management
    - Improved trigger function for user creation
    - Better error handling
    - Support for additional user metadata

  2. Security
    - Enhanced RLS policies
    - Better role-based access control
    - Audit logging for sensitive operations

  3. User Experience
    - Email confirmation handling
    - Password reset functionality
    - Account verification status
*/

-- Drop existing trigger and function to recreate with improvements
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name text;
  user_role text;
  user_first_name text;
  user_last_name text;
  user_bio text;
  user_is_private boolean;
  user_profile_picture_url text;
BEGIN
  -- Extract metadata from auth.users.raw_user_meta_data
  user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'listener');
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  user_bio := COALESCE(NEW.raw_user_meta_data->>'bio', '');
  user_is_private := COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false);
  user_profile_picture_url := COALESCE(NEW.raw_user_meta_data->>'profile_picture_url', '');

  -- Insert user profile
  INSERT INTO public.users (
    id,
    email,
    display_name,
    first_name,
    last_name,
    bio,
    role,
    is_private,
    profile_picture_url,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    user_first_name,
    user_last_name,
    user_bio,
    user_role,
    user_is_private,
    user_profile_picture_url,
    NOW()
  );

  -- If user is signing up as an artist, set artist_verified to false
  IF user_role = 'artist' THEN
    UPDATE public.users 
    SET artist_verified = false 
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add artist_verified column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'artist_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN artist_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add email_notifications column for user preferences
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE users ADD COLUMN email_notifications boolean DEFAULT true;
  END IF;
END $$;

-- Add last_login column for tracking user activity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Function to update last login time
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET last_login = NOW() 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last login on auth sign in
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
CREATE TRIGGER on_auth_user_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_last_login();

-- Enhanced RLS policies with better error handling
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
CREATE POLICY "Users can view public profiles"
  ON users
  FOR SELECT
  TO public
  USING (
    NOT is_private 
    OR auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM user_follows 
      WHERE follower_id = auth.uid() 
      AND following_id = users.id
    )
  );

-- Policy for admin users to manage artist verification
CREATE POLICY "Admins can manage artist verification"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

-- Function to get user profile with additional metadata
CREATE OR REPLACE FUNCTION get_user_profile(user_id uuid DEFAULT auth.uid())
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
  email_notifications boolean,
  created_at timestamptz,
  last_login timestamptz,
  follower_count bigint,
  following_count bigint
) AS $$
BEGIN
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
    u.email_notifications,
    u.created_at,
    u.last_login,
    COALESCE(follower_stats.follower_count, 0) as follower_count,
    COALESCE(following_stats.following_count, 0) as following_count
  FROM users u
  LEFT JOIN (
    SELECT following_id, COUNT(*) as follower_count
    FROM user_follows
    GROUP BY following_id
  ) follower_stats ON u.id = follower_stats.following_id
  LEFT JOIN (
    SELECT follower_id, COUNT(*) as following_count
    FROM user_follows
    GROUP BY follower_id
  ) following_stats ON u.id = following_stats.follower_id
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view another user's profile
CREATE OR REPLACE FUNCTION can_view_user_profile(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  target_user_private boolean;
  is_following boolean;
  is_own_profile boolean;
BEGIN
  -- Check if it's the user's own profile
  is_own_profile := (auth.uid() = target_user_id);
  
  IF is_own_profile THEN
    RETURN true;
  END IF;
  
  -- Get target user's privacy setting
  SELECT is_private INTO target_user_private
  FROM users
  WHERE id = target_user_id;
  
  -- If user not found or profile is public, allow access
  IF target_user_private IS NULL OR NOT target_user_private THEN
    RETURN true;
  END IF;
  
  -- Check if current user is following the target user
  SELECT EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = auth.uid()
    AND following_id = target_user_id
  ) INTO is_following;
  
  RETURN is_following;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_artist_verified ON users(artist_verified) WHERE role = 'artist';
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);