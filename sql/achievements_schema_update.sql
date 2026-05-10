-- ============================================================================
-- Achievements System Schema Update
-- Migration: Add user_stats table and earned_achievements column
-- ============================================================================
-- Run this migration in your Supabase SQL editor.

-- 1. Add earned_achievements column to completed_routines
--    Stores an array of achievement IDs unlocked during that specific workout
ALTER TABLE completed_routines
  ADD COLUMN IF NOT EXISTS earned_achievements TEXT[] DEFAULT '{}';

-- 2. Create user_stats table to track lifetime exercise totals efficiently
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_workouts INTEGER DEFAULT 0,
  exercise_totals JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS and create policies for user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stats"
  ON user_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT * FROM user_stats;
-- SELECT earned_achievements FROM completed_routines LIMIT 1;
