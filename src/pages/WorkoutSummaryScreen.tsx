import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { uploadRunMedia } from '../services/runUpload';
import { ACHIEVEMENT_DATA } from './Achievements';
import { checkAndNotifyRank } from '../utils/leaderboardUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatSetTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Helper to convert image URI to base64 for uploading
const uriToBase64 = async (uri: string): Promise<string | null> => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read blob as data URL'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  } catch (error) {
    console.error('Error in uriToBase64:', error);
    return null;
  }
};

export default function WorkoutSummaryScreen({ route, navigation }: any) {
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Extract navigation params
  const routineType = route.params?.routineType || 'Workout';
  const elapsedSeconds = route.params?.elapsedSeconds || 0;
  const exercises = route.params?.exercises || [];

  const { stackedData, workoutStats } = useMemo(() => {
    let dataPoints: any[] = [];
    let sum = 0;
    let max = 0;
    let min = 999;

    exercises.forEach((ex: any) => {
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach((set: any) => {
          if (set.avgHR && set.avgHR > 0) {
            const hr = set.avgHR;
            sum += hr;
            if (hr > max) max = hr;
            if (hr < min) min = hr;

            const pillHeight = 8;
            const baseValue = Math.max(0, hr - pillHeight);

            dataPoints.push({
              stacks: [
                { value: baseValue, color: 'transparent' },
                { value: pillHeight, color: '#FF4444', borderRadius: 4, marginBottom: 2 }
              ],
              rawHR: hr
            });
          }
        });
      }
    });

    return {
      stackedData: dataPoints,
      workoutStats: {
        avg: dataPoints.length > 0 ? Math.round(sum / dataPoints.length) : 0,
        max: max,
        min: min === 999 ? 0 : min,
      }
    };
  }, [exercises]);

  const chartWidth = SCREEN_WIDTH - 80;
  const barWidth = 6;
  const numBars = stackedData.length || 1;
  const availableWidth = chartWidth - 30;
  const safeSpacing = numBars > 1 ? (availableWidth - (numBars * barWidth)) / (numBars - 1) : 0;

  const chartPointerConfig = useMemo(() => ({
    pointerStripHeight: 150,
    pointerStripColor: '#FF4444',
    pointerStripWidth: 2,
    pointerColor: '#FF4444',
    radius: 6,
    pointerLabelWidth: 80,
    pointerLabelHeight: 40,
    activatePointersOnLongPress: true,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any) => {
      if (!items || !items[0]) return null;
      const val = items[0].rawHR || items[0].value;
      return (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipValue}>{val} <Text style={{fontSize: 10}}>BPM</Text></Text>
        </View>
      );
    },
  }), []);

  // Pre-compute XP breakdown for display and saving
  const xpCalculation = useMemo(() => {
    let totalRepsCompleted = 0;
    let totalSetsCompleted = 0;
    exercises.forEach((ex: any) => {
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach((s: any) => {
          totalRepsCompleted += Number(s.reps) || 0;
          totalSetsCompleted += 1;
        });
      }
    });
    const base = 50;
    const repXp = totalRepsCompleted * 5;
    const setXp = totalSetsCompleted * 25;
    const durationBonus = elapsedSeconds > 300 ? 50 : 0;
    const allFinished = exercises.every((ex: any) =>
      Array.isArray(ex.sets) && ex.sets.every((s: any) => s.status === 'FINISHED')
    );
    const perfectBonus = allFinished && totalSetsCompleted > 0 ? 100 : 0;
    const total = base + repXp + setXp + durationBonus + perfectBonus;
    return {
      base, repXp, setXp, durationBonus, perfectBonus, total,
      totalRepsCompleted, totalSetsCompleted,
      breakdown: { base, rep_xp: repXp, set_xp: setXp, duration_bonus: durationBonus, perfect_bonus: perfectBonus },
    };
  }, [exercises, elapsedSeconds]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to add one.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedMedia(prev => [...prev, ...result.assets]);
    }
  };

  const removeMediaItem = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleDiscard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'WorkoutMain' }],
    });
  };

  const handleSave = async () => {
    if (!workoutTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your workout.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user. Please log in again.');
        setIsSaving(false);
        return;
      }

      let uploadedImageUrls: string[] = [];

      // 1. Upload images if the user selected them
      if (selectedMedia.length > 0) {
        for (const media of selectedMedia) {
          try {
            const base64Data = await uriToBase64(media.uri);
            if (base64Data) {
              const mimeType = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
              const ext = media.type === 'video' ? 'mp4' : 'jpg';
              const fileName = `routine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
              const url = await uploadRunMedia(session.user.id, base64Data, fileName, mimeType);
              if (url) uploadedImageUrls.push(url);
            }
          } catch (e) {
            console.error('Error uploading media item:', e);
          }
        }
      }

      // 1.5 Calculate Achievements
      let earnedAchievementIds: string[] = [];
      try {
        const currentExerciseTotals: Record<string, number> = {};
        exercises.forEach((ex: any) => {
          if (Array.isArray(ex.sets)) {
            ex.sets.forEach((set: any) => {
              if (set.status === 'FINISHED') {
                currentExerciseTotals[ex.name] = (currentExerciseTotals[ex.name] || 0) + (parseInt(set.reps) || 0);
              }
            });
          }
        });

        const { data: userStats } = await supabase.from('user_stats').select('*').eq('user_id', session.user.id).single();
        let newExerciseTotals = { ...(userStats?.exercise_totals || {}) };
        
        Object.keys(currentExerciseTotals).forEach(key => {
          newExerciseTotals[key] = (newExerciseTotals[key] || 0) + currentExerciseTotals[key];
        });

        const { data: existingAchievements } = await supabase.from('user_achievements').select('achievement_name').eq('user_id', session.user.id);
        const unlockedSet = new Set(existingAchievements?.map(a => a.achievement_name) || []);

        const newUnlocks: string[] = [];
        if (!unlockedSet.has('3') && (newExerciseTotals['Push Ups'] || 0) >= 1000) newUnlocks.push('3');
        if (!unlockedSet.has('4') && (newExerciseTotals['Tricep Dips'] || 0) >= 500) newUnlocks.push('4');
        if (!unlockedSet.has('5') && (newExerciseTotals['Squats'] || 0) >= 500) newUnlocks.push('5');
        if (!unlockedSet.has('6') && (newExerciseTotals['Lunges'] || 0) >= 100) newUnlocks.push('6');

        earnedAchievementIds = newUnlocks;

        await supabase.from('user_stats').upsert({
          user_id: session.user.id,
          total_workouts: (userStats?.total_workouts || 0) + 1,
          exercise_totals: newExerciseTotals,
          updated_at: new Date().toISOString()
        });

        if (newUnlocks.length > 0) {
          const achievementInserts = newUnlocks.map(id => ({
            user_id: session.user.id,
            achievement_name: id,
            unlocked_at: new Date().toISOString(),
          }));
          await supabase.from('user_achievements').insert(achievementInserts);
        }
      } catch (achErr) {
        console.error('Error processing achievements:', achErr);
      }

      // 2. Save everything to completed_routines (with enriched data)
      const { error } = await supabase.from('completed_routines').insert([
        {
          user_id: session.user.id,
          routine_type: routineType,
          workout_type: 'solo_workout',
          caption: workoutTitle.trim(),
          notes: workoutNotes.trim(),
          media_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
          media_urls: uploadedImageUrls,
          total_duration: elapsedSeconds,
          exercises_data: exercises,
          xp_earned: xpCalculation.total,
          xp_breakdown: xpCalculation.breakdown,
          total_sets_completed: xpCalculation.totalSetsCompleted,
          total_reps_completed: xpCalculation.totalRepsCompleted,
          earned_achievements: earnedAchievementIds,
        }
      ]);

      if (error) {
        console.error('❌ Supabase insert error:', JSON.stringify(error));
        Alert.alert('Error', `Failed to save workout: ${error.message}`);
        setIsSaving(false);
        return;
      }

      // 💰 AWARD XP TO PROFILE (using pre-computed values)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // Add achievement XP (1000 per unlock) on top of workout XP
          const achievementXp = earnedAchievementIds.length * 1000;
          const totalXp = xpCalculation.total + achievementXp;
          await supabase
            .from('profiles')
            .update({ xp: (profile.xp || 0) + totalXp })
            .eq('id', session.user.id);

          // ── Notifications ──────────────────────────────────────────────────
          // 1. XP earned notification
          if (totalXp > 0) {
            await supabase.from('notifications').insert([{
              user_id: session.user.id,
              title: `+${totalXp} XP Earned`,
              message: `You earned ${xpCalculation.total} XP for completing your ${routineType} workout!${earnedAchievementIds.length > 0 ? ` (+${achievementXp} XP from achievements)` : ''}`,
              metadata: { xp_earned: totalXp, workout_type: 'solo_workout' },
              is_read: false,
            }]);
          }

          // 2. Achievement notification (one per unlock)
          const achNames: Record<string, string> = {
            '3': 'Pushup Prodigy', '4': 'Dips Dynamo', '5': 'Squat Scholar', '6': 'Lunge Legend',
            '7': 'The Strider I', '8': 'The Climber I', '9': 'The Pacer I',
            '10': 'The Strider II', '11': 'The Climber II', '12': 'The Pacer II',
            '13': 'The Strider III', '14': 'The Climber III', '15': 'The Pacer III', '16': 'The Strider IV',
          };
          for (const achId of earnedAchievementIds) {
            await supabase.from('notifications').insert([{
              user_id: session.user.id,
              title: '🏆 Achievement Unlocked!',
              message: `You unlocked "${achNames[achId] ?? `Achievement #${achId}`}" — +1000 XP bonus!`,
              metadata: { achievement_id: achId },
              is_read: false,
            }]);
          }
          // ────────────────────────────────────import { checkAndNotifyRank } from '../utils/leaderboardUtils';
          // ───────────────────────────────
        }
      } catch (xpErr) {
        console.log('XP save error (non-critical):', xpErr);
      }
      
      // Check for leaderboard rank notification
      await checkAndNotifyRank(session.user.id);
      // ─────────────────────────────── 
      Alert.alert('Workout Saved! 💪', `You earned +${xpCalculation.total} XP!\n\n🏋️ ${xpCalculation.totalRepsCompleted} reps × ${xpCalculation.totalSetsCompleted} sets`);
      setIsSaving(false);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'Home' } }],
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={['#3a1a1a', '#18181b']}
        locations={[0, 1]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#CCFF00" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FINISH WORKOUT</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GLOBAL HR SUMMARY */}
        {workoutStats.avg > 0 ? (
          <>
            <View style={[styles.hrSummaryBox, { marginBottom: 16 }]}>
              <View style={styles.hrSummaryContent}>
                <View style={styles.hrSummaryItem}>
                  <Text style={styles.hrSummaryLabel}>AVERAGE HR</Text>
                  <Text style={styles.hrSummaryValue}>
                    {workoutStats.avg} <Text style={{ fontSize: 12 }}>BPM</Text>
                  </Text>
                </View>
                <View style={styles.hrSummaryDivider} />
                <View style={styles.hrSummaryItem}>
                  <Text style={styles.hrSummaryLabel}>PEAK HR</Text>
                  <Text style={[styles.hrSummaryValue, { color: '#FF4444' }]}>
                    {workoutStats.max} <Text style={{ fontSize: 12 }}>BPM</Text>
                  </Text>
                </View>
              </View>
            </View>
            {stackedData.length > 0 && (
              <View style={[styles.hrChartContainer, { marginBottom: 20 }]}>
                <BarChart
                  data={stackedData}
                  width={chartWidth}
                  height={100}
                  barWidth={barWidth}
                  spacing={safeSpacing}
                  hideRules
                  hideYAxisText
                  hideAxesAndRules
                  stepValue={20}
                  maxValue={200}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  pointerConfig={chartPointerConfig}
                />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.hrSummaryBox, { marginBottom: 20 }]}>
            <View style={[styles.hrSummaryContent, { justifyContent: 'center' }]}>
              <Text style={{ color: '#555', fontSize: 12, fontFamily: 'Montserrat_600SemiBold', textAlign: 'center' }}>No device attached</Text>
            </View>
          </View>
        )}

        {/* INPUT FIELDS */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.singleLineInput}
            value={workoutTitle}
            onChangeText={setWorkoutTitle}
            placeholder="Workout Title"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.multiLineInput}
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            placeholder="How did it go? Share more about your workout!"
            placeholderTextColor="#888"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* MEDIA UPLOAD SECTION */}
        <TouchableOpacity style={styles.addPhotosBtn} activeOpacity={0.7} onPress={handlePickImage}>
          <Text style={{ fontSize: 24, marginBottom: 8 }}>📷</Text>
          <Text style={{ color: '#1F78FF', fontSize: 12, fontFamily: 'Montserrat-SemiBold' }}>
            Add Photos / Videos
          </Text>
        </TouchableOpacity>

        {selectedMedia.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewScroll}>
            {selectedMedia.map((media, index) => (
              <View key={index} style={styles.mediaPreviewContainer}>
                <Image source={{ uri: media.uri }} style={styles.mediaPreviewImage} />
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMediaItem(index)}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* EXERCISES LIST */}
        {exercises.map((item: any, index: number) => {
          
          let exerciseAvgHR = 0;
          let exerciseMaxHR = 0;
          
          if (Array.isArray(item.sets)) {
            const setsWithHR = item.sets.filter((s: any) => s.avgHR > 0);
            
            if (setsWithHR.length > 0) {
              const sumAvg = setsWithHR.reduce((acc: number, s: any) => acc + s.avgHR, 0);
              exerciseAvgHR = Math.round(sumAvg / setsWithHR.length);
              exerciseMaxHR = Math.max(...setsWithHR.map((s: any) => s.maxHR || 0));
            }
          }

          return (
            <LinearGradient
              key={index}
              colors={['#2A2A2A', '#1d2105']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exerciseCardGradient}
            >
              <View style={styles.exerciseCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  
                  {exerciseAvgHR > 0 && (
                     <View style={styles.hrBadge}>
                       <Text style={{fontSize: 10, marginRight: 4}}>❤️</Text>
                       <Text style={styles.hrBadgeText}>HR TRACKED</Text>
                     </View>
                  )}
                </View>
                
                <View style={styles.exerciseStatsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Reps</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) ? item.sets.reduce((acc: number, s: any) => acc + (Number(s.reps) || 0), 0) : (item.reps || 0)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Sets</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) ? item.sets.length : (item.sets || 0)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Avg. Wgt</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) 
                        ? (item.sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0), 0) / (item.sets.length || 1)).toFixed(1) 
                        : (item.avgWeight || 'None')}
                    </Text>
                  </View>
                </View>

                {exerciseAvgHR > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.exerciseStatsRow}>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Average HR</Text>
                        <Text style={styles.statValue}>{exerciseAvgHR} <Text style={{fontSize: 10, color: '#888'}}>BPM</Text></Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Peak HR</Text>
                        <Text style={[styles.statValue, {color: '#FF4444'}]}>{exerciseMaxHR} <Text style={{fontSize: 10, color: '#888'}}>BPM</Text></Text>
                      </View>
                      <View style={styles.statCol} /> 
                    </View>
                  </>
                )}

                {/* Per-Set Breakdown Table */}
                {Array.isArray(item.sets) && item.sets.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={{flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 8}}>
                      <Text style={{flex: 0.4, color: '#888', fontSize: 9, fontFamily: 'Montserrat-Bold', textAlign: 'center'}}>Set</Text>
                      <Text style={{flex: 1, color: '#888', fontSize: 9, fontFamily: 'Montserrat-Bold', textAlign: 'center'}}>Weight</Text>
                      <Text style={{flex: 0.5, color: '#888', fontSize: 9, fontFamily: 'Montserrat-Bold', textAlign: 'center'}}>Reps</Text>
                      <Text style={{flex: 0.7, color: '#888', fontSize: 9, fontFamily: 'Montserrat-Bold', textAlign: 'center'}}>Time</Text>
                      <Text style={{flex: 0.6, color: '#888', fontSize: 9, fontFamily: 'Montserrat-Bold', textAlign: 'center'}}>Status</Text>
                    </View>
                    {item.sets.map((set: any, j: number) => (
                      <View key={j} style={{flexDirection: 'row', paddingVertical: 5}}>
                        <Text style={{flex: 0.4, color: '#DDD', fontSize: 11, fontFamily: 'Montserrat-Medium', textAlign: 'center'}}>{set.set}</Text>
                        <Text style={{flex: 1, color: '#DDD', fontSize: 11, fontFamily: 'Montserrat-Medium', textAlign: 'center'}}>{set.weight}</Text>
                        <Text style={{flex: 0.5, color: '#DDD', fontSize: 11, fontFamily: 'Montserrat-Medium', textAlign: 'center'}}>{set.reps}</Text>
                        <Text style={{flex: 0.7, color: '#DDD', fontSize: 11, fontFamily: 'Montserrat-Medium', textAlign: 'center'}}>{formatSetTime(set.duration)}</Text>
                        <Text style={{flex: 0.6, fontSize: 11, fontFamily: 'Montserrat-Bold', textAlign: 'center', color: set.status === 'FINISHED' ? '#CCFF00' : '#FF8800'}}>
                          {set.status === 'FINISHED' ? '✓ Done' : '◐ Partial'}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

              </View>
            </LinearGradient>
          );
        })}

        {stackedData.length > 0 && (
          <View style={styles.hrChartContainer}>
            <View style={styles.hrChartHeader}>
              <Text style={styles.hrChartTitle}>WORKOUT HR TREND</Text>
              <Text style={styles.hrChartRangeValue}>
                {workoutStats.min}–{workoutStats.max} <Text style={styles.hrChartBpm}>BPM</Text>
              </Text>
            </View>

            <BarChart
              stackData={stackedData}
              height={150}
              width={chartWidth}
              barWidth={barWidth}
              spacing={safeSpacing}
              initialSpacing={10}
              hideRules={false}
              rulesType="solid"
              rulesColor="rgba(255,255,255,0.05)"
              yAxisTextStyle={{ color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium' }}
              hideYAxisText={false}
              yAxisColor="transparent"
              xAxisColor="#333333"
              maxValue={Math.max(workoutStats.max, 120) + 10} 
              noOfSections={4}
              pointerConfig={chartPointerConfig}
            />
          </View>
        )}

        {/* XP BREAKDOWN */}
        <View style={{backgroundColor: '#111', borderRadius: 12, padding: 20, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: '#333'}}>
          <Text style={{color: '#888', fontSize: 10, fontFamily: 'Montserrat-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4}}>XP Earned</Text>
          <Text style={{color: '#CCFF00', fontSize: 32, fontFamily: 'Montserrat-Black', marginBottom: 16}}>+{xpCalculation.total} XP</Text>
          <View style={{height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12}} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
            <Text style={{color: '#AAA', fontSize: 12, fontFamily: 'Montserrat-Medium'}}>Base XP</Text>
            <Text style={{color: '#FFF', fontSize: 12, fontFamily: 'Montserrat-Bold'}}>{xpCalculation.base}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
            <Text style={{color: '#AAA', fontSize: 12, fontFamily: 'Montserrat-Medium'}}>Rep XP ({xpCalculation.totalRepsCompleted} × 5)</Text>
            <Text style={{color: '#FFF', fontSize: 12, fontFamily: 'Montserrat-Bold'}}>{xpCalculation.repXp}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
            <Text style={{color: '#AAA', fontSize: 12, fontFamily: 'Montserrat-Medium'}}>Set XP ({xpCalculation.totalSetsCompleted} × 25)</Text>
            <Text style={{color: '#FFF', fontSize: 12, fontFamily: 'Montserrat-Bold'}}>{xpCalculation.setXp}</Text>
          </View>
          {xpCalculation.durationBonus > 0 && (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{color: '#AAA', fontSize: 12, fontFamily: 'Montserrat-Medium'}}>Duration Bonus (&gt;5 min)</Text>
              <Text style={{color: '#34D399', fontSize: 12, fontFamily: 'Montserrat-Bold'}}>+{xpCalculation.durationBonus}</Text>
            </View>
          )}
          {xpCalculation.perfectBonus > 0 && (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{color: '#AAA', fontSize: 12, fontFamily: 'Montserrat-Medium'}}>Perfect Bonus (all sets complete)</Text>
              <Text style={{color: '#FFD700', fontSize: 12, fontFamily: 'Montserrat-Bold'}}>+{xpCalculation.perfectBonus}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.discardButton} 
          onPress={handleDiscard} 
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave} 
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveText}>Save Workout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b', 
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Barlow-ExtraBold',
    fontSize: 22,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 15,
  },
  singleLineInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#CCFF00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  multiLineInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#CCFF00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: '#FFF',
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    height: 120,
  },
  addPhotosBtn: {
    height: 120,
    borderWidth: 1,
    borderColor: '#1F78FF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
  },
  mediaPreviewScroll: {
    marginBottom: 30,
  },
  mediaPreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  exerciseCardGradient: {
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  exerciseCard: {
    padding: 20,
  },
  exerciseName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: '#FFF',
  },
  hrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  hrBadgeText: {
    color: '#FF4444',
    fontFamily: 'Montserrat-Bold',
    fontSize: 9,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'flex-start',
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 13,
    color: '#FFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  hrChartContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    paddingTop: 16,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  hrChartHeader: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  hrChartTitle: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hrChartRangeValue: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Montserrat-Black',
  },
  hrChartBpm: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Montserrat-Medium',
  },
  tooltipContainer: {
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#151515',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  discardButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  discardText: {
    color: '#FF3333',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#CCFF00',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveText: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
  hrSummaryBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  hrSummaryContent: { flexDirection: 'row', alignItems: 'center' },
  hrSummaryItem: { flex: 1, alignItems: 'center' },
  hrSummaryLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat-Bold', marginBottom: 4 },
  hrSummaryValue: { color: '#FFF', fontSize: 24, fontFamily: 'Montserrat-Black' },
  hrSummaryDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 15, height: 40 },
});