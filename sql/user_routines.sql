-- User Routines: Stores per-user customizations for Push/Pull/Leg routines
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  routine_type TEXT NOT NULL,  -- 'PUSH', 'PULL', 'LEG'
  exercises_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, routine_type)
);

-- Enable RLS
ALTER TABLE user_routines ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own routines
CREATE POLICY "Users can view own routines"
  ON user_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
  ON user_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON user_routines FOR UPDATE
  USING (auth.uid() = user_id);
