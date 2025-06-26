/*
  # Add role column to users table

  1. Changes
    - Add `role` column to `users` table with default value 'listener'
    - Add check constraint to ensure valid role values
    - Update existing users to have 'listener' role if they don't have one
    - Keep the existing `profiles` table for backward compatibility

  2. Security
    - Maintain existing RLS policies on users table
    - Role column allows 'listener', 'admin', 'artist' values only

  3. Notes
    - This resolves the backend registration error where 'role' column was missing from users table
    - Existing profiles table remains intact for any existing functionality
*/

-- Add role column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'listener';
  END IF;
END $$;

-- Add check constraint for valid role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['listener'::text, 'admin'::text, 'artist'::text]));
  END IF;
END $$;

-- Update any existing users without a role to have 'listener' role
UPDATE users SET role = 'listener' WHERE role IS NULL;

-- Make role column not nullable now that all users have a role
ALTER TABLE users ALTER COLUMN role SET NOT NULL;