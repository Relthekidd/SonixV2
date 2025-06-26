/*
  # Fix User Registration RLS Policies
  
  1. Purpose
     - Allow anonymous users to register (insert new user records)
     - Fix RLS policy violations during user registration
     - Maintain security for authenticated operations
  
  2. Changes
     - Drop existing restrictive insert policy
     - Add policy for anonymous registration
     - Add policy for authenticated user inserts
     - Ensure service role policy exists
  
  3. Security
     - Anonymous users can only INSERT during registration
     - Authenticated users can insert with proper ID matching
     - Service role maintains full access
*/

-- Drop the existing restrictive insert policy for authenticated users
DROP POLICY IF EXISTS "Users can insert themselves" ON users;

-- Add a policy that allows anonymous users to register (insert new users)
CREATE POLICY "Allow anonymous registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add a policy that allows authenticated users to insert with their own ID
-- Note: INSERT policies only support WITH CHECK, not USING
CREATE POLICY "Users can insert themselves"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the service role policy still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Allow insert for service role'
  ) THEN
    CREATE POLICY "Allow insert for service role"
      ON users
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;