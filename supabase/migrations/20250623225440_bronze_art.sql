/*
  # Clear Mock Data Migration
  
  1. Purpose
     - Remove all existing mock/sample data from the database
     - Prepare database for fresh data or production use
     - Only operate on tables that actually exist in the schema
  
  2. Tables Affected
     - `libraries` - User music libraries
     - `purchases` - User purchase records  
     - `analytics_events` - Analytics tracking data
     - `admin_users` - Admin user records
     - `subscription_plans` - Available subscription plans
     - `tracks` - Music tracks
     - `feature_flags` - Feature toggle flags
     - `products` - Available products
     - `user_subscriptions` - User subscription records
  
  3. Safety
     - Uses IF EXISTS checks to prevent errors
     - Deletes in proper order to respect foreign key constraints
     - Provides verification query to confirm cleanup
*/

-- Clear data from tables that exist in the schema
-- Delete in reverse order to respect foreign key constraints

-- Clear tables with foreign key dependencies first
DO $$
BEGIN
  -- Clear libraries (has foreign keys to tracks and profiles)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'libraries') THEN
    DELETE FROM libraries;
  END IF;
  
  -- Clear purchases (has foreign keys to products and users)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchases') THEN
    DELETE FROM purchases;
  END IF;
  
  -- Clear user subscriptions (has foreign key to subscription_plans and profiles)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    DELETE FROM user_subscriptions;
  END IF;
  
  -- Clear analytics events (has foreign key to profiles)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    DELETE FROM analytics_events;
  END IF;
  
  -- Clear admin users (has foreign key to profiles)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    DELETE FROM admin_users;
  END IF;
  
  -- Clear standalone tables (no foreign key dependencies from other tables)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    DELETE FROM subscription_plans;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tracks') THEN
    DELETE FROM tracks;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    DELETE FROM feature_flags;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DELETE FROM products;
  END IF;
END $$;

-- Verify tables are cleared
-- This will show the count of remaining records in each table that exists
DO $$
DECLARE
  result_text TEXT := '';
BEGIN
  -- Build verification query dynamically for existing tables only
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'libraries') THEN
    SELECT result_text || 'libraries: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM libraries;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchases') THEN
    SELECT result_text || 'purchases: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM purchases;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    SELECT result_text || 'user_subscriptions: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM user_subscriptions;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    SELECT result_text || 'analytics_events: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM analytics_events;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    SELECT result_text || 'admin_users: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM admin_users;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    SELECT result_text || 'subscription_plans: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM subscription_plans;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tracks') THEN
    SELECT result_text || 'tracks: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM tracks;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    SELECT result_text || 'feature_flags: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM feature_flags;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    SELECT result_text || 'products: ' || COUNT(*)::TEXT || E'\n' INTO result_text FROM products;
  END IF;
  
  -- Output the results
  RAISE NOTICE 'Table record counts after cleanup:%', E'\n' || result_text;
END $$;