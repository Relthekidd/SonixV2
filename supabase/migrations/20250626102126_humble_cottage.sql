/*
  # Admin Setup Migration

  1. Security
    - Create secure function to promote first user to admin
    - Add admin check functions
    - Ensure only the first registered user can become admin automatically

  2. Functions
    - `promote_first_user_to_admin()` - Automatically makes the first user admin
    - `is_admin(user_id)` - Check if user is admin
    - `get_admin_users()` - Get list of admin users

  3. Triggers
    - Automatically promote first user to admin on registration
*/

-- Function to check if any admin users exist
CREATE OR REPLACE FUNCTION admin_users_exist()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote first user to admin
CREATE OR REPLACE FUNCTION promote_first_user_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only promote to admin if no admin users exist yet
  IF NOT admin_users_exist() THEN
    UPDATE users 
    SET role = 'admin' 
    WHERE id = NEW.id;
    
    RAISE LOG 'First user % promoted to admin', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically promote first user to admin
DROP TRIGGER IF EXISTS promote_first_user_to_admin_trigger ON users;
CREATE TRIGGER promote_first_user_to_admin_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION promote_first_user_to_admin();

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all admin users (admin only)
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz
) AS $$
BEGIN
  -- Only allow admins to see admin list
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.display_name,
    u.created_at
  FROM users u
  WHERE u.role = 'admin'
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually promote user to admin (admin only)
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only allow existing admins to promote other users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE users 
  SET role = 'admin' 
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RAISE LOG 'User % promoted to admin by %', target_user_id, auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin to listener (admin only, cannot demote self)
CREATE OR REPLACE FUNCTION demote_admin_to_listener(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only allow existing admins to demote other users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Prevent self-demotion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  -- Ensure at least one admin remains
  IF (SELECT COUNT(*) FROM users WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot demote the last admin user';
  END IF;

  UPDATE users 
  SET role = 'listener' 
  WHERE id = target_user_id AND role = 'admin';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;
  
  RAISE LOG 'Admin % demoted to listener by %', target_user_id, auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policy for admin operations
CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create index for admin role lookups
CREATE INDEX IF NOT EXISTS idx_users_admin_role ON users(role) WHERE role = 'admin';

-- Log current admin status
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  RAISE LOG 'Current admin users count: %', admin_count;
END $$;