/*
  # Clear Mock Data Migration

  This migration safely clears any existing mock/sample data from the database.
  It only references tables that actually exist in the Supabase schema.

  ## What it does
  1. Clears data from existing tables in proper order to respect foreign key constraints
  2. Preserves the current authenticated user's profile
  3. Provides a verification query to confirm tables are cleared

  ## Tables cleared
  - purchases
  - user_subscriptions  
  - profiles (except current user)
  - subscription_plans
  - tracks
  - feature_flags
  - products
*/

-- Clear data from tables that exist in the schema
-- Delete in reverse order to respect foreign key constraints

-- Clear purchases first (has foreign keys to products and users)
DELETE FROM purchases;

-- Clear user subscriptions (has foreign key to subscription_plans and profiles)
DELETE FROM user_subscriptions;

-- Clear profiles except the current authenticated user (if any)
-- Use a safe approach that works even if no user is authenticated
DELETE FROM profiles 
WHERE id NOT IN (
  SELECT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Clear standalone tables (no foreign key dependencies)
DELETE FROM subscription_plans;
DELETE FROM tracks;
DELETE FROM feature_flags;
DELETE FROM products;

-- Verify tables are cleared
-- This will show the count of remaining records in each table
SELECT 'profiles' as table_name, COUNT(*) as remaining_count FROM profiles
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
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