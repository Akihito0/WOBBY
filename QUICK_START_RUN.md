# 🚀 QUICK START - Run Feature Setup

## In 3 Steps ⚡

### Step 1: Run SQL Migration
1. Open Supabase Dashboard → **SQL Editor**
2. Copy entire contents of `DATABASE_MIGRATIONS.sql` from project root
3. Paste into SQL Editor
4. Click **Execute**
5. ✅ Done! Table created with RLS policies

### Step 2: Test the Feature
1. Open app (or rebuild: `npx expo run:android`)
2. Navigate to **Workout tab → Run**
3. Grant location permissions when prompted
4. Wait for "GPS Acquired" (green dot)
5. Tap **START**
6. Run for 30+ seconds
7. Tap **PAUSE** → **FINISH**
8. Enter title → **SAVE WORKOUT**

### Step 3: Verify in Supabase
1. Go to Supabase Dashboard → **Table Editor**
2. Select `runs` table
3. ✅ See your new run record with all data saved!

---

## What Was Added

| Item | Description | Status |
|------|-------------|--------|
| Route Tracking | GPS coordinates saved to database | ✅ Ready |
| Elevation | Real-time elevation gain/loss/min/max | ✅ Ready |
| Pace Display | Live pace calculation in MM'SS" format | ✅ Ready |
| Hidden Nav | Bottom navigation hides during run | ✅ Ready |
| Background Tracking | Continues when screen is off | ✅ Ready |
| Database | `runs` table with RLS policies | 🟡 Needs SQL |
| Save Function | Automatic Supabase sync on finish | ✅ Ready |
| Error Handling | User-friendly alerts for issues | ✅ Ready |

---

## Data Saved Per Run

```json
{
  "title": "Morning Run",
  "description": "Felt great!",
  "distance": 5.23,
  "duration": 1865,
  "pace": "5'56\"",
  "elevation_gain": 245,
  "elevation_loss": 238,
  "min_elevation": 125,
  "max_elevation": 370,
  "route_coordinates": [
    { "latitude": 40.7128, "longitude": -74.0060, "altitude": 150 },
    { "latitude": 40.7130, "longitude": -74.0062, "altitude": 152 },
    ...
  ],
  "started_at": "2024-04-13T08:00:00Z",
  "completed_at": "2024-04-13T08:31:05Z"
}
```

---

## Files Changed

- ✏️ `src/pages/Run.tsx` - Enhanced with elevation, database save, background tracking
- ✏️ `src/components/layout/NavBar.tsx` - Hide when RunScreen active
- ✏️ `App.tsx` - Minor navigation updates
- ➕ `DATABASE_MIGRATIONS.sql` - **NEW** - Run this in Supabase
- ➕ `RUN_FEATURE_GUIDE.md` - **NEW** - Full documentation
- ➕ `RUN_IMPLEMENTATION_SUMMARY.md` - **NEW** - Technical overview

---

## Permissions Auto-Requested

When user opens Run screen:
- ✅ Foreground location permission
- ✅ Background location permission (iOS only)

User will see system dialog - tap "Allow" or "Allow While Using App".

---

## Need Help?

1. **GPS not acquiring?** 
   - Go outside (needs clear sky)
   - Check Settings → App Permissions → Location

2. **Data not saving?**
   - Check if `runs` table exists in Supabase
   - Run DATABASE_MIGRATIONS.sql again

3. **Elevation not showing?**
   - Normal - not all devices report altitude
   - Feature still works fine without it

4. **NavBar not hiding?**
   - Clear app cache or rebuild Expo
   - `npx expo run:android` or `npm run build`

---

## Performance Notes

- 🔋 **Battery**: GPS tracking drains battery (normal for fitness apps)
- 📍 **Accuracy**: Best for outdoor runs with clear sky
- 📡 **Network**: Internet needed to save to database
- 💾 **Data**: Each run ~1-5KB depending on route length

---

## Ready? 🏃

1. ✅ SQL migration run in Supabase?
2. ✅ App rebuilt or reloaded?
3. ✅ Location permissions granted?

**Let's go! Start your first tracked run! 🚀**

---

**Questions?** Check `RUN_FEATURE_GUIDE.md` for detailed documentation.
