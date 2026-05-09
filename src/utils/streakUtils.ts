import { supabase } from '../supabase';

export interface StreakData {
  streakDates: string[];
  freezeDates: string[];
  currentStreak: number;
}

export const fetchStreakData = async (): Promise<StreakData> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { streakDates: [], freezeDates: [], currentStreak: 0 };

    const { data, error } = await supabase
      .from('runs')
      .select('distance, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error || !data) return { streakDates: [], freezeDates: [], currentStreak: 0 };

    const dailyDistance: Record<string, number> = {};
    
    data.forEach(run => {
      if (!run.created_at) return;
      const localDate = new Date(run.created_at);
      const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      dailyDistance[dateStr] = (dailyDistance[dateStr] || 0) + Number(run.distance || 0);
    });

    const streaks: string[] = [];
    const freezes: string[] = [];
    let currentStreak = 0;
    
    const dates = Object.keys(dailyDistance).sort();
    if (dates.length > 0) {
      const startDate = new Date(dates[0]);
      const today = new Date();
      startDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      let unfrozenStreak = 0;
      let availableFreezes = 0;

      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dist = dailyDistance[dateStr] || 0;

        if (dist >= 1) { // 1km = 100 XP
          streaks.push(dateStr);
          currentStreak++;
          unfrozenStreak++;
          if (unfrozenStreak >= 5) {
            availableFreezes = 2; // Resets max freezes to 2
            unfrozenStreak = 0;
          }
        } else {
          if (availableFreezes > 0) {
            freezes.push(dateStr);
            availableFreezes--;
            // Missed day holding streak does not increase currentStreak
            unfrozenStreak = 0; // Reset progress towards next freeze
          } else {
            currentStreak = 0;
            unfrozenStreak = 0;
          }
        }
      }
    }

    return { streakDates: streaks, freezeDates: freezes, currentStreak };
  } catch (err) {
    console.log('Error calculating streaks:', err);
    return { streakDates: [], freezeDates: [], currentStreak: 0 };
  }
};
