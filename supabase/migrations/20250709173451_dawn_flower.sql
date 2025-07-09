/*
  # Artist Continuity Migration

  1. New Tables
    - Ensure artists table has proper structure
    - Add RLS policies for artist management
    - Update tracks and albums tables for artist references

  2. Security
    - Enable RLS on artists table
    - Add policies for authenticated users to create and view artists
    - Ensure proper permissions for linking artists to content

  3. Schema Updates
    - Ensure tracks and albums have proper artist_id references
    - Add featured_artist_ids array field for multiple artist support
    - Maintain backward compatibility with existing data
*/

-- Ensure artists table has proper structure
CREATE TABLE IF NOT EXISTS artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  profile_picture_url text
);

-- Enable RLS on artists table
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for artists
CREATE POLICY "Public read artists"
  ON artists
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create artists"
  ON artists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for artist name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_artists_name_gin ON artists USING gin (name gin_trgm_ops);

-- Ensure tracks table has proper artist references
DO $$
BEGIN
  -- Add artist_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'artist_id'
  ) THEN
    ALTER TABLE tracks ADD COLUMN artist_id uuid REFERENCES artists(id) ON DELETE CASCADE;
  END IF;

  -- Add featured_artist_ids column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'featured_artist_ids'
  ) THEN
    ALTER TABLE tracks ADD COLUMN featured_artist_ids uuid[];
  END IF;
END $$;

-- Ensure albums table has proper artist references
DO $$
BEGIN
  -- Add main_artist_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'albums' AND column_name = 'main_artist_id'
  ) THEN
    ALTER TABLE albums ADD COLUMN main_artist_id uuid REFERENCES artists(id) ON DELETE CASCADE;
  END IF;

  -- Add featured_artist_ids column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'albums' AND column_name = 'featured_artist_ids'
  ) THEN
    ALTER TABLE albums ADD COLUMN featured_artist_ids uuid[];
  END IF;
END $$;

-- Create function to find or create artist by name
CREATE OR REPLACE FUNCTION find_or_create_artist_by_name(artist_name text)
RETURNS uuid AS $$
DECLARE
  artist_id uuid;
BEGIN
  -- Try to find existing artist by name (case-insensitive)
  SELECT id INTO artist_id
  FROM artists
  WHERE lower(name) = lower(artist_name)
  LIMIT 1;
  
  -- If artist doesn't exist, create a new one
  IF artist_id IS NULL THEN
    INSERT INTO artists (name)
    VALUES (artist_name)
    RETURNING id INTO artist_id;
  END IF;
  
  RETURN artist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process multiple artist names
CREATE OR REPLACE FUNCTION process_artist_names(artist_names text[])
RETURNS uuid[] AS $$
DECLARE
  result uuid[] := '{}';
  artist_name text;
  artist_id uuid;
BEGIN
  -- Process each artist name
  FOREACH artist_name IN ARRAY artist_names
  LOOP
    -- Skip empty names
    IF artist_name IS NOT NULL AND trim(artist_name) != '' THEN
      -- Find or create artist
      artist_id := find_or_create_artist_by_name(trim(artist_name));
      -- Add to result array
      result := array_append(result, artist_id);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to migrate existing artist names to IDs
CREATE OR REPLACE FUNCTION migrate_artist_names_to_ids()
RETURNS void AS $$
DECLARE
  track_record RECORD;
  album_record RECORD;
  artist_id uuid;
  featured_ids uuid[];
