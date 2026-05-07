# ActivityFeed Edit & Delete Functionality Guide

## Overview
The ActivityFeed component now supports full edit and delete functionality for workout posts with database integration via Supabase.

## User Flow

### 1. **Viewing a Post**
- User sees their latest workout post in the ActivityFeed
- Vertical dot menu (⋮) appears in the top-right corner

### 2. **Opening Menu**
- User taps the vertical dots button
- Popup menu appears with two options:
  - **Edit Post** (with pencil icon)
  - **Delete Post** (with trash icon, red)

### 3. **Editing a Post**
- User selects "Edit Post"
- Edit form modal opens with fields:
  - Workout Title (required)
  - Description (optional)
  - Distance (km)
  - Pace (/km)
- User modifies desired fields
- Taps "Save Changes" button
- Changes are saved to the database
- Feed automatically refreshes with updated data
- Success alert confirms the update

### 4. **Deleting a Post**
- User selects "Delete Post"
- Confirmation dialog appears asking to confirm deletion
- If confirmed:
  - Post is permanently deleted from database
  - Success alert appears
  - Feed refreshes, post disappears
- If cancelled: No action taken

## Technical Implementation

### Files Modified

#### 1. **src/components/ActivityFeed.tsx**
```typescript
// New Imports
import { supabase } from '../supabase';
import { TextInput, Alert, ActivityIndicator } from 'react-native';

// Component Props (Updated)
interface Props {
  username?: string;
  avatarUrl?: string | null;
  runData?: RunData;
  onRefresh?: () => void;  // NEW
}

// State (NEW)
const [menuModalVisible, setMenuModalVisible] = useState(false);
const [editModalVisible, setEditModalVisible] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);
const [editTitle, setEditTitle] = useState('');
const [editDescription, setEditDescription] = useState('');
const [editDistance, setEditDistance] = useState('');
const [editPace, setEditPace] = useState('');
```

#### 2. **src/pages/UserDashboard.tsx**
```typescript
// Updated Usage
<ActivityFeed 
  username={username} 
  avatarUrl={avatarUrl} 
  runData={latestRun} 
  onRefresh={fetchLatestRun}  // NEW - enables refresh after changes
/>
```

### Database Operations

#### Delete Operation
```typescript
const { error } = await supabase
  .from('runs')
  .delete()
  .eq('id', runData.id);
```

#### Update Operation
```typescript
const { error } = await supabase
  .from('runs')
  .update({
    title: editTitle.trim(),
    description: editDescription.trim(),
    distance: parseFloat(editDistance),
    pace: editPace.trim(),
  })
  .eq('id', runData.id);
```

## UI Components

### Menu Modal
- Appears at bottom of screen
- Two menu items with icons
- Divider between options
- Semi-transparent dark backdrop
- Closes on outside tap

### Edit Modal
- Full-screen overlay with gradient background
- Header with close button and title
- Scrollable form with 4 fields
- Cancel and Save buttons at bottom
- Loading indicator during save
- Form validation (title required)

### Modals & Alerts
- Confirmation alerts for deletions
- Success/Error alerts with messages
- Loading spinners during operations
- Disabled buttons while processing

## Key Features

✅ **Database Connected** - Uses Supabase RLS policies for security
✅ **Form Validation** - Requires title, validates numeric fields
✅ **User Confirmations** - Confirmation before deletion
✅ **Loading States** - Shows spinners during operations
✅ **Error Handling** - Clear error messages from database
✅ **Auto-Refresh** - Data updates immediately after changes
✅ **Responsive UI** - Works on iOS and Android
✅ **Accessibility** - Touch-friendly buttons with proper spacing

## Data Flow

```
User Taps Menu (⋮)
    ↓
Menu Modal Opens
    ├─ Edit Post Selected
    │   ↓
    │ Edit Modal Opens
    │   ↓
    │ User Edits Fields
    │   ↓
    │ User Taps Save
    │   ↓
    │ Validate Form
    │   ↓
    │ Send UPDATE to Supabase
    │   ↓
    │ Success Alert
    │   ↓
    │ onRefresh() called
    │   ↓
    │ UserDashboard fetches latest data
    │   ↓
    │ Feed Updates
    │
    └─ Delete Post Selected
        ↓
      Confirmation Alert
        ↓
      User Confirms
        ↓
      Send DELETE to Supabase
        ↓
      Success Alert
        ↓
      onRefresh() called
        ↓
      UserDashboard fetches latest data
        ↓
      Feed Updates (post disappears)
```

## Database Schema Requirements

The `runs` table needs these columns:
- `id` (UUID) - Primary key
- `title` (TEXT)
- `description` (TEXT)
- `distance` (NUMERIC)
- `pace` (TEXT)
- `duration` (INTEGER)
- `completed_at` (TIMESTAMP)
- `user_id` (UUID) - Foreign key to profiles
- And other existing columns...

## RLS Policy Recommendations

```sql
-- Users can only edit/delete their own posts
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own posts"
ON runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON runs FOR DELETE
USING (auth.uid() = user_id);
```

## Testing Checklist

- [ ] Tap vertical dots menu
- [ ] Menu appears with Edit and Delete options
- [ ] Click Edit - form modal opens with current data
- [ ] Edit title, description, distance, pace
- [ ] Save changes - success alert appears
- [ ] Feed refreshes with updated post
- [ ] Click vertical dots again
- [ ] Click Delete - confirmation dialog appears
- [ ] Confirm deletion - success alert appears
- [ ] Post disappears from feed
- [ ] Test error handling (network failure, etc.)

## Troubleshooting

**Issue: Post not refreshing after edit**
- Check `onRefresh` prop is passed to ActivityFeed
- Verify `fetchLatestRun` is being called correctly

**Issue: Delete fails**
- Check RLS policies are correctly configured
- Verify user_id matches authenticated user
- Check database constraints

**Issue: Edit modal not opening**
- Verify `editModalVisible` state is being set
- Check `handleOpenEditModal` function is called

**Issue: Edit not saving**
- Verify database ID (`runData.id`) exists
- Check Supabase connection
- Look at browser console for error messages

## Future Enhancements

- [ ] Add photo/media editing capability
- [ ] Add location editing
- [ ] Support bulk edit/delete
- [ ] Add edit history tracking
- [ ] Undo functionality for recent deletions
- [ ] Add sharing before/after editing
- [ ] Auto-save drafts
