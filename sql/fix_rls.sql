-- Run this in Supabase SQL Editor to fix the RLS issue

-- 1. Drop the old policies
DROP POLICY IF EXISTS "Users can view own routines" ON user_routines;
DROP POLICY IF EXISTS "Users can insert own routines" ON user_routines;
DROP POLICY IF EXISTS "Users can update own routines" ON user_routines;

-- 2. Create a single, robust ALL policy
-- This fixes the issue where 'upsert' operations fail due to missing WITH CHECK clauses on UPDATE
CREATE POLICY "Users can manage own routines"
  ON user_routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
