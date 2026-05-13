import { supabase } from '../supabase';

/**
 * Checks the user's current rank and sends a notification if they reach Top 1, 2, or 3.
 * Prevents spamming by checking if a similar notification was sent in the last 24 hours.
 */
export async function checkAndNotifyRank(userId: string) {
  try {
    // 1. Calculate current rank
    const { data: allUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, xp')
      .order('xp', { ascending: false });

    if (fetchError || !allUsers) return;

    const rank = allUsers.findIndex(u => u.id === userId) + 1;

    if (rank >= 1 && rank <= 3) {
      // 2. Check if we already notified them today to avoid spam
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .ilike('title', '%Leaderboard%')
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        return; // Already notified today
      }

      // 3. Send notification
      const rankText = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
      const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
      
      await supabase.from('notifications').insert([{
        user_id: userId,
        title: `${emoji} Top 3 Leaderboard!`,
        message: `Incredible! You just reached ${rankText} place on the global leaderboard. Keep up the momentum!`,
        metadata: { type: 'leaderboard_rank', rank },
      }]);
    }
  } catch (err) {
    console.error('Error in checkAndNotifyRank:', err);
  }
}
