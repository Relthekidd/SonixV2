-- Add scheduled publishing columns
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;
