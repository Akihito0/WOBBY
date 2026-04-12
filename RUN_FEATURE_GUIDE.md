# WOBBY Run Feature - Complete Setup Guide

## Overview

The enhanced Run feature now includes:

✅ **Route Tracking & Storage** - Save complete route data to Supabase  
✅ **Elevation Metrics** - Display elevation gain/loss, min/max elevation  
✅ **Pace Calculation** - Real-time pace per km  
✅ **Background Location Tracking** - Continues even when screen is off  
✅ **Strava-like Experience** - Professional fitness tracking interface  
✅ **Hidden Navigation** - Bottom nav hides during active run  

---

## 1. DATABASE SETUP

### Step 1: Run SQL Migration

1. Open your Supabase Dashboard → SQL Editor
2. Copy all SQL from `DATABASE_MIGRATIONS.sql` in your project root
3. Paste and execute in your SQL Editor
4. Verify the `runs` table is created

**What gets created:**
- `runs` table (stores all run data)
- Indexes for performance
- Row Level Security (RLS) policies
- Optional `run_stats` view for analytics

### Step 2: Verify Columns

Your `runs` table should have these columns:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to profiles |
| title | text | Run title (required) |
| description | text | Optional notes |
| distance | numeric | Distance in km |
| duration | integer | Time in seconds |
| pace | text | Formatted "MM'SS\"" |
| elevation_gain | integer | Meters climbed |
| elevation_loss | integer | Meters descended |
| min_elevation | integer | Lowest point (meters) |
| max_elevation | integer | Highest point (meters) |
| route_coordinates | jsonb | Array of GPS points |
| started_at | timestamp | Run start time |
| completed_at | timestamp | Run end time |
| created_at | timestamp | Record creation time |

---

## 2. PERMISSIONS SETUP

### Background Location Tracking (iOS)

1. Open `app.config.js` in your project root
2. Ensure `expo-location` is in dependencies
3. Add these permissions to `expo.plugins`:

```javascript
[
  "expo-location",
  {
    "locationAlwaysAndWhenInUsePermissions": "Allow WOBBY to access your location for accurate run tracking."
  }
]
```

4. Rebuild the app: `npx expo run:ios`

### Background Location Tracking (Android)

1. Check `android/app/src/main/AndroidManifest.xml`
2. Ensure these permissions exist:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

---

## 3. FEATURES EXPLAINED

### Route Tracking

- **Automatic**: GPS points are captured every 1 second during your run
- **Accuracy**: Uses `Accuracy.BestForNavigation` for best precision
- **Storage**: Complete route saved as GeoJSON-like array in database
- **Query**: Access via `supabase.from('runs').select('route_coordinates')`

### Elevation Metrics

The app calculates:
- **Elevation Gain**: Total meters climbed
- **Elevation Loss**: Total meters descended
- **Min/Max**: Lowest and highest points reached
- **Average**: Calculated from min and max

Appears in real-time during run and persisted to database.

### Pace Calculation

- **Format**: `MM'SS"` (e.g., "7'45\"" = 7 minutes 45 seconds per km)
- **Real-time**: Updates as you run
- **Saved**: Stored with the completed run

### Background Tracking

When enabled:
- ✅ Continues tracking even if screen turns off
- ✅ Works with app in background
- ✅ Used by `expo-task-manager` for background tasks
- ✅ Requires background location permission on iOS

### Hidden Navigation

- Bottom nav automatically hides when RunScreen is active
- Returns when you exit the Run feature
- Implemented via `NavBar.tsx` route detection

---

## 4. USAGE FLOW

### Starting a Run

1. Open Workout tab → Run
2. Grant location permissions (first time)
3. Wait for GPS lock (green dot shows "GPS Acquired")
4. Tap **START** button

### During the Run

- **Real-time stats**: Time, Pace, Distance, Elevation
- **Map**: Shows your live position and route
- **Recenter button**: Re-center map on your current position
- **Pause button**: Pause the run (can resume)

### Finishing a Run

1. Tap **FINISH** while paused
2. Enter run title (required)
3. (Optional) Add description
4. (Optional) Add photos/videos
5. Tap **SAVE WORKOUT**
6. Data instantly synced to Supabase

### Run Data Saved

```json
{
  "id": "uuid...",
  "user_id": "uuid...",
  "title": "Morning 5K",
  "description": "Great run!",
  "distance": 5.02,
  "duration": 1847,
  "pace": "6'08\"",
  "elevation_gain": 142,
  "elevation_loss": 138,
  "min_elevation": 45,
  "max_elevation": 187,
  "route_coordinates": [
    {"latitude": 40.7128, "longitude": -74.0060, "altitude": 100},
    ...
  ],
  "completed_at": "2024-04-13T08:30:00Z"
}
```

---

## 5. QUERYING RUN DATA

### Get All User Runs

```sql
SELECT * FROM runs 
WHERE user_id = '<current_user_id>' 
ORDER BY completed_at DESC;
```

