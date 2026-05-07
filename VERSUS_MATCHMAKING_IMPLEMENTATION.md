# Versus Matchmaking Implementation Guide

## Overview
This documents the integration of the versus matchmaking system using RPC calls and Realtime listeners.

## Database Setup
You've already created the following in Supabase SQL editor:
- `versus_matchmaking` table with columns: id, user_id, status, opponent_id, match_id, created_at
- RLS policies for secure access
- `find_or_join_match()` RPC function

## Implementation Files

### 1. Custom Hook: `useVersusMatchmaking.ts`
**Location**: `src/services/useVersusMatchmaking.ts`

**Features**:
- Calls the `find_or_join_match()` RPC function
- Manages realtime listeners for status updates
- Automatically fetches opponent profile data
- Handles timeout (5 minutes)
- Provides clean cancellation and cleanup

**States**:
- `idle` - No matchmaking active
- `searching` - User is in the queue or waiting
- `found` - Match found with opponent data
- `error` - Something went wrong

**Usage**:
```typescript
const { matchState, startMatchmaking, cancelMatchmaking } = useVersusMatchmaking();
```

### 2. Updated VersusWorkout Screen
**Location**: `src/pages/VersusWorkout.tsx`

**Changes**:
- Integrated `useVersusMatchmaking` hook
- Fetch current user profile on mount
- Show `Finding` modal while searching (`matchState.status === 'searching'`)
- Show `MatchFoundModal` when match found (`matchState.status === 'found'`)
- Handle accept (navigate to VersusRunScreen) and decline actions
- Pass opponent info and match ID to VersusRunScreen

**Modal Flow**:
1. User clicks "RUN" → `handleRunPress()` calls `startMatchmaking()`
2. Shows `Finding` modal while searching
3. When match found, shows `MatchFoundModal` with opponent info
4. If accepted: Navigate to VersusRunScreen with opponent data
5. If declined: Cancel matchmaking and return to selection

## How It Works

### User A (First to click RUN):
1. Calls `find_or_join_match()` RPC
2. No opponent found → Function returns `{ status: 'waiting' }`
3. Hook sets up Realtime listener on user A's record
4. App shows Finding modal
5. User A's record status is still 'waiting'

### User B (Clicks RUN while A is waiting):
1. Calls `find_or_join_match()` RPC
2. Finds User A's waiting record
3. RPC updates User A's record to 'matched' (with User B's ID and match_id)
4. RPC inserts User B's record as 'matched'
5. Returns `{ status: 'matched', opponent_id: A, match_id: xxx }` immediately
6. User B navigates immediately

### User A (via Realtime):
1. Realtime listener detects UPDATE on User A's record
2. Sees status changed to 'matched'
3. Hook fetches User A's opponent profile (User B)
4. Shows MatchFoundModal
5. User A accepts → navigates

## Key Features

✅ **No Polling** - Uses Realtime listeners instead of polling
✅ **Automatic Cleanup** - Removes waiting records on timeout or cancellation
✅ **Error Handling** - Graceful error messages and state management
✅ **Profile Fetching** - Auto-fetches both current user and opponent profiles
✅ **Timeout Protection** - Auto-cancels after 5 minutes
✅ **RLS Secure** - Uses RPC with `security definer` for safe operations

## Notes for VersusRunScreen

When User B navigates immediately, make sure VersusRunScreen can handle:
- User A is still seeing the Finding modal
- User A will navigate once realtime update is detected
- Both users should have the same `matchId` for tracking

The `matchId` can be used for:
- Linking both users' workout records
- Tracking progress in real-time during the workout
- Finalizing results and comparing stats
