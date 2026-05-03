# BMI Tracking Setup Checklist

## 1. Database Setup ✓

### Create bmi_history table
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy & paste the content from: `docs/migrations/bmi_history_table.sql`
4. Execute the SQL
5. Verify table appears in Tables list

### Verify profiles table
Ensure your `profiles` table has:
- `weight` (DECIMAL) - in kg
- `height` (DECIMAL) - in cm  
- `age` (INTEGER)
- `gender` (VARCHAR)

## 2. Code Implementation ✓

Files already created:
- ✅ `src/components/BMIModal.tsx` - Modal component
- ✅ `src/components/StatsCards.tsx` - Updated with BMI fetching
- ✅ `src/pages/UserDashboard.tsx` - Added modal state
- ✅ `src/utils/healthCalculations.ts` - Utility functions
- ✅ `docs/migrations/bmi_history_table.sql` - SQL migration
- ✅ `docs/BMI_TRACKING_FEATURE.md` - Full documentation

## 3. Testing

### Manual Testing
1. [ ] Build and run the app: `npx expo prebuild --clean && npm run android/ios`
2. [ ] Navigate to Dashboard
3. [ ] Check if BMI card shows value (should fetch from profiles)
4. [ ] Click BMI card - modal should open
5. [ ] See "Current BMI" section with category and color
6. [ ] See "Suggested Daily Calories" based on Harris-Benedict equation
7. [ ] Update weight/height and save
8. [ ] Verify profile table updated
9. [ ] Check bmi_history table has new record
10. [ ] Refresh dashboard - BMI should update

### Edge Cases
1. [ ] User with no weight/height - should show "—"
2. [ ] Unit conversions work (kg ↔ lb, cm ↔ in)
3. [ ] Different genders calculate different BMR
4. [ ] History shows correct dates
5. [ ] BMI categories show correct colors

## 4. Troubleshooting

### BMI shows "—" (dash)
**Problem**: User profile is missing weight or height data
**Solution**: Go through onboarding again or update via modal

### bmi_history table not found
**Problem**: SQL migration not run
**Solution**: Run `docs/migrations/bmi_history_table.sql` in Supabase SQL editor

### Modal doesn't open
**Problem**: BMIModal component not imported or state not set up
**Solution**: Check `UserDashboard.tsx` has BMIModal import and `bmiModalVisible` state

### BMI calculation incorrect
**Problem**: Height or weight in wrong units in database
**Solution**: Verify all values in profiles table are in metric (kg, cm)

### RLS permission errors
**Problem**: User can't save to bmi_history table
**Solution**: Run the complete SQL migration to set up RLS policies

## 5. Performance Notes

- BMI fetches on component mount and when modal is updated
- History limited to 10 most recent records
- Indexes created on user_id and created_at for fast queries
- Trigger automatically updates timestamp on record changes

## 6. Next Steps

Optional enhancements:
- [ ] Add activity level selector for custom calorie calculation
- [ ] Create BMI trend graph
- [ ] Add goal setting feature
- [ ] Set up calorie reminders
- [ ] Export history feature

## Quick Reference

**Harris-Benedict Equation:**
- Men: BMR = 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
- Women: BMR = 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)

**BMI Formula:**
- BMI = weight (kg) / (height (m) ²)

**Activity Multipliers:**
- 1.2 = Sedentary
- 1.375 = Lightly active
- 1.55 = Moderately active (default)
- 1.725 = Very active
- 1.9 = Extremely active
