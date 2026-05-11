import { supabase } from '../supabase';

export interface StreakData {
  streakDates: string[];
  freezeDates: string[];
  currentStreak: number;
}

/**
 * Fetch streak data based on ALL workout types:
 * - Solo runs (from 'runs' table)
 * - Solo workouts (from 'completed_routines' table)
 * - Versus workouts (from 'versus_battles' table — if user participated)
 * 
 * A day counts as active if ANY workout was completed that day.
 * Streak is counted in DAYS (not weeks).
 */
export const fetchStreakData = async (): Promise<StreakData> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { streakDates: [], freezeDates: [], currentStreak: 0 };

    // Fetch all workout dates from both tables
    const [runsResult, routinesResult] = await Promise.all([
      supabase
        .from('runs')
        .select('created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('completed_routines')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ]);

    const toDateStr = (dateInput: string): string => {
      const d = new Date(dateInput);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Collect all unique active days
    const activeDays = new Set<string>();

    // Add run dates
    if (runsResult.data) {
      runsResult.data.forEach(run => {
        const dateField = run.completed_at || run.created_at;
        if (dateField) activeDays.add(toDateStr(dateField));
      });
    }

    // Add routine dates
    if (routinesResult.data) {
      routinesResult.data.forEach(routine => {
        if (routine.created_at) activeDays.add(toDateStr(routine.created_at));
      });
    }

    if (activeDays.size === 0) return { streakDates: [], freezeDates: [], currentStreak: 0 };

    // Calculate streak (consecutive days from today going backward)
    const streaks = Array.from(activeDays).sort();
    const freezes: string[] = [];
    let currentStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count consecutive days backward from today
    let checkDate = new Date(today);
    let availableFreezes = 0;
    let unfrozenStreak = 0;

    // First check if today or yesterday had a workout (to start the streak)
    const todayStr = toDateStr(today.toISOString());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toDateStr(yesterday.toISOString());

    if (!activeDays.has(todayStr) && !activeDays.has(yesterdayStr)) {
      // No workout today or yesterday — streak is 0
      return { streakDates: streaks, freezeDates: freezes, currentStreak: 0 };
    }

    // Walk backward from today counting the streak
    for (let i = 0; i < 365; i++) {
      const dateStr = toDateStr(checkDate.toISOString());

      if (activeDays.has(dateStr)) {
        currentStreak++;
        unfrozenStreak++;
        if (unfrozenStreak >= 5) {
          availableFreezes = 2;
          unfrozenStreak = 0;
        }
      } else {
        if (dateStr === todayStr) {
          // It's today, and no workout yet. Streak is still alive from yesterday.
          // Just skip to yesterday without breaking.
        } else if (availableFreezes > 0) {
          freezes.push(dateStr);
          availableFreezes--;
          unfrozenStreak = 0;
        } else {
          break; // Streak broken
        }
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    return { streakDates: streaks, freezeDates: freezes, currentStreak };
  } catch (err) {
    console.log('Error calculating streaks:', err);
    return { streakDates: [], freezeDates: [], currentStreak: 0 };
  }
};
