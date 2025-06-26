/*
  # Fix User Profile Creation

  1. Issues Fixed
    - User profiles not being created automatically after signup
    - Missing user data causing login redirect loops
    - Trigger function not handling all signup scenarios

  2. Changes
    - Enhanced trigger function with better error handling
    - Improved user profile creation logic
    - Added fallback mechanisms for missing profiles
    - Better handling of user metadata from auth signup

  3. Security
    - Maintains RLS policies
    - Ensures proper access controls
    - Handles edge cases safely
*/

-- Drop existing trigger and function to recreate with improvements
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Enhanced function to handle new user registration with better error handling
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
  existing_user_count integer;
BEGIN
  -- Log the signup attempt
  RAISE LOG 'Creating user profile for auth user: %', NEW.id;
  
  -- Check if user already exists in users table
  SELECT COUNT(*) INTO existing_user_count
  FROM public.users
  WHERE id = NEW.id;
  
  -- If user already exists, skip creation
  IF existing_user_count > 0 THEN
    RAISE LOG 'User profile already exists for: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Extract metadata from auth.users.raw_user_meta_data with safe defaults
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'displayName',
    split_part(NEW.email, '@', 1)
  );
  
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'listener'
  );
  
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'firstName',
    ''
  );
  
  user_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'lastName',
    ''
  );
  
  user_bio := COALESCE(
    NEW.raw_user_meta_data->>'bio',
    ''
  );
  
  user_is_private := COALESCE(
    (NEW.raw_user_meta_data->>'is_private')::boolean,
    (NEW.raw_user_meta_data->>'isPrivate')::boolean,
    false
  );
  
  user_profile_picture_url := COALESCE(
    NEW.raw_user_meta_data->>'profile_picture_url',
    NEW.raw_user_meta_data->>'profilePictureUrl',
    ''
  );

  -- Insert user profile with all necessary fields
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
    artist_verified,
    email_notifications,
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
    CASE WHEN user_role = 'artist' THEN false ELSE NULL END,
    true,
    NOW()
  );

  RAISE LOG 'Successfully created user profile for: % with role: %', NEW.id, user_role;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with details but don't fail the auth signup
    RAISE LOG 'Error creating user profile for %: % - %', NEW.id, SQLSTATE, SQLERRM;
    
    -- Try a minimal insert as fallback
    BEGIN
      INSERT INTO public.users (id, email, display_name, role, created_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'listener',
        NOW()
      );
      RAISE LOG 'Fallback user profile created for: %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Fallback user profile creation also failed for %: % - %', NEW.id, SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to manually create missing user profiles (for existing auth users)
CREATE OR REPLACE FUNCTION create_missing_user_profiles()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
  user_count integer;
BEGIN
  -- Find auth users without corresponding user profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Create user profile for each missing user
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
      artist_verified,
      email_notifications,
      created_at
    ) VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(
        auth_user.raw_user_meta_data->>'display_name',
        auth_user.raw_user_meta_data->>'displayName',
        split_part(auth_user.email, '@', 1)
      ),
      COALESCE(
        auth_user.raw_user_meta_data->>'first_name',
        auth_user.raw_user_meta_data->>'firstName',
        ''
      ),
      COALESCE(
        auth_user.raw_user_meta_data->>'last_name',
        auth_user.raw_user_meta_data->>'lastName',
        ''
      ),
      COALESCE(auth_user.raw_user_meta_data->>'bio', ''),
      COALESCE(auth_user.raw_user_meta_data->>'role', 'listener'),
      COALESCE(
        (auth_user.raw_user_meta_data->>'is_private')::boolean,
        (auth_user.raw_user_meta_data->>'isPrivate')::boolean,
        false
      ),
      COALESCE(
        auth_user.raw_user_meta_data->>'profile_picture_url',
        auth_user.raw_user_meta_data->>'profilePictureUrl',
        ''
      ),
      CASE 
        WHEN COALESCE(auth_user.raw_user_meta_data->>'role', 'listener') = 'artist' 
        THEN false 
        ELSE NULL 
      END,
      true,
      auth_user.created_at
    );
    
    RAISE LOG 'Created missing user profile for: %', auth_user.id;
  END LOOP;
  
  -- Get count of users created
  GET DIAGNOSTICS user_count = ROW_COUNT;
  RAISE LOG 'Created % missing user profiles', user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create any missing user profiles
