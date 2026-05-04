# 🏆 Leaderboards Feature - Setup Quick Start

## Overview
Connect the Leaderboards screen to Supabase and display users ranked by their XP (experience points).

## Prerequisites
- ✅ Supabase project initialized
- ✅ User authentication working
- ✅ `profiles` table exists

## Step 1: Add XP Column to Profiles Table

### Option A: Supabase Dashboard (Manual)
1. Go to your Supabase project → SQL Editor
2. Copy and paste the SQL from `docs/migrations/001_add_xp_to_profiles.sql`
3. Click "Run"

### Option B: Using SQL File
```bash
# If you have psql installed:
psql -h [your-supabase-host] -U postgres -d [your-db-name] -f docs/migrations/001_add_xp_to_profiles.sql
```

## Step 2: Verify profiles Table Structure
Ensure your `profiles` table has these columns:
```sql
- id (UUID, Primary Key)
- username (VARCHAR)
- avatar_url (VARCHAR, nullable)
- xp (INTEGER, DEFAULT 0)  ← NEW COLUMN
- email (VARCHAR)
- age (INTEGER, nullable)
- gender (VARCHAR, nullable)
- weight (DECIMAL, nullable)
- height (DECIMAL, nullable)
- physical_level (VARCHAR, nullable)
- goal (VARCHAR, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Step 3: Test the Leaderboard
1. Launch the app and navigate to the Leaderboards screen
2. You should see:
   - ✅ Top 3 users in the podium section
   - ✅ Remaining users in the ranked list (Rank 4+)
   - ✅ Current user's rank and percentile in footer
   - ✅ User avatars (if avatar_url is set in profiles)
   - ✅ XP values for each user

## Troubleshooting

### Issue: Leaderboard shows empty or only some users
**Solution**: Verify that all users in your profiles table have an `xp` column value (should default to 0).

### Issue: Avatars not showing
**Solution**: Ensure users have set their `avatar_url` in their profile. Avatar_url should be a valid image URL.

### Issue: Current user shows "Loading..."
**Solution**: Check that the authenticated user exists in the profiles table with their username and xp.

## How XP is Awarded (Next Steps)

Currently, users start with XP = 0. To implement XP rewards:

### Option 1: Manual XP Updates
Update users' XP through the Supabase dashboard or app functions.

### Option 2: Automatic XP from Runs (Future)
Create a trigger in Supabase to automatically increment XP when a run is completed:
- Award XP based on distance run
- Award XP based on calories burned
- Award XP based on achievement milestones

See the commented trigger in `001_add_xp_to_profiles.sql` for implementation guidance.

## Component Details

### Leaderboards.tsx Changes
- **fetchLeaderboard()**: Queries profiles table ordered by XP DESC
- **podiumUsers**: Top 3 users displayed with special styling
- **listUsers**: Remaining users (rank 4+) in scrollable list
- **currentUser**: Shows authenticated user's rank and percentile
- **percentile**: Calculated as `(total_users - rank + 1) / total_users * 100`

### Data Flow
```
User Opens Leaderboards
    ↓
fetchLeaderboard() called (on screen focus)
    ↓
Query all profiles from Supabase ordered by xp DESC
    ↓
Add rank (index + 1) to each user
    ↓
Find current user and calculate percentile
    ↓
Display podium (top 3) + list (rank 4+)
```

## SQL Reference

### Add XP Column
```sql
ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0;
```

### Query Leaderboard
```sql
SELECT id, username, xp, avatar_url 
FROM profiles 
ORDER BY xp DESC 
LIMIT 100;
```

### Update User XP
```sql
UPDATE profiles SET xp = xp + 10 WHERE id = 'user_id';
```

### Reset Leaderboard (for testing)
```sql
UPDATE profiles SET xp = 0;
```

## Related Features
- [BMI Tracking Feature](BMI_TRACKING_FEATURE.md)
- [BPM Heart Rate Feature](BPM_HEART_RATE_FEATURE.md)
