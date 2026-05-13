const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const achNames = {
  '1': 'Perfect Form', '2': 'Injury-Free Streak', '3': 'Pushup Prodigy', '4': 'Dips Dynamo',
  '5': 'Squat Scholar', '6': 'Lunge Legend', '7': 'The Strider I', '8': 'The Climber I',
  '9': 'The Pacer I', '10': 'The Strider II', '11': 'The Climber II', '12': 'The Pacer II',
  '13': 'The Strider III', '14': 'The Climber III', '15': 'The Pacer III', '16': 'The Strider IV',
  '17': 'Sync Specialist', '18': 'BMI Voyager', '20': '7 - Day Streak', '21': 'Habit Builder',
  '22': 'Early Bird', '23': 'Night Owl'
};

async function run() {
  const { data: achievements } = await supabase.from('user_achievements').select('*');
  const { data: existingNotifs } = await supabase.from('notifications').select('*').like('title', '%Achievement%');
  
  let insertedCount = 0;
  for (const ach of achievements || []) {
    const achId = String(ach.achievement_name);
    // Check if notification already exists for this user and achievement
    const exists = existingNotifs?.find(n => n.user_id === ach.user_id && n.metadata && n.metadata.achievement_id === achId);
    if (!exists) {
      await supabase.from('notifications').insert([{
        user_id: ach.user_id,
        title: '🏆 Achievement Unlocked!',
        message: `You unlocked "${achNames[achId] || 'Achievement #' + achId}" — +1000 XP bonus!`,
        metadata: { achievement_id: achId },
        is_read: true, // mark as read so they don't spam the red dot
        created_at: ach.unlocked_at || new Date().toISOString()
      }]);
      insertedCount++;
    }
  }
  console.log(`Backfilled ${insertedCount} achievement notifications.`);
}

run();