### Get Run Statistics

```sql
SELECT * FROM run_stats 
WHERE user_id = '<current_user_id>';
```

### Get Runs with Route Data

```sql
SELECT id, title, distance, duration, route_coordinates 
FROM runs 
WHERE user_id = '<current_user_id>' 
AND route_coordinates IS NOT NULL;
```

### JavaScript/Supabase Client

```typescript
// Get latest 10 runs
const { data, error } = await supabase
  .from('runs')
  .select('*')
  .eq('user_id', userId)
  .order('completed_at', { ascending: false })
  .limit(10);

// Get detailed run with route
const { data, error } = await supabase
  .from('runs')
  .select('*')
  .eq('id', runId)
  .single();

// Get aggregate stats
const { data, error } = await supabase
  .from('run_stats')
  .select('*')
  .eq('user_id', userId)
  .single();
```

---

## 6. FUTURE ENHANCEMENTS

These features are architecture-ready and can be added:

### Social Features
- [ ] Share runs publicly (`is_public` column ready)
- [ ] Like/comment on runs (columns exist)
- [ ] Follow other runners

### Analytics
- [ ] Weekly/monthly mileage trends
- [ ] Elevation profile charts
- [ ] Pace progression analysis
- [ ] Personal records (fastest mile, etc.)

### Advanced Tracking
- [ ] Heart rate sensor integration (`expo-health`)
- [ ] Calorie estimation
- [ ] Cadence tracking
- [ ] Segment analysis

### Map Features
- [ ] Offline map caching
- [ ] Heatmap of popular routes
- [ ] Segment leaderboards
- [ ] Route recreation matching

---

## 7. TROUBLESHOOTING

### GPS Not Acquiring

- **Problem**: Stuck on "Acquiring GPS..."
- **Solutions**:
  - Check location permissions: Settings → App Permissions → Location
  - Go outside (GPS needs clear sky view)
  - Wait 30-60 seconds
  - Try toggling airplane mode off/on
  - Restart the app

### Background Tracking Not Working

- **iOS**: Go to Settings → WOBBY → Location → "Always Allow"
- **Android**: Settings → App Permissions → Location → "Allow all the time"

### Elevation Data Not Showing

- **Cause**: Phone's altimeter may not be active
- **Solution**: 
  - Some Android devices don't report altitude reliably
  - Elevation data is optional; app works without it
  - Check raw `route_coordinates` in database to see if altitude was captured

### Run Not Saving

- **Check**: 
  - Title field filled in
  - User is authenticated (session exists)
  - Database connection active
  - RLS policies allow insert

```typescript
// Debug: Check user auth
const { data: { session } } = await supabase.auth.getSession();
console.log('User:', session?.user?.id);
```

### High Battery Drain

- **Cause**: Continuous GPS tracking and screen updates
- **Solutions**:
  - Normal behavior for GPS tracking apps
  - Strava, Garmin, etc. drain battery similarly
  - Recommendation: Run with phone charging
  - Consider shorter runs (<1 hour) for battery conservation

---

## 8. PERFORMANCE TIPS

### Optimize GPS Accuracy vs Battery

```typescript
// Current (Best Navigation - high accuracy)
accuracy: Location.Accuracy.BestForNavigation

// To save battery, change to:
accuracy: Location.Accuracy.High // Decent accuracy, lower battery
accuracy: Location.Accuracy.Balanced // Balanced
```

### Limit Update Frequency

```typescript
// Current settings in Run.tsx
timeInterval: 1000,      // Update every 1 second
distanceInterval: 1,     // Update on 1 meter movement

// To reduce updates:
timeInterval: 5000,      // Every 5 seconds
distanceInterval: 5,     // Every 5 meters
```

---

## 9. TESTING CHECKLIST

- [ ] Database `runs` table created
- [ ] RLS policies active
- [ ] Location permissions granted
- [ ] Start a test run (~1 min)
- [ ] Data saves successfully
- [ ] Check `run_stats` view shows totals
- [ ] Try with screen off (if background permissions enabled)
- [ ] Verify elevation data in run (if device supports)
- [ ] Bottom nav hides during run
- [ ] Bottom nav shows after finishing
- [ ] Can start another run immediately
- [ ] Map shows route trace

---

## 10. SUPPORT

For issues or questions:

1. Check `DATABASE_MIGRATIONS.sql` is fully applied
2. Verify RLS policies in Supabase dashboard
3. Check console logs for Supabase errors
4. Ensure `expo-location`, `expo-task-manager` installed
5. Check location permissions in phone settings

### Key Files Modified

- `src/pages/Run.tsx` - Main run tracking component
- `src/components/layout/NavBar.tsx` - Navigation hide logic
- `App.tsx` - Workout stack configuration
- `DATABASE_MIGRATIONS.sql` - **NEW** - Database setup

---

**Version**: 1.0  
**Last Updated**: April 13, 2026  
**Status**: Production Ready ✅
