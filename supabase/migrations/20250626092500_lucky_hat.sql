-- Add role column to users table with default value
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'listener';

-- Update any existing users without a role to have 'listener' role
UPDATE users SET role = 'listener' WHERE role IS NULL;

-- Make role column not nullable now that all users have a role
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Add check constraint for valid role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['listener'::text, 'admin'::text, 'artist'::text]));
  END IF;
END $$;