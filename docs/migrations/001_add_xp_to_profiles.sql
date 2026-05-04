-- Migration: Add XP column to profiles table
-- Date: 2026-05-04
-- Description: Adds an `xp` (experience points) column to track user rankings

ALTER TABLE profiles
ADD COLUMN xp INTEGER DEFAULT 0;

-- Create an index on xp for efficient sorting in leaderboards
CREATE INDEX idx_profiles_xp_desc ON profiles(xp DESC);

-- (Optional) Add a trigger to auto-increment XP based on completed runs
-- This is just a template - adjust based on your run completion logic
-- CREATE OR REPLACE FUNCTION increment_user_xp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE profiles
--   SET xp = xp + NEW.distance  -- Or whatever XP calculation you want
--   WHERE id = NEW.user_id;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER on_run_complete_increment_xp
-- AFTER INSERT ON runs
-- FOR EACH ROW
-- EXECUTE FUNCTION increment_user_xp();