SELECT create_missing_user_profiles();

-- Function to get or create user profile (fallback for frontend)
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_id uuid DEFAULT auth.uid())
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
  last_login timestamptz
) AS $$
DECLARE
  user_exists boolean;
  auth_user_data RECORD;
BEGIN
  -- Check if user profile exists
  SELECT EXISTS (
    SELECT 1 FROM users WHERE users.id = user_id
  ) INTO user_exists;
  
  -- If user doesn't exist, try to create it from auth data
  IF NOT user_exists THEN
    -- Get auth user data
    SELECT au.email, au.raw_user_meta_data, au.created_at
    INTO auth_user_data
    FROM auth.users au
    WHERE au.id = user_id;
    
    -- If auth user exists, create profile
    IF FOUND THEN
      INSERT INTO users (
        id,
        email,
        display_name,
        first_name,
        last_name,
        bio,
        role,
        is_private,
        profile_picture_url,
        artist_verified,
        email_notifications,
        created_at
      ) VALUES (
        user_id,
        auth_user_data.email,
        COALESCE(
          auth_user_data.raw_user_meta_data->>'display_name',
          auth_user_data.raw_user_meta_data->>'displayName',
          split_part(auth_user_data.email, '@', 1)
        ),
        COALESCE(
          auth_user_data.raw_user_meta_data->>'first_name',
          auth_user_data.raw_user_meta_data->>'firstName',
          ''
        ),
        COALESCE(
          auth_user_data.raw_user_meta_data->>'last_name',
          auth_user_data.raw_user_meta_data->>'lastName',
          ''
        ),
        COALESCE(auth_user_data.raw_user_meta_data->>'bio', ''),
        COALESCE(auth_user_data.raw_user_meta_data->>'role', 'listener'),
        COALESCE(
          (auth_user_data.raw_user_meta_data->>'is_private')::boolean,
          (auth_user_data.raw_user_meta_data->>'isPrivate')::boolean,
          false
        ),
        COALESCE(
          auth_user_data.raw_user_meta_data->>'profile_picture_url',
          auth_user_data.raw_user_meta_data->>'profilePictureUrl',
          ''
        ),
        CASE 
          WHEN COALESCE(auth_user_data.raw_user_meta_data->>'role', 'listener') = 'artist' 
          THEN false 
          ELSE NULL 
        END,
        true,
        auth_user_data.created_at
      );
      
      RAISE LOG 'Created user profile on demand for: %', user_id;
    END IF;
  END IF;
  
  -- Return user profile
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
    u.last_login
  FROM users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all required columns exist with proper defaults
DO $$ 
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'artist_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN artist_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE users ADD COLUMN email_notifications boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE users ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE users ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE users ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- Update any existing users to have proper defaults
UPDATE users 
SET 
  artist_verified = COALESCE(artist_verified, CASE WHEN role = 'artist' THEN false ELSE NULL END),
  email_notifications = COALESCE(email_notifications, true),
  is_private = COALESCE(is_private, false),
  first_name = COALESCE(first_name, ''),
  last_name = COALESCE(last_name, ''),
  profile_picture_url = COALESCE(profile_picture_url, '')
WHERE 
  artist_verified IS NULL 
  OR email_notifications IS NULL 
  OR is_private IS NULL 
  OR first_name IS NULL 
  OR last_name IS NULL 
  OR profile_picture_url IS NULL;

-- Log completion
DO $$
DECLARE
  total_auth_users integer;
  total_user_profiles integer;
BEGIN
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO total_user_profiles FROM public.users;
  
  RAISE LOG 'Migration completed. Auth users: %, User profiles: %', total_auth_users, total_user_profiles;
END $$;