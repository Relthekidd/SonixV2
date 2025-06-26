/*
  # Fix user registration policies

  1. Security Changes
    - Drop existing conflicting policies safely
    - Create policies for anonymous registration
    - Ensure authenticated users can insert with their own ID
    - Maintain service role access

  2. Policies
    - Allow anonymous users to register (insert new users)
    - Allow authenticated users to insert with their own ID
    - Ensure service role has full access
*/

-- Drop all existing insert policies for users table to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous registration" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Allow insert for service role" ON users;
DROP POLICY IF EXISTS "Allow service role inserts" ON users;

-- Create policy for anonymous registration (signup)
CREATE POLICY "Allow anonymous registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy for authenticated users to insert with their own ID
CREATE POLICY "Users can insert themselves"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy for service role access
CREATE POLICY "Allow insert for service role"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);