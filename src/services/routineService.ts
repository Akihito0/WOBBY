import { supabase } from '../supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoutineType = 'PUSH' | 'PULL' | 'LEG';

export interface RoutineSet {
  id: number;
  weight: string;
  reps: string;
}

export interface RoutineExercise {
  id: number;
  name: string;
  sets: RoutineSet[];
}

// ─── Default Exercises (Single Source of Truth) ──────────────────────────────

const PUSH_DEFAULTS: RoutineExercise[] = [
  {
    id: 1,
    name: 'Push Ups',
    sets: [
      { id: 1, weight: 'Body Weight', reps: '8' },
      { id: 2, weight: 'Body Weight', reps: '8' },
      { id: 3, weight: 'Body Weight', reps: '8' },
    ],
  },
  {
    id: 2,
    name: 'Bench Press',
    sets: [
      { id: 1, weight: '40 kg', reps: '8' },
      { id: 2, weight: '40 kg', reps: '8' },
      { id: 3, weight: '40 kg', reps: '8' },
    ],
  },
  {
    id: 3,
    name: 'Tricep Dips',
    sets: [
      { id: 1, weight: 'Body Weight', reps: '8' },
      { id: 2, weight: 'Body Weight', reps: '8' },
      { id: 3, weight: 'Body Weight', reps: '8' },
    ],
  },
];

const PULL_DEFAULTS: RoutineExercise[] = [
  {
    id: 1,
    name: 'Pull Ups',
    sets: [
      { id: 1, weight: 'Body Weight', reps: '8' },
      { id: 2, weight: 'Body Weight', reps: '8' },
      { id: 3, weight: 'Body Weight', reps: '8' },
    ],
  },
  {
    id: 2,
    name: 'Seated Cable Row',
    sets: [
      { id: 1, weight: 'Weighted', reps: '8' },
      { id: 2, weight: 'Weighted', reps: '8' },
      { id: 3, weight: 'Weighted', reps: '8' },
    ],
  },
  {
    id: 3,
    name: 'Single Arm Bicep Curls',
    sets: [
      { id: 1, weight: 'Weighted', reps: '8' },
      { id: 2, weight: 'Weighted', reps: '8' },
      { id: 3, weight: 'Weighted', reps: '8' },
    ],
  },
];

const LEG_DEFAULTS: RoutineExercise[] = [
  {
    id: 1,
    name: 'Squats',
    sets: [
      { id: 1, weight: 'Weighted', reps: '8' },
      { id: 2, weight: 'Weighted', reps: '8' },
      { id: 3, weight: 'Weighted', reps: '8' },
    ],
  },
  {
    id: 2,
    name: 'Lunges',
    sets: [
      { id: 1, weight: 'Body Weight', reps: '8' },
      { id: 2, weight: 'Body Weight', reps: '8' },
      { id: 3, weight: 'Body Weight', reps: '8' },
    ],
  },
  {
    id: 3,
    name: 'Leg Extensions',
    sets: [
      { id: 1, weight: 'Weighted', reps: '8' },
      { id: 2, weight: 'Weighted', reps: '8' },
      { id: 3, weight: 'Weighted', reps: '8' },
    ],
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the hardcoded default exercises for a routine type.
 * Used as fallback when the user has no saved customizations.
 */
export const getDefaultExercises = (routineType: RoutineType): RoutineExercise[] => {
  switch (routineType) {
    case 'PUSH': return JSON.parse(JSON.stringify(PUSH_DEFAULTS));
    case 'PULL': return JSON.parse(JSON.stringify(PULL_DEFAULTS));
    case 'LEG':  return JSON.parse(JSON.stringify(LEG_DEFAULTS));
    default:     return JSON.parse(JSON.stringify(PUSH_DEFAULTS));
  }
};

/**
 * Loads the user's custom routine from Supabase.
 * Returns the exercises array or null if no customization exists.
 */
export const loadUserRoutine = async (
  userId: string,
  routineType: RoutineType
): Promise<RoutineExercise[] | null> => {
  try {
    const { data, error } = await supabase
      .from('user_routines')
      .select('exercises_data')
      .eq('user_id', userId)
      .eq('routine_type', routineType)
      .single();

    if (error || !data) return null;
    return data.exercises_data as RoutineExercise[];
  } catch (err) {
    console.log('loadUserRoutine error:', err);
    return null;
  }
};

/**
 * Saves (upserts) the user's custom routine to Supabase.
 * Uses the UNIQUE(user_id, routine_type) constraint for conflict resolution.
 */
export const saveUserRoutine = async (
  userId: string,
  routineType: RoutineType,
  exercisesData: RoutineExercise[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_routines')
      .upsert(
        {
          user_id: userId,
          routine_type: routineType,
          exercises_data: exercisesData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,routine_type' }
      );

    if (error) {
      console.error('saveUserRoutine error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveUserRoutine error:', err);
    return false;
  }
};
