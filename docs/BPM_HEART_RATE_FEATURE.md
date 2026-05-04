# Heart Rate / BPM Feature Setup

## Overview
This feature tracks heart rate (BPM) data during runs when a smartwatch/heart rate sensor is connected. If no sensor is connected, the BPM columns are not populated.

## Changes Made

### 1. Code Updates ✅
**File: `src/pages/Run.tsx`**
- Modified `runData` object to conditionally include `average_bpm` and `max_bpm` only when `sessionStats.avg > 0`
- Updated finish workout modal to only display HR summary box when heart rate data is available
- HR chart and stats only visible when smartwatch is connected

### 2. Database Migration Required ⚠️
**File: `docs/migrations/add_bpm_to_runs.sql`**

#### Steps to Run Migration:
1. Open your Supabase Dashboard
2. Go to **SQL Editor** → **New Query**
3. Copy the content from `docs/migrations/add_bpm_to_runs.sql`
4. Execute the SQL
5. Verify the new columns appear:
   - `average_bpm` (INTEGER, nullable)
   - `max_bpm` (INTEGER, nullable)

## How It Works

### No Smartwatch (BPM = 0)
- HR summary box is hidden in the finish screen
- No BPM data saved to database
- Run saves normally with distance, pace, time, elevation

### With Smartwatch Connected (BPM > 0)
- HR summary box appears at top of finish screen
- Shows:
  - Average HR (in BPM)
  - Peak HR (in BPM, highlighted in red)
  - Heart rate chart (expandable/collapsible)
- `average_bpm` and `max_bpm` are saved to runs table

## Database Schema

### New Columns
```sql
average_bpm INTEGER DEFAULT NULL    -- Average heart rate during run
max_bpm INTEGER DEFAULT NULL        -- Peak heart rate during run
```

- Both columns are **nullable** (NULL when no sensor data)
- Indexed for fast queries
- Values are in beats per minute (BPM)

## Field Mapping
| App Variable | Database Column |
|---|---|
| sessionStats.avg | average_bpm |
| sessionStats.max | max_bpm |

## Testing Checklist

### Without Smartwatch
- [ ] Start and finish a run without heart rate sensor
- [ ] Finish screen should NOT show HR summary
- [ ] Supabase: `average_bpm` and `max_bpm` are NULL

### With Smartwatch
- [ ] Start and finish a run with heart rate sensor
- [ ] Finish screen shows HR summary box
- [ ] HR chart is expandable/collapsible
- [ ] Supabase: `average_bpm` and `max_bpm` have values

## API Reference

### Heart Rate Detection Logic
```typescript
// In Run.tsx - saveRunToDatabase()
const sessionStats = {
  avg: sessionHRData.length > 0 ? Math.round(sessionHRData.reduce((a, b) => a + b, 0) / sessionHRData.length) : 0,
  max: sessionHRData.length > 0 ? Math.max(...sessionHRData) : 0,
};

// Conditionally add to runData:
if (sessionStats.avg > 0) {
  runData.average_bpm = sessionStats.avg;
  runData.max_bpm = sessionStats.max;
}
```

## Troubleshooting

### HR Summary Not Showing
**Problem**: HR summary appears even when no smartwatch
**Solution**: Check that `sessionStats.avg > 0` condition is working

### BPM Not Saving to Database
**Problem**: HR data collected but not saved
**Solution**: 
1. Verify migration ran successfully
2. Check Supabase RLS policies allow inserts to new columns
3. Verify `average_bpm` and `max_bpm` columns exist

### Migration Failed
**Problem**: SQL error when running migration
**Solution**:
1. Columns may already exist - check Supabase table structure
2. If column exists with different name, use existing column name
3. Or modify SQL to drop old columns first

## Optional: Remove Old Columns
If you have old `average_heart_rate` and `max_heart_rate` columns, you can remove them by uncommenting at the bottom of the migration:

```sql
ALTER TABLE runs DROP COLUMN IF EXISTS average_heart_rate;
ALTER TABLE runs DROP COLUMN IF EXISTS max_heart_rate;
```

## Future Enhancements
- [ ] HR zone tracking (Z1-Z5)
- [ ] VO2Max estimation
- [ ] Heart rate recovery metric
- [ ] HR trend analysis
- [ ] Training load calculations
