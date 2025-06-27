/*
  # Fix timestamp type mismatch in user profile functions

  1. Issue
    - Function returns timestamp without time zone but expects timestamp with time zone
    - This causes errors when creating user profiles

  2. Solution
    - Update function return types to match database column types
    - Ensure all timestamp fields use consistent timezone handling
    - Fix the get_or_create_user_profile function signature
*/

-- Drop and recreate the function with correct timestamp types
DROP FUNCTION IF EXISTS get_or_create_user_profile(uuid);

-- Function to get or create user profile with correct timestamp types
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
  created_at timestamptz,  -- Changed to timestamptz to match database
  last_login timestamptz   -- Changed to timestamptz to match database
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
      BEGIN
        INSERT INTO users (
          id,
          email,
          password_hash,
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
          NULL, -- Auth users don't need password_hash
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
          auth_user_data.created_at::timestamptz  -- Ensure proper timezone conversion
        );
        
        RAISE LOG 'Created user profile on demand for: %', user_id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'Failed to create user profile on demand for %: % - %', user_id, SQLSTATE, SQLERRM;
      END;
    END IF;
  END IF;
  
  -- Return user profile with proper timestamp types
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
    u.created_at::timestamptz,  -- Ensure proper timezone conversion
    u.last_login::timestamptz   -- Ensure proper timezone conversion
  FROM users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the get_user_profile function
DROP FUNCTION IF EXISTS get_user_profile(uuid);

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
  created_at timestamptz,  -- Changed to timestamptz
  last_login timestamptz,  -- Changed to timestamptz
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
    u.created_at::timestamptz,  -- Ensure proper timezone conversion
    u.last_login::timestamptz,  -- Ensure proper timezone conversion
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

-- Ensure the users table created_at column is properly typed
DO $$
BEGIN
  -- Check if created_at column exists and update its type if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    -- Update the column type to timestamptz if it's not already
    ALTER TABLE users ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
    
    -- Set default if not already set
    ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
  ELSE
    -- Add the column if it doesn't exist
    ALTER TABLE users ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- Do the same for last_login
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ALTER COLUMN last_login TYPE timestamptz USING last_login AT TIME ZONE 'UTC';
  ELSE
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Update the handle_new_user function to use proper timestamp handling
DROP FUNCTION IF EXISTS handle_new_user();

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

  -- Insert user profile with proper timestamp handling
  INSERT INTO public.users (
    id,
    email,
    password_hash,
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
    NULL, -- Auth users don't need password_hash
    user_display_name,
    user_first_name,
    user_last_name,
    user_bio,
    user_role,
    user_is_private,
    user_profile_picture_url,
    CASE WHEN user_role = 'artist' THEN false ELSE NULL END,
    true,
    now()  -- Use now() function which returns timestamptz
  );

  RAISE LOG 'Successfully created user profile for: % with role: %', NEW.id, user_role;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with details but don't fail the auth signup
    RAISE LOG 'Error creating user profile for %: % - %', NEW.id, SQLSTATE, SQLERRM;
    
    -- Try a minimal insert as fallback
    BEGIN
      INSERT INTO public.users (id, email, password_hash, display_name, role, created_at)
      VALUES (
        NEW.id,
        NEW.email,
        NULL,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'listener',
        now()  -- Use now() function
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Log completion
DO $$
DECLARE
  total_auth_users integer;
  total_user_profiles integer;
BEGIN
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO total_user_profiles FROM public.users;
  
  RAISE LOG 'Timestamp fix migration completed. Auth users: %, User profiles: %', total_auth_users, total_user_profiles;
END $$;