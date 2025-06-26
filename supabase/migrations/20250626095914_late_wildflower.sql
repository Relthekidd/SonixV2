/*
  # Authentication Flow Redesign

  1. RLS Policies
    - Enable RLS on users table
    - Allow users to view their own profile
    - Allow users to update their own profile
    - Allow service role to manage users
    - Allow anonymous registration during signup
    - Allow public read access for non-private profiles

  2. Security
    - Proper RLS policies for user data protection
    - Role-based access control
    - Privacy settings support
*/

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous registration" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Allow insert for service role" ON users;
DROP POLICY IF EXISTS "Allow read for all" ON users;
DROP POLICY IF EXISTS "Allow user to update own profile" ON users;
DROP POLICY IF EXISTS "Users can read public or own profiles" ON users;

-- Policy: Allow service role full access (for auth triggers and admin operations)
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Policy: Allow anonymous users to insert during signup
CREATE POLICY "Allow anonymous signup"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert with their own ID
CREATE POLICY "Users can insert themselves"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Allow users to view public profiles
CREATE POLICY "Users can view public profiles"
  ON users
  FOR SELECT
  TO public
  USING (NOT is_private OR auth.uid() = id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'listener'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
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
  created_at timestamptz
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
    u.created_at
  FROM users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;