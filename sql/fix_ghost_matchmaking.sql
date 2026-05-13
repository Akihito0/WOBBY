-- ============================================================
-- FIX GHOST MATCHMAKING RECORDS (v2)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- STEP 1: Purge ALL existing ghost records

-- Delete stale 'waiting' and 'cancelled' rows (any age)
DELETE FROM versus_battles
WHERE status IN ('waiting', 'cancelled');

-- Delete 'matched' rows that were never actually played
-- (neither player accepted, or only one accepted, and it's old)
DELETE FROM versus_battles
WHERE status = 'matched'
  AND (player1_accepted = FALSE OR player2_accepted = FALSE)
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Delete 'active' rows that were never played (0 reps, 0 time)
DELETE FROM versus_battles
WHERE status = 'active'
  AND (player1_time IS NULL OR player1_time = 0)
  AND (player2_time IS NULL OR player2_time = 0)
  AND (player1_reps IS NULL OR player1_reps = 0)
  AND (player2_reps IS NULL OR player2_reps = 0)
  AND created_at < NOW() - INTERVAL '5 minutes';

-- STEP 2: Create/replace the RPC function for client-side cleanup
-- This cleans up any stale records belonging to a specific user
CREATE OR REPLACE FUNCTION cleanup_stale_workout_matches(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete any waiting/cancelled rows where this user is player1
  DELETE FROM versus_battles
  WHERE player1_id = p_user_id
    AND status IN ('waiting', 'cancelled');

  -- Delete any waiting/cancelled rows where this user is player2
  DELETE FROM versus_battles
  WHERE player2_id = p_user_id
    AND status IN ('waiting', 'cancelled');

  -- Clean up abandoned 'matched' rows for this user (neither accepted)
  DELETE FROM versus_battles
  WHERE (player1_id = p_user_id OR player2_id = p_user_id)
    AND status = 'matched'
    AND (player1_accepted = FALSE OR player2_accepted = FALSE)
    AND created_at < NOW() - INTERVAL '2 minutes';

  -- Also clean up global stale records older than 5 minutes
  DELETE FROM versus_battles
  WHERE status IN ('waiting', 'cancelled')
    AND created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_stale_workout_matches(UUID) TO authenticated;
