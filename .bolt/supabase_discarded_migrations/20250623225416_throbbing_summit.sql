/*
  # Clear Mock Data Migration

  This migration clears existing mock/sample data from the database.
  It only operates on tables that exist in the current Supabase schema.

  ## Tables affected:
  - profiles (preserves current authenticated user)
  - subscription_plans
  - tracks
  - feature_flags
  - products

  ## Safety measures:
  - Preserves the current authenticated user's profile
  - Only deletes from tables that exist in the schema
  - Provides verification counts after deletion
*/

-- Clear data from tables that exist in the schema
-- Delete in reverse order to respect foreign key constraints

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
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM feature_flags
UNION ALL
SELECT 'products', COUNT(*) FROM products
ORDER BY table_name;