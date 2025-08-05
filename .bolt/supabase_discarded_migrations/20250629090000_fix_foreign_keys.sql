-- Remove redundant foreign keys and add missing ones
-- Ensure each relationship has a single well-named constraint

-- Drop duplicate foreign keys on liked_songs
ALTER TABLE liked_songs DROP CONSTRAINT IF EXISTS liked_songs_track_id_fkey1;
ALTER TABLE liked_songs DROP CONSTRAINT IF EXISTS liked_songs_track_id_fkey2;
ALTER TABLE liked_songs DROP CONSTRAINT IF EXISTS liked_songs_track_id_fkey;
ALTER TABLE liked_songs ADD CONSTRAINT fk_liked_songs_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

-- Drop duplicate foreign keys on playlist_tracks
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey1;
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;
ALTER TABLE playlist_tracks ADD CONSTRAINT fk_playlist_tracks_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_playlist_id_fkey1;
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_playlist_id_fkey;
ALTER TABLE playlist_tracks ADD CONSTRAINT fk_playlist_tracks_playlist FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;

-- Ensure albums reference artists
ALTER TABLE albums ADD COLUMN IF NOT EXISTS artist_id uuid;
ALTER TABLE albums DROP CONSTRAINT IF EXISTS albums_artist_id_fkey;
ALTER TABLE albums ADD CONSTRAINT fk_albums_artist FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL;
