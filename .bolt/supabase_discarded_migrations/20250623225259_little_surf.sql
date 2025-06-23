-- Clear Mock Data Script
-- Run this to remove all mock/sample data from your database

-- Delete in reverse order to respect foreign key constraints
-- Only delete from tables that actually exist in the Supabase schema

DELETE FROM libraries;
DELETE FROM purchases;
DELETE FROM user_subscriptions;
DELETE FROM analytics_events;
DELETE FROM admin_users;

-- Clear any existing profiles data
DELETE FROM profiles WHERE id != auth.uid();

-- Verify tables are empty
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'libraries', COUNT(*) FROM libraries
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions
UNION ALL
SELECT 'analytics_events', COUNT(*) FROM analytics_events
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM feature_flags
UNION ALL
SELECT 'products', COUNT(*) FROM products;