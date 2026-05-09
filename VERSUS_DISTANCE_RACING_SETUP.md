# Versus Distance-Based Racing Implementation

## Summary of Changes

This update transforms the versus racing system to include:

- **Distance Selection Modal**: Users choose 1km, 3km, or 5km before matchmaking
- **Distance-Based Matching**: Only users selecting the same distance are matched together
- **Target Distance Tracking**: Race ends automatically when one user reaches the target
- **Win Conditions**:
  - If one reaches target first → They win
  - If both reach target → Fastest time wins
  - If neither reaches target → Whoever has most distance wins
- **Race Results Table**: Stores full race data including winner determination

## Files Modified

### New Components

- `src/components/DistanceSelectionModal.tsx` - Distance selection UI (1km, 3km, 5km)

### Updated Components

- `src/components/MatchFoundModal.tsx` - Shows target distance in match found modal
- `src/pages/VersusWorkout.tsx` - Shows distance selection before matchmaking
- `src/pages/VersusRunScreen.tsx` - Tracks target distance, detects when reached, determines winner
- `src/services/useVersusMatchmaking.ts` - Passes target distance to RPC and tracks it in state

## SQL Migrations Required

Run these commands in Supabase SQL Editor:

```sql
-- 1. Add target_distance column to versus_matchmaking
ALTER TABLE public.versus_matchmaking
ADD COLUMN target_distance INTEGER DEFAULT 1;

-- 2. Allow reading opponent's record (for acceptance polling)
CREATE POLICY "Allow reading if we are the opponent"
ON public.versus_matchmaking
FOR SELECT
USING (auth.uid() = opponent_id);

-- 3. Create versus_run_results table
CREATE TABLE public.versus_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  user_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_distance INTEGER NOT NULL,
  user_1_distance NUMERIC(10, 3) DEFAULT 0,
  user_2_distance NUMERIC(10, 3) DEFAULT 0,
  user_1_time INTEGER DEFAULT 0,
  user_2_time INTEGER DEFAULT 0,
  user_1_reached_target BOOLEAN DEFAULT FALSE,
  user_2_reached_target BOOLEAN DEFAULT FALSE,
  user_1_finished BOOLEAN DEFAULT FALSE,
  user_2_finished BOOLEAN DEFAULT FALSE,
  winner_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 4. Enable RLS on versus_run_results
ALTER TABLE public.versus_run_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read results involving them"
ON public.versus_run_results
FOR SELECT
USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can update results involving them"
ON public.versus_run_results
FOR UPDATE
USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can insert results"
ON public.versus_run_results
FOR INSERT
WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- 5. Update find_or_join_match RPC to support target_distance and create results
-- Use SECURITY DEFINER so the atomic insert/update logic is not blocked by RLS
DROP FUNCTION IF EXISTS public.find_or_join_match(integer) CASCADE;

CREATE OR REPLACE FUNCTION public.find_or_join_match(p_target_distance INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  opponent_record RECORD;
  match_id_val UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is already waiting
  IF EXISTS (
    SELECT 1 FROM versus_matchmaking
    WHERE user_id = current_user_id AND status = 'waiting'
  ) THEN
    RETURN JSON_BUILD_OBJECT('status', 'already_waiting');
  END IF;

  -- Try to find a waiting opponent with same target distance
  SELECT * INTO opponent_record FROM versus_matchmaking
  WHERE
    status = 'waiting'
    AND target_distance = p_target_distance
    AND user_id != current_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- If found opponent
  IF opponent_record.id IS NOT NULL THEN
    match_id_val := gen_random_uuid();

    -- Update opponent record to matched
    UPDATE versus_matchmaking
    SET
      status = 'matched',
      opponent_id = current_user_id,
      match_id = match_id_val,
      user_accepted = FALSE
    WHERE id = opponent_record.id;

    -- Insert current user's record as matched
    INSERT INTO versus_matchmaking (
      user_id, status, opponent_id, match_id, target_distance, user_accepted
    ) VALUES (
      current_user_id, 'matched', opponent_record.user_id, match_id_val, p_target_distance, FALSE
    );

    -- Create race result record
    INSERT INTO versus_run_results (
      match_id,
      user_1_id,
      user_2_id,
      target_distance
    ) VALUES (
      match_id_val,
      opponent_record.user_id,
      current_user_id,
      p_target_distance
    );

    RETURN JSON_BUILD_OBJECT(
      'status', 'matched',
      'opponent_id', opponent_record.user_id,
      'match_id', match_id_val,
      'target_distance', p_target_distance
    );
  ELSE
    -- No opponent found, insert waiting record
    INSERT INTO versus_matchmaking (
      user_id, status, target_distance, user_accepted
    ) VALUES (
      current_user_id, 'waiting', p_target_distance, FALSE
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN JSON_BUILD_OBJECT(
      'status', 'waiting',
      'target_distance', p_target_distance
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.find_or_join_match(integer) TO authenticated;
```

## Testing Checklist

- [ ] Run all SQL migrations in Supabase
- [ ] Rebuild app: `npm run android`
- [ ] Test distance selection modal shows all 3 options
- [ ] Test matchmaking with same distance (1km vs 1km should match)
- [ ] Test matchmaking with different distances doesn't match
- [ ] Test acceptance listener works with polling fallback
- [ ] Test user reaching target distance shows alert
- [ ] Test finish logic determines correct winner
- [ ] Test both users must finish to see results
- [ ] Test race results are saved correctly

## Usage Flow

1. User clicks "RUN" on Versus Workout screen
2. Distance Selection Modal appears (1km, 3km, 5km)
3. User selects distance
4. Matchmaking starts (only matches users with same distance)
5. Both users see MatchFoundModal with target distance displayed
6. Both accept (30-second countdown)
7. Both navigate to VersusRunScreen with target distance
8. Race begins automatically
9. When user reaches target or presses finish:
   - If opponent hasn't finished: "Waiting for opponent..."
   - If opponent finished: Results shown with winner
10. Both results saved to runs table

## Win Determination Logic

```
if (user reached target AND opponent didn't):
  → User wins
else if (opponent reached target AND user didn't):
  → Opponent wins
else if (both reached target):
  → Whoever was faster wins (by time)
else (neither reached target):
  → Whoever ran more distance wins
```
