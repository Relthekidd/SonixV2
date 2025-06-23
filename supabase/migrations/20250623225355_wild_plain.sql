/*
  # Clear Mock Data Migration

  This migration clears all existing data from the database tables to prepare for fresh data.
  Only operates on tables that actually exist in the current schema.

  ## Tables Cleared
  - user_subscriptions (references subscription_plans and profiles)
  - profiles (except current authenticated user)
  - subscription_plans
  - tracks
  - feature_flags
  - products

  ## Safety Features
  - Preserves current authenticated user profile
  - Respects foreign key constraints
  - Only operates on existing tables
*/

-- Clear data from tables that exist in the schema
-- Delete in reverse order to respect foreign key constraints

-- Clear user subscriptions first (has foreign key to subscription_plans and profiles)
DELETE FROM user_subscriptions;

-- Clear profiles except the current authenticated user (if any)
-- Use a safe approach that works even if no user is authenticated
DELETE FROM profiles 
WHERE id NOT IN (
  SELECT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Clear standalone tables (no foreign key dependencies from other tables)
DELETE FROM subscription_plans;
DELETE FROM tracks;
DELETE FROM feature_flags;
DELETE FROM products;

-- Verify tables are cleared
-- This will show the count of remaining records in each table
SELECT 'profiles' as table_name, COUNT(*) as remaining_count FROM profiles
UNION ALL
SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions
UNION ALL
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM feature_flags
UNION ALL
SELECT 'products', COUNT(*) FROM products
ORDER BY table_name;