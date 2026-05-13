-- ============================================================
-- FIX VERSUS RUN RESULTS: RLS + Foreign Key CASCADE Protection
-- Run this in your Supabase SQL Editor
-- ============================================================

-- STEP 1: Enable RLS on the table
ALTER TABLE versus_run_results ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop any existing policies
DROP POLICY IF EXISTS "Users can view run results" ON versus_run_results;
DROP POLICY IF EXISTS "Users can insert run results" ON versus_run_results;
DROP POLICY IF EXISTS "Users can update run results" ON versus_run_results;
DROP POLICY IF EXISTS "Users can manage own run results" ON versus_run_results;
DROP POLICY IF EXISTS "Users can insert their own run results" ON versus_run_results;
DROP POLICY IF EXISTS "Users can update their own run results" ON versus_run_results;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON versus_run_results;

-- STEP 3: Create permissive policies for authenticated users
-- SELECT: Users can view their own run results
CREATE POLICY "Users can view run results"
  ON versus_run_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- INSERT: Users can insert run results where they are a participant
CREATE POLICY "Users can insert run results"
  ON versus_run_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- UPDATE: Users can update run results where they are a participant
CREATE POLICY "Users can update run results"
  ON versus_run_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id)
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- STEP 4: Check if match_id has a CASCADE foreign key and fix it
-- First, find and drop any CASCADE foreign key on match_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find the constraint name for match_id foreign key
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'versus_run_results'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'match_id'
  LIMIT 1;

  -- If found, drop it and re-create WITHOUT cascade
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE versus_run_results DROP CONSTRAINT %I', fk_name);
    RAISE NOTICE 'Dropped CASCADE foreign key: %', fk_name;
    
    -- Re-add the foreign key with NO ACTION (no cascade delete)
    -- This prevents deleting versus_run_matchmaking from also deleting run results
    ALTER TABLE versus_run_results 
      ADD CONSTRAINT versus_run_results_match_id_fkey 
      FOREIGN KEY (match_id) 
      REFERENCES versus_run_matchmaking(match_id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE 'Re-created foreign key with ON DELETE SET NULL';
  ELSE
    RAISE NOTICE 'No foreign key found on match_id — no CASCADE to fix';
  END IF;
END $$;

-- STEP 5: Add a 'status' column if it doesn't exist (app writes status but column may be missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'versus_run_results' AND column_name = 'status'
  ) THEN
    ALTER TABLE versus_run_results ADD COLUMN status TEXT DEFAULT 'finished';
    RAISE NOTICE 'Added status column to versus_run_results';
  ELSE
    RAISE NOTICE 'status column already exists';
  END IF;
END $$;

-- STEP 6: Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'versus_run_results'
ORDER BY ordinal_position;
