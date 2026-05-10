-- ============================================================================
-- Solo Workout Schema Update
-- Migration: Add XP tracking, enriched stats, and workout type columns
-- to the completed_routines table
-- ============================================================================
-- Run this migration in your Supabase SQL editor.
-- 
-- Changes:
--   1. workout_type   — Distinguishes 'solo_workout' vs 'solo_run' (or future types)
--   2. xp_earned      — Total XP awarded for this session
--   3. xp_breakdown   — JSONB breakdown of how XP was calculated
--                        Example: { "base": 50, "rep_xp": 150, "set_xp": 75,
--                                   "duration_bonus": 50, "perfect_bonus": 100 }
--   4. total_sets_completed  — Quick-access count of completed sets
--   5. total_reps_completed  — Quick-access count of total reps performed
--
-- The existing exercises_data (JSONB) column will carry enriched per-set data:
--   {
--     "id": "1",
--     "name": "Push Ups",
--     "sets": [
--       {
--         "set": 1,
--         "weight": "Body Weight",
--         "reps": 10,
--         "status": "FINISHED",
--         "duration": 45,
--         "avgHR": 120,
--         "maxHR": 135
--       }
--     ]
--   }
-- ============================================================================

-- 1. Add workout_type column
--    Values: 'solo_workout' | 'solo_run' | future types
ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS workout_type TEXT NOT NULL DEFAULT 'solo_workout';

-- 2. Add XP tracking columns
ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;

ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS xp_breakdown JSONB DEFAULT '{}'::jsonb;

-- 3. Add quick-access stat columns
ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS total_sets_completed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS total_reps_completed INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- Verification: Check the updated table structure
-- ============================================================================
-- You can run this after the migration to verify:
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'completed_routines'
--   ORDER BY ordinal_position;
-- ============================================================================