BEGIN
  -- Migrate tracks
  FOR track_record IN 
    SELECT id, artist_name, featuring_artists
    FROM tracks
    WHERE artist_id IS NULL AND artist_name IS NOT NULL
  LOOP
    -- Process main artist
    artist_id := find_or_create_artist_by_name(track_record.artist_name);
    
    -- Process featured artists if any
    IF track_record.featuring_artists IS NOT NULL AND array_length(track_record.featuring_artists, 1) > 0 THEN
      featured_ids := process_artist_names(track_record.featuring_artists);
    ELSE
      featured_ids := NULL;
    END IF;
    
    -- Update track
    UPDATE tracks
    SET 
      artist_id = artist_id,
      featured_artist_ids = featured_ids
    WHERE id = track_record.id;
  END LOOP;
  
  -- Migrate albums
  FOR album_record IN 
    SELECT id, artist_name, featuring_artists
    FROM albums
    WHERE main_artist_id IS NULL AND artist_name IS NOT NULL
  LOOP
    -- Process main artist
    artist_id := find_or_create_artist_by_name(album_record.artist_name);
    
    -- Process featured artists if any
    IF album_record.featuring_artists IS NOT NULL AND array_length(album_record.featuring_artists, 1) > 0 THEN
      featured_ids := process_artist_names(album_record.featuring_artists);
    ELSE
      featured_ids := NULL;
    END IF;
    
    -- Update album
    UPDATE albums
    SET 
      main_artist_id = artist_id,
      featured_artist_ids = featured_ids
    WHERE id = album_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run migration for existing data
SELECT migrate_artist_names_to_ids();

-- Create function to update artist references when uploading tracks
CREATE OR REPLACE FUNCTION update_track_artist_references()
RETURNS TRIGGER AS $$
DECLARE
  artist_id uuid;
  featured_ids uuid[];
BEGIN
  -- If artist_id is not set but artist_name is provided
  IF NEW.artist_id IS NULL AND NEW.artist_name IS NOT NULL THEN
    -- Find or create artist
    artist_id := find_or_create_artist_by_name(NEW.artist_name);
    NEW.artist_id := artist_id;
  END IF;
  
  -- If featured_artist_ids is not set but featuring_artists is provided
  IF NEW.featured_artist_ids IS NULL AND NEW.featuring_artists IS NOT NULL AND array_length(NEW.featuring_artists, 1) > 0 THEN
    -- Process featured artists
    featured_ids := process_artist_names(NEW.featuring_artists);
    NEW.featured_artist_ids := featured_ids;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tracks
DROP TRIGGER IF EXISTS trigger_update_track_artist_references ON tracks;
CREATE TRIGGER trigger_update_track_artist_references
  BEFORE INSERT OR UPDATE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_track_artist_references();

-- Create function to update album artist references
CREATE OR REPLACE FUNCTION update_album_artist_references()
RETURNS TRIGGER AS $$
DECLARE
  artist_id uuid;
  featured_ids uuid[];
BEGIN
  -- If main_artist_id is not set but artist_name is provided
  IF NEW.main_artist_id IS NULL AND NEW.artist_name IS NOT NULL THEN
    -- Find or create artist
    artist_id := find_or_create_artist_by_name(NEW.artist_name);
    NEW.main_artist_id := artist_id;
  END IF;
  
  -- If featured_artist_ids is not set but featuring_artists is provided
  IF NEW.featured_artist_ids IS NULL AND NEW.featuring_artists IS NOT NULL AND array_length(NEW.featuring_artists, 1) > 0 THEN
    -- Process featured artists
    featured_ids := process_artist_names(NEW.featuring_artists);
    NEW.featured_artist_ids := featured_ids;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for albums
DROP TRIGGER IF EXISTS trigger_update_album_artist_references ON albums;
CREATE TRIGGER trigger_update_album_artist_references
  BEFORE INSERT OR UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_album_artist_references();

-- Create function to get artist name by ID
CREATE OR REPLACE FUNCTION get_artist_name_by_id(artist_id uuid)
RETURNS text AS $$
DECLARE
  artist_name text;
BEGIN
  SELECT name INTO artist_name
  FROM artists
  WHERE id = artist_id;
  
  RETURN artist_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get artist names from array of IDs
CREATE OR REPLACE FUNCTION get_artist_names_from_ids(artist_ids uuid[])
RETURNS text[] AS $$
DECLARE
  result text[] := '{}';
  artist_id uuid;
  artist_name text;
BEGIN
  -- Return empty array if input is null
  IF artist_ids IS NULL THEN
    RETURN result;
  END IF;
  
  -- Process each artist ID
  FOREACH artist_id IN ARRAY artist_ids
  LOOP
    SELECT name INTO artist_name
    FROM artists
    WHERE id = artist_id;
    
    IF artist_name IS NOT NULL THEN
      result := array_append(result, artist_name);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create extension for trigram matching if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;