# BMI Tracking Feature Documentation

## Overview
The BMI tracking feature allows users to monitor their Body Mass Index, view history, and receive personalized calorie suggestions based on the Harris-Benedict equation for Basal Metabolic Rate (BMR).

## Features

### 1. **BMI Display**
- Real-time BMI calculation from user's weight and height
- BMI card in the dashboard stats section is clickable
- Automatic updates when user data changes

### 2. **BMI Categories**
The BMI is categorized as:
- **Underweight**: BMI < 18.5 (Blue #3498db)
- **Normal**: BMI 18.5 - 24.9 (Green #2ecc71)
- **Overweight**: BMI 25 - 29.9 (Orange #f39c12)
- **Obese**: BMI ≥ 30 (Red #e74c3c)

### 3. **BMI Update Modal**
When clicking the BMI card, a modal opens with:
- **Current BMI Display**: Shows current BMI and category
- **Measurement Inputs**: 
  - Weight (supports kg and lb)
  - Height (supports cm and in)
- **Harris-Benedict BMR Calculation**: Shows suggested daily calories based on activity level
- **BMI History**: Shows past 10 BMI records with dates and categories

### 4. **Suggested Daily Calories**
Calculated using Harris-Benedict equation:
- **BMR for Men**: 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
- **BMR for Women**: 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)

Default activity multiplier: **1.55 (Moderately Active)** - Exercise 3-5 days/week

Available multipliers:
- 1.2 - Sedentary (little or no exercise)
- 1.375 - Lightly active (exercise 1-3 days/week)
- 1.55 - Moderately active (exercise 3-5 days/week)
- 1.725 - Very active (exercise 6-7 days/week)
- 1.9 - Extremely active (physical job or exercise twice per day)

## Components

### Files Created/Modified

1. **BMIModal.tsx** (`src/components/BMIModal.tsx`)
   - Main modal component for BMI management
   - Handles BMI updates, history display, and calorie calculations
   - Integrates with Supabase for data persistence

2. **StatsCards.tsx** (`src/components/StatsCards.tsx`)
   - Updated to fetch real BMI data from Supabase
   - Made BMI card clickable to open modal
   - Shows loading state while fetching data

3. **UserDashboard.tsx** (`src/pages/UserDashboard.tsx`)
   - Added BMI modal state management
   - Integrated BMIModal component
   - Passes callback to refresh stats when BMI is updated

4. **healthCalculations.ts** (`src/utils/healthCalculations.ts`)
   - Utility functions for BMI and BMR calculations
   - Reusable across the entire app
   - Includes weight/height conversion helpers

5. **bmi_history_table.sql** (`docs/migrations/bmi_history_table.sql`)
   - SQL migration for creating the `bmi_history` table
   - Includes Row Level Security (RLS) policies
   - Automatic timestamp updates via triggers

## Database Setup

### Required Tables

#### 1. **profiles** (Existing)
Make sure your profiles table has these columns:
```sql
- weight (DECIMAL) - in kg
- height (DECIMAL) - in cm
- age (INTEGER)
- gender (VARCHAR)
```

#### 2. **bmi_history** (New - Run the migration)
```sql
CREATE TABLE bmi_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  bmi DECIMAL(4, 1),
  weight DECIMAL(6, 2),
  height DECIMAL(5, 2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Setup Instructions

1. **Create the bmi_history table**:
   - Open your Supabase SQL editor
   - Copy the entire content of `docs/migrations/bmi_history_table.sql`
   - Execute the SQL
   - This creates the table with all necessary indexes and RLS policies

2. **Verify the setup**:
   - Go to Supabase Dashboard → Tables
   - Confirm `bmi_history` table exists
   - Check that RLS is enabled
   - Verify indexes are created

## Usage

### For Users
1. **View BMI**: The dashboard shows current BMI in the stats card
2. **Update BMI**: Click the BMI card to open the modal
3. **Update measurements**: Enter new weight/height with preferred units
4. **Save**: Click "Save Changes" to update
5. **View history**: See past 10 BMI records in the modal

### For Developers
1. **Import utility functions**:
```typescript
import { calculateBMI, calculateBMR } from '../utils/healthCalculations';

// Calculate BMI
const bmiResult = calculateBMI(70, 175); // weight in kg, height in cm
console.log(bmiResult.bmi, bmiResult.categoryLabel);

// Calculate BMR
const bmrResult = calculateBMR(70, 175, 30, 'male');
console.log(bmrResult.bmr, bmrResult.dailyCalories.moderately_active);
```

2. **Use BMIModal in other components**:
```typescript
import BMIModal from '../components/BMIModal';

const [bmiModalVisible, setBmiModalVisible] = useState(false);

<BMIModal
  isVisible={bmiModalVisible}
  onClose={() => setBmiModalVisible(false)}
  onBMIUpdated={() => {
    // Refresh stats or update parent state
  }}
/>
```

## API Integration

### Supabase Queries Used

1. **Fetch user profile**:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('weight, height, age, gender')
  .eq('id', user.id)
  .single();
```

2. **Update profile**:
```typescript
await supabase
  .from('profiles')
  .update({ weight: newWeight, height: newHeight })
  .eq('id', user.id);
```

3. **Insert BMI history**:
```typescript
await supabase
  .from('bmi_history')
  .insert([{ user_id, bmi, weight, height, created_at }]);
```

4. **Fetch BMI history**:
```typescript
const { data: history } = await supabase
  .from('bmi_history')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);
```

## Error Handling

- **Missing user data**: Modal shows "—" for BMI if weight/height not set
- **bmi_history table missing**: App logs note, but continues functioning
- **Network errors**: Shows alerts to user
- **Invalid inputs**: Validates that weight and height are provided before saving

## Future Enhancements

1. **Activity Level Selector**: Allow users to select activity level for accurate calorie calculation
2. **BMI Trends**: Graph showing BMI changes over time
3. **Goal Setting**: Set target BMI and track progress
4. **Notifications**: Remind users to update measurements
5. **Export Data**: Export BMI history as CSV/PDF
6. **Comparison**: Compare with population averages
7. **Nutrition Suggestions**: Integrate with nutrition API based on suggested calories

## Testing Checklist

- [ ] BMI card displays actual BMI from database
- [ ] Clicking BMI card opens modal
- [ ] Modal shows current BMI and category with correct color
- [ ] Suggested calories display correctly
- [ ] Weight unit toggle works (kg ↔ lb)
- [ ] Height unit toggle works (cm ↔ in)
- [ ] Saving updates profile table
- [ ] Saving inserts into bmi_history table
- [ ] History displays correctly with dates
- [ ] Modal closes properly
- [ ] StatsCards refreshes after update
- [ ] Works on both iOS and Android

## Dependencies

- `react-native`
- `@supabase/supabase-js`
- `expo-linear-gradient`
- Fonts: Montserrat (900Black, 800ExtraBold, 600SemiBold), Barlow (400Regular)

## Notes

- All measurements are stored in metric units (kg, cm) in the database
- Conversions to imperial units (lb, in) happen on the frontend
- BMR calculation uses the user's age and gender from profile
- Default activity level is "Moderately Active" (1.55 multiplier)
- The app gracefully handles missing bmi_history table
