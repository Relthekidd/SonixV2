/*
  # Fix User Registration RLS Policy

  1. Security Updates
    - Add policy to allow anonymous users to register
    - Ensure service role can still insert users
    - Maintain existing read policies

  2. Changes
    - Add "Allow anonymous registration" policy for INSERT operations
    - Keep existing policies intact for backward compatibility
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
CREATE POLICY "Users can insert themselves"
  ON users
  FOR INSERT
  TO authenticated
  USING (auth.uid() = id)
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