-- Clear Mock Data Script
-- Run this to remove all mock/sample data from your database

-- Delete in reverse order to respect foreign key constraints
DELETE FROM user_analytics;
DELETE FROM play_history;
DELETE FROM user_likes;
DELETE FROM user_follows;
DELETE FROM playlist_tracks;
DELETE FROM playlists;
DELETE FROM tracks;
DELETE FROM albums;
DELETE FROM artists;
DELETE FROM users;

-- Reset sequences if using auto-incrementing IDs (PostgreSQL specific)
-- Note: Since we're using UUIDs, this isn't necessary, but included for completeness
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE artists_id_seq RESTART WITH 1;
-- ALTER SEQUENCE albums_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tracks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE playlists_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'artists', COUNT(*) FROM artists
UNION ALL
SELECT 'albums', COUNT(*) FROM albums
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'playlists', COUNT(*) FROM playlists
UNION ALL
SELECT 'playlist_tracks', COUNT(*) FROM playlist_tracks
UNION ALL
SELECT 'user_likes', COUNT(*) FROM user_likes
UNION ALL
SELECT 'user_follows', COUNT(*) FROM user_follows
UNION ALL
SELECT 'play_history', COUNT(*) FROM play_history
UNION ALL
SELECT 'user_analytics', COUNT(*) FROM user_analytics;