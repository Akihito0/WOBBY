import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  StatusBar,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import { ACHIEVEMENT_DATA } from './Achievements';
import ChallengeModal from '../components/ChallengeModal';

const { width } = Dimensions.get('window');

type WorkoutType = 'ALL' | 'BATTLE' | 'SOLO' | 'ACHIEVEMENTS';
type SortBy = 'DATE_NEWEST' | 'DATE_OLDEST' | 'XP_HIGH' | 'XP_LOW' | 'VERSUS_WORKOUT' | 'VERSUS_RUN' | 'WORKOUT' | 'RUN';

interface WorkoutRecord {
  id: string;
  type: 'VERSUS_BATTLE' | 'VERSUS_RUN' | 'SOLO_WORKOUT' | 'SOLO_RUN' | 'ACHIEVEMENT';
  mode: 'VERSUS' | 'SOLO' | 'ACHIEVEMENT';
  exerciseName: string;
  distance?: number;
  reps?: number;
  sets?: number;
  duration?: string;
  opponent?: string;
  oppAvatar?: string | null;
  xp: number;
  date: string;
  timestamp: number;
  image?: any;
  description?: string;
}

const PerformanceScreen = () => {
  const navigation = useNavigation();

  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{
    status: 'VICTORY' | 'DEFEAT';
    exerciseName: string;
    reps: number | string;
    sets: number | string;
    date: string;
    duration: string;
    opponent: string;
    xp: number;
  } | null>(null);

  const [challengeFilter, setChallengeFilter] = useState<'ALL' | 'VICTORY' | 'DEFEAT' | 'FORFEITED'>('ALL');
  const [showChallengeDropdown, setShowChallengeDropdown] = useState(false);
  const [challengeTypeFilter, setChallengeTypeFilter] = useState<'ALL' | 'VERSUS WORKOUT' | 'VERSUS RUN'>('ALL');

  const [xpPoints, setXpPoints] = useState(0);
  const [dailyXp, setDailyXp] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutRecord[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutRecord[]>([]);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutType>('ALL');
  const [selectedSort, setSelectedSort] = useState<SortBy>('DATE_NEWEST');
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();
      if (data) {
        setXpPoints(data.xp || 0);
      }
    } catch (err) {
      console.log('Error fetching XP for performance screen:', err);
    }
  }, []);

  const fetchDailyXp = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: battles } = await supabase
        .from('versus_battles')
        .select('player1_xp, player2_xp, player1_id, player2_id, created_at')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .neq('status', 'waiting');

      const { data: versusRuns } = await supabase
        .from('versus_run_results')
        .select('user_1_id, user_2_id, user_1_distance, user_2_distance, user_1_time, user_2_time, completed_at')
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .gte('completed_at', today.toISOString())
        .lt('completed_at', tomorrow.toISOString())
        .not('completed_at', 'is', null);

      const { data: soloWorkouts } = await supabase
        .from('completed_routines')
        .select('user_id, created_at, xp_earned, workout_type')
        .eq('user_id', user.id)
        .eq('workout_type', 'solo_workout')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const { data: soloRuns } = await supabase
        .from('runs')
        .select('user_id, created_at, xp_earned, earned_achievements')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const { data: dailyAchievements } = await supabase
        .from('user_achievements')
        .select('user_id, unlocked_at')
        .eq('user_id', user.id)
        .gte('unlocked_at', today.toISOString())
        .lt('unlocked_at', tomorrow.toISOString());

      let totalDailyXp = 0;

      if (battles) {
        battles.forEach(b => {
          const isPlayer1 = b.player1_id === user.id;
          totalDailyXp += isPlayer1 ? (b.player1_xp || 0) : (b.player2_xp || 0);
        });
      }

      if (versusRuns) {
        versusRuns.forEach(r => {
          const isUser1 = r.user_1_id === user.id;
          const distance = isUser1 ? r.user_1_distance : r.user_2_distance;

          const distNum = Number(distance || 0);
          const isVictory = (isUser1 && r.user_1_distance > r.user_2_distance) ||
            (!isUser1 && r.user_2_distance > r.user_1_distance);

          const base_xp = Math.floor(distNum >= 1 ? 100 + (distNum - 1) * 50 : distNum * 100);
          const earnedXp = isVictory ? base_xp + 100 : base_xp;

          totalDailyXp += earnedXp;
        });
      }

      if (soloWorkouts) {
        soloWorkouts.forEach(w => {
          totalDailyXp += w.xp_earned || 0;
        });
      }

      if (soloRuns) {
        soloRuns.forEach(r => {
          const runXp = r.xp_earned || 0;
          const achXp = r.earned_achievements ? r.earned_achievements.length * 1000 : 0;
          totalDailyXp += Math.max(0, runXp - achXp);
        });
      }

      if (dailyAchievements) {
        totalDailyXp += dailyAchievements.length * 1000;
      }

      setDailyXp(totalDailyXp);
    } catch (err) {
      console.log('Error fetching daily XP:', err);
    }
  }, []);

  const fetchWorkoutHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      const { data: battles } = await supabase
        .from('versus_battles')
        .select(`
          *,
          player1:profiles!versus_battles_player1_id_fkey(username, avatar_url),
          player2:profiles!versus_battles_player2_id_fkey(username, avatar_url)
        `)
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .neq('status', 'waiting');

      const { data: runs } = await supabase
        .from('versus_run_results')
        .select(`
          *,
          user1:profiles!versus_run_results_user_1_id_fkey(username, avatar_url),
          user2:profiles!versus_run_results_user_2_id_fkey(username, avatar_url)
        `)
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
        .not('completed_at', 'is', null);

      const { data: soloWorkouts, error: soloError } = await supabase
        .from('completed_routines')
        .select('*')
        .eq('user_id', userId);

      const { data: soloRuns, error: runError } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', userId);

      const { data: userAchievements, error: achError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (soloError) console.log('Error fetching solo workouts:', soloError);
      if (runError) console.log('Error fetching solo runs:', runError);
      if (achError) console.log('Error fetching achievements:', achError);

      const workouts: WorkoutRecord[] = [];
      const runMatchIds = new Set(runs?.map(r => r.match_id) || []);

      // Process battles
      if (battles) {
        battles.forEach(b => {
          if (runMatchIds.has(b.id)) return; // Skip battles that are actually runs
          const isPlayer1 = b.player1_id === userId;
          const opponentProfile = isPlayer1 ? b.player2 : b.player1;

          workouts.push({
            id: `battle_${b.id}`,
            type: 'VERSUS_BATTLE',
            mode: 'VERSUS',
            exerciseName: b.exercise_name || 'VERSUS BATTLE',
            reps: isPlayer1 ? b.player1_reps : b.player2_reps,
            sets: isPlayer1 ? b.player1_sets : b.player2_sets,
            opponent: opponentProfile?.username || 'Unknown',
            oppAvatar: opponentProfile?.avatar_url || null,
            xp: isPlayer1 ? b.player1_xp : b.player2_xp,
            date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            timestamp: new Date(b.created_at).getTime()
          });
        });
      }

      // Process runs
      if (runs) {
        runs.forEach(r => {
          const isUser1 = r.user_1_id === userId;
          const opponentProfile = isUser1 ? r.user2 : r.user1;
          const distance = isUser1 ? r.user_1_distance : r.user_2_distance;
          const time = isUser1 ? r.user_1_time : r.user_2_time;

          const hrs = Math.floor(time / 3600);
          const mins = Math.floor((time % 3600) / 60);
          const secs = time % 60;
          const durStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          const distNum = Number(distance || 0);
          const isVictory = (isUser1 && r.user_1_distance > r.user_2_distance) ||
            (!isUser1 && r.user_2_distance > r.user_1_distance);

          const base_xp = Math.floor(distNum >= 1 ? 100 + (distNum - 1) * 50 : distNum * 100);
          const earnedXp = isVictory ? base_xp + 100 : base_xp;

          workouts.push({
            id: `run_${r.id}`,
            type: 'VERSUS_RUN',
            mode: 'VERSUS',
            exerciseName: `${r.target_distance}KM RUN`,
            distance: distNum,
            duration: durStr,
            opponent: opponentProfile?.username || 'Unknown',
            oppAvatar: opponentProfile?.avatar_url || null,
            xp: earnedXp,
            date: new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            timestamp: new Date(r.completed_at).getTime()
          });
        });
      }

      // Process solo workouts
      if (soloWorkouts) {
        soloWorkouts.forEach(w => {
          const exercisesData = Array.isArray(w.exercises_data) ? w.exercises_data : [];

          workouts.push({
            id: `solo_${w.id}`,
            type: 'SOLO_WORKOUT',
            mode: 'SOLO',
            exerciseName: exercisesData[0]?.name || 'SOLO WORKOUT',
            reps: w.total_reps_completed || 0,
            sets: w.total_sets_completed || 0,
            xp: w.xp_earned || 0,
            date: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            timestamp: new Date(w.created_at).getTime()
          });
        });
      }

      // Process solo runs
      if (soloRuns) {
        soloRuns.forEach(r => {
          workouts.push({
            id: `solorun_${r.id}`,
            type: 'SOLO_RUN',
            mode: 'SOLO',
            exerciseName: r.title || 'SOLO RUN',
            distance: r.distance || 0,
            duration: formatTime(r.duration || 0),
            xp: r.xp_earned || 0,
            date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            timestamp: new Date(r.created_at).getTime()
          });
        });
      }

      // Process achievements
      if (userAchievements) {
        userAchievements.forEach(ua => {
          const achDef = ACHIEVEMENT_DATA.find(a => a.id === ua.achievement_name);
          if (achDef) {
            workouts.push({
              id: `ach_${ua.id || ua.achievement_name}`,
              type: 'ACHIEVEMENT',
              mode: 'ACHIEVEMENT',
              exerciseName: achDef.name,
              description: achDef.subtext,
              image: achDef.image,
              xp: 1000,
              date: new Date(ua.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              timestamp: new Date(ua.unlocked_at).getTime()
            });
          }
        });
      }

      setWorkoutHistory(workouts);
    } catch (err) {
      console.log('Error fetching workout history:', err);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...workoutHistory];

    // Filter by type
    if (selectedWorkoutType === 'BATTLE') {
      filtered = filtered.filter(w => w.type === 'VERSUS_BATTLE' || w.type === 'VERSUS_RUN');
    } else if (selectedWorkoutType === 'SOLO') {
      filtered = filtered.filter(w => w.type === 'SOLO_WORKOUT' || w.type === 'SOLO_RUN');
    } else if (selectedWorkoutType === 'ACHIEVEMENTS') {
      filtered = filtered.filter(w => w.type === 'ACHIEVEMENT');
    } else if (selectedWorkoutType === 'ALL') {
      // Show everything EXCEPT achievements by default? Or show achievements too?
      // Since there's an ACHIEVEMENTS tab, ALL typically shows workouts. Let's show everything except achievements, or everything.
      // I'll show all workouts (not achievements) under ALL.
      filtered = filtered.filter(w => w.type !== 'ACHIEVEMENT');
    }

    // Apply secondary filter / Sort By
    if (selectedWorkoutType === 'BATTLE') {
      if (selectedSort === 'VERSUS_WORKOUT') filtered = filtered.filter(w => w.type === 'VERSUS_BATTLE');
      if (selectedSort === 'VERSUS_RUN') filtered = filtered.filter(w => w.type === 'VERSUS_RUN');
    } else if (selectedWorkoutType === 'SOLO') {
      if (selectedSort === 'WORKOUT') filtered = filtered.filter(w => w.type === 'SOLO_WORKOUT');
      if (selectedSort === 'RUN') filtered = filtered.filter(w => w.type === 'SOLO_RUN');
    }

    // Sort
    switch (selectedSort) {
      case 'DATE_NEWEST':
      case 'VERSUS_WORKOUT':
      case 'VERSUS_RUN':
      case 'WORKOUT':
      case 'RUN':
        // Default sort for these is newest
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'DATE_OLDEST':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'XP_HIGH':
        filtered.sort((a, b) => b.xp - a.xp);
        break;
      case 'XP_LOW':
        filtered.sort((a, b) => a.xp - b.xp);
        break;
    }

    setFilteredWorkouts(filtered);
  }, [workoutHistory, selectedWorkoutType, selectedSort]);

  // Adjust Sort Options based on Workout Type
  useEffect(() => {
    if (selectedWorkoutType === 'BATTLE') {
      if (selectedSort !== 'VERSUS_WORKOUT' && selectedSort !== 'VERSUS_RUN') setSelectedSort('VERSUS_WORKOUT');
    } else if (selectedWorkoutType === 'SOLO') {
      if (selectedSort !== 'WORKOUT' && selectedSort !== 'RUN') setSelectedSort('WORKOUT');
    } else if (selectedWorkoutType === 'ACHIEVEMENTS') {
      if (selectedSort !== 'DATE_NEWEST' && selectedSort !== 'DATE_OLDEST') setSelectedSort('DATE_NEWEST');
    } else { // ALL
      if (!['DATE_NEWEST', 'DATE_OLDEST', 'XP_HIGH', 'XP_LOW'].includes(selectedSort)) {
        setSelectedSort('DATE_NEWEST');
      }
    }
  }, [selectedWorkoutType]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeLogs, setChallengeLogs] = useState<any[]>([]);

  const fetchChallenges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      const { data: battles } = await supabase
        .from('versus_battles')
        .select(`
          *,
          player1:profiles!versus_battles_player1_id_fkey(username, avatar_url),
          player2:profiles!versus_battles_player2_id_fkey(username, avatar_url)
        `)
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .neq('status', 'waiting');

      const { data: runs } = await supabase
        .from('versus_run_results')
        .select(`
          *,
          user1:profiles!versus_run_results_user_1_id_fkey(username, avatar_url),
          user2:profiles!versus_run_results_user_2_id_fkey(username, avatar_url)
        `)
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
        .not('completed_at', 'is', null);

      interface ChallengeLog {
        id: string;
        type: 'VERSUS WORKOUT' | 'VERSUS RUN';
        status: 'VICTORY' | 'DEFEAT' | 'BOTH WON' | 'BOTH LOST' | 'DECLINED' | 'FORFEITED';
        name: string;
        r: string | number;
        s: string | number;
        date: string;
        dur: string;
        opp: string;
        oppAvatar: string | null;
        xp: number;
        timestamp: number;
      }

      const merged: ChallengeLog[] = [];
      const runMatchIds = new Set(runs?.map(r => r.match_id) || []);

      if (battles) {
        battles.forEach(b => {
          if (runMatchIds.has(b.id)) return; // Skip battles that are actually runs
          const isPlayer1 = b.player1_id === userId;
          const opponentProfile = isPlayer1 ? b.player2 : b.player1;

          let derivedStatus: 'VICTORY' | 'DEFEAT' | 'BOTH WON' | 'BOTH LOST' | 'DECLINED' | 'FORFEITED' = 'DEFEAT';
          if (b.winner_id === userId) derivedStatus = 'VICTORY';
          else if (b.status === 'both_won') derivedStatus = 'BOTH WON';
          else if (b.status === 'both_lost') derivedStatus = 'BOTH LOST';
          else if (b.status === 'cancelled') derivedStatus = 'DECLINED';
          else if (b.status === 'forfeited') derivedStatus = 'FORFEITED';

          const battleTimestamp = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();

          merged.push({
            id: `battle_${b.id}`,
            type: 'VERSUS WORKOUT' as const,
            status: derivedStatus,
            name: b.exercise_name || 'VERSUS BATTLE',
            r: isPlayer1 ? b.player1_reps : b.player2_reps,
            s: isPlayer1 ? b.player1_sets : b.player2_sets,
            date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
            dur: '00:00:00',
            opp: opponentProfile?.username || 'Unknown',
            oppAvatar: opponentProfile?.avatar_url || null,
            xp: isPlayer1 ? b.player1_xp : b.player2_xp,
            timestamp: battleTimestamp
          });
        });
      }

      if (runs) {
        runs.forEach(r => {
          const isUser1 = r.user_1_id === userId;
          const opponentProfile = isUser1 ? r.user2 : r.user1;
          const isVictory = r.winner_id === userId;
          
          let derivedRunStatus: 'VICTORY' | 'DEFEAT' | 'BOTH WON' | 'BOTH LOST' | 'DECLINED' | 'FORFEITED' = isVictory ? 'VICTORY' : 'DEFEAT';
          if (!isVictory) {
            if (r.status === 'both_won') derivedRunStatus = 'BOTH WON';
            else if (r.status === 'both_lost') derivedRunStatus = 'BOTH LOST';
            else if (r.status === 'cancelled') derivedRunStatus = 'DECLINED';
            else if (r.status === 'forfeited') derivedRunStatus = 'FORFEITED';
          }

          const distance = isUser1 ? r.user_1_distance : r.user_2_distance;
          const time = isUser1 ? r.user_1_time : r.user_2_time;

          const hrs = Math.floor(time / 3600);
          const mins = Math.floor((time % 3600) / 60);
          const secs = time % 60;
          const durStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          const distNum = Number(distance || 0);
          const base_xp = Math.floor(distNum >= 1 ? 100 + (distNum - 1) * 50 : distNum * 100);
          const earnedXp = (isVictory && distNum >= 1) ? base_xp + 100 : base_xp;

          merged.push({
            id: `run_${r.id}`,
            type: 'VERSUS RUN' as const,
            status: derivedRunStatus,
            name: `${r.target_distance}KM VERSUS RUN`,
            r: distance ? Number(distance).toFixed(2) + ' km' : '0 km',
            s: '',
            date: new Date(r.completed_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
            dur: durStr,
            opp: opponentProfile?.username || 'Unknown',
            oppAvatar: opponentProfile?.avatar_url || null,
            xp: earnedXp,
            timestamp: new Date(r.completed_at).getTime()
          });
        });
      }

      merged.sort((a, b) => b.timestamp - a.timestamp);
      setChallengeLogs(merged);
    } catch (err) {
      console.log('Error fetching challenge history:', err);
    }
  }, []);

  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    setAchievementsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_name')
        .eq('user_id', user.id);
      if (error) {
        console.error('Supabase error fetching achievements:', error.message);
        return;
      }
      if (data) {
        console.log('Fetched achievements:', data);
        setUnlockedAchievements(data.map(a => a.achievement_name));
      }
    } catch (err) {
      console.log('Error fetching achievements:', err);
    } finally {
      setAchievementsLoading(false);
    }
  }, []);

  const [showLifetimeArchive, setShowLifetimeArchive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchDailyXp(),
        fetchWorkoutHistory(),
        fetchChallenges(),
        fetchAchievements(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProfile, fetchDailyXp, fetchWorkoutHistory, fetchChallenges, fetchAchievements]);

  useFocusEffect(
    useCallback(() => {
      fetchChallenges();
      fetchProfile();
      fetchDailyXp();
      fetchWorkoutHistory();
      fetchAchievements();
    }, [fetchChallenges, fetchProfile, fetchDailyXp, fetchWorkoutHistory, fetchAchievements])
  );

  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [showDailyGains, setShowDailyGains] = useState(false);

  const achievements = ACHIEVEMENT_DATA.filter(a => unlockedAchievements.includes(a.id)).slice(0, 6);

  const flowAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(flowAnim, {
        toValue: width,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const getWorkoutTypeLabel = (type: string) => {
    switch (type) {
      case 'VERSUS_BATTLE': return 'Battle';
      case 'VERSUS_RUN': return 'Versus Run';
      case 'SOLO_WORKOUT': return 'Solo Workout';
      case 'SOLO_RUN': return 'Solo Run';
      case 'ACHIEVEMENT': return 'Achievement';
      default: return 'Workout';
    }
  };

  const getWorkoutTypeIcon = (type: string) => {
    switch (type) {
      case 'VERSUS_BATTLE': return '⚔';
      case 'VERSUS_RUN': return '🏃';
      case 'SOLO_WORKOUT': return '💪';
      case 'SOLO_RUN': return '👟';
      case 'ACHIEVEMENT': return '🏆';
      default: return '🏋';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#CCFF00"
            colors={['#CCFF00', '#8DEA0B']}
            progressBackgroundColor="#111111"
          />
        }
      >

        {/* ── HEADER ── */}
        <ImageBackground
          source={require('../assets/perfBG.png')}
          style={[styles.header, showInfoDropdown && styles.headerExpanded]}
          resizeMode="cover"
        >
          <View style={styles.gemContainer}>
            <Image
              source={require('../assets/xp_gem.png')}
              style={styles.headerGem}
            />

            {[...Array(20)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    top: Math.random() * 140 - 20,
                    left: Math.random() * 140 - 20,
                    width: Math.random() * 3 + 1,
                    height: Math.random() * 3 + 1,
                    opacity: Math.random() * 0.9 + 0.1,
                    backgroundColor: i % 3 === 0 ? '#8DEA0B' : '#FFFFFF',
                  }
                ]}
              />
            ))}
          </View>

          <View style={[styles.xpCard, showInfoDropdown && styles.xpCardExpanded]}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>   YOUR CUMULATIVE XP</Text>
              <TouchableOpacity
                onPress={() => setShowInfoDropdown(!showInfoDropdown)}
                activeOpacity={0.7}
              >
                <Image source={require('../assets/info.png')} style={styles.infoIcon} />
              </TouchableOpacity>
            </View>

            {showInfoDropdown && (
              <View>
                <Text style={styles.infoTooltipText}>
                  Your XP grows with every move. Earn points for every successful rep and
                  completed session to climb the leaderboards!
                </Text>
              </View>
            )}

            <Text style={styles.xpNumber}>{xpPoints} XP</Text>

            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFlow,
                  { transform: [{ translateX: flowAnim }] },
                ]}
              />
            </View>
          </View>
        </ImageBackground>

        {/* ── BODY ── */}
        <View style={styles.body}>

          <View style={styles.topButtonsRow}>
            <TouchableOpacity
              style={styles.dailyGainsBtn}
              onPress={() => setShowDailyGains(!showDailyGains)}
              activeOpacity={0.8}
            >
              <Text style={styles.dailyGainsTxt}>Daily Gains</Text>
              <Image source={showDailyGains ? require('../assets/dropup.png') : require('../assets/droppp.png')} style={styles.dropIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lifetimeBtn}
              onPress={() => setShowLifetimeArchive(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.lifetimeTxt}>Lifetime Archive</Text>
            </TouchableOpacity>
          </View>

          {showDailyGains && (
            <View style={styles.dailyGainsPanel}>
              {dailyXp > 0 ? (
                <View style={styles.dailyXpContainer}>
                  <View style={styles.dailyXpContent}>
                    <Text style={styles.dailyXpLabel}>TODAY'S GAINS</Text>
                    <View style={styles.dailyXpDisplay}>
                      <Text style={styles.dailyXpNumber}>{dailyXp}</Text>
                      <Text style={styles.dailyXpUnit}>XP</Text>
                    </View>
                  </View>
                  <Image
                    source={require('../assets/xp_gem.png')}
                    style={styles.dailyGemIcon}
                  />
                </View>
              ) : (
                <Text style={styles.noRecordText}>No XP collected today yet. Start a session to earn points!</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.leaderboardsBtnWrapper}
            onPress={() => navigation.navigate('LeaderboardsScreen' as never)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#161300', '#534600']}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.leaderboardsGradient}
            >
              <Text style={styles.leaderboardsTxt}>LEADERBOARDS</Text>
              <Image source={require('../assets/star0.png')} style={styles.starIcon} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.achievementsHeader}>
            <Text style={styles.achievementsTitle}>ACHIEVEMENTS</Text>
            <TouchableOpacity onPress={() => (navigation.navigate as any)('AchievementsScreen', { unlockedAchievements })}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.achievementsBody}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.achievementsContent}
          >
            {achievementsLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, width: width - 40 }}>
                <ActivityIndicator size="small" color="#CCFF00" />
              </View>
            ) : achievements.length > 0 ? (
              achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  style={styles.achievementItem}
                >
                  <Image source={achievement.image} style={styles.medalIcon} />
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.awaitingText}>Awaiting your first breakthrough</Text>
            )}
          </ScrollView>

          <View style={[styles.challengeHeaderRow, { zIndex: 10 }]}>
            <Text style={styles.challengeLogsTitle}>Challenge History</Text>
            <View style={{ zIndex: 10 }}>
              <TouchableOpacity 
                style={styles.challengeFilterBtn}
                onPress={() => setShowChallengeDropdown(!showChallengeDropdown)}
                activeOpacity={0.8}
              >
                <Text style={styles.challengeFilterTxt}>{challengeFilter === 'ALL' ? 'Sort By' : challengeFilter}</Text>
                <Image source={showChallengeDropdown ? require('../assets/dropup.png') : require('../assets/droppp.png')} style={styles.challengeFilterIcon} />
              </TouchableOpacity>
              
              {showChallengeDropdown && (
                <View style={styles.challengeDropdown}>
                  {['ALL', 'VICTORY', 'DEFEAT', 'FORFEITED'].map(f => (
                    <TouchableOpacity 
                      key={f} 
                      style={styles.challengeDropdownItem}
                      onPress={() => { setChallengeFilter(f as any); setShowChallengeDropdown(false); }}
                    >
                      <Text style={[styles.challengeDropdownTxt, challengeFilter === f && { color: '#CCFF00' }]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Type Filter Buttons */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
            {(['ALL', 'VERSUS WORKOUT', 'VERSUS RUN'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setChallengeTypeFilter(t)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: challengeTypeFilter === t ? '#CCFF00' : '#1A1A1A',
                  borderWidth: 1,
                  borderColor: challengeTypeFilter === t ? '#CCFF00' : '#333',
                }}
              >
                <Text style={{
                  color: challengeTypeFilter === t ? '#000' : '#888',
                  fontSize: 11,
                  fontFamily: 'Montserrat-Bold',
                }}>{t === 'ALL' ? 'All' : t === 'VERSUS WORKOUT' ? 'Workout' : 'Run'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.challengeLogsContainer}>
            {challengeLogs.filter(item => {
              // Type filter
              if (challengeTypeFilter !== 'ALL' && item.type !== challengeTypeFilter) return false;
              // Status filter
              if (challengeFilter === 'ALL') return true;
              if (challengeFilter === 'VICTORY') return item.status === 'VICTORY' || item.status === 'BOTH WON';
              if (challengeFilter === 'DEFEAT') return item.status === 'DEFEAT' || item.status === 'BOTH LOST';
              return item.status === challengeFilter;
            }).length > 0 ? challengeLogs.filter(item => {
              if (challengeTypeFilter !== 'ALL' && item.type !== challengeTypeFilter) return false;
              if (challengeFilter === 'ALL') return true;
              if (challengeFilter === 'VICTORY') return item.status === 'VICTORY' || item.status === 'BOTH WON';
              if (challengeFilter === 'DEFEAT') return item.status === 'DEFEAT' || item.status === 'BOTH LOST';
              return item.status === challengeFilter;
            }).map((item) => {
              const isVictory = item.status === 'VICTORY' || item.status === 'BOTH WON';
              const isDeclined = item.status === 'DECLINED';
              const isForfeited = item.status === 'FORFEITED';

              let bgColor = '#740000';
              if (isVictory) bgColor = '#416F00';
              else if (isDeclined || isForfeited) bgColor = '#333333';

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={styles.logWrapper}
                  onPress={() => {
                    setSelectedLog({
                      status: item.status as any,
                      exerciseName: item.name,
                      reps: item.r,
                      sets: item.s,
                      date: item.date,
                      duration: item.dur,
                      opponent: item.opp,
                      xp: item.xp
                    });
                    setChallengeModalVisible(true);
                  }}
                >
                  <View style={styles.logCard}>
                    <View style={[
                      styles.resultBanner,
                      { backgroundColor: bgColor }
                    ]}>
                      <Text style={[styles.resultText, (item.status.includes('BOTH') || item.status === 'FORFEITED' || item.status === 'DECLINED') && { fontSize: 10, paddingHorizontal: 2 }]}>
                        {item.status}
                      </Text>
                    </View>

                    <View style={styles.logInfo}>
                      <Text style={styles.logExerciseText} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.logStatsText}>{item.r} reps</Text>
                      {item.s !== '' && <Text style={styles.logStatsText}>{item.s} sets</Text>}
                    </View>

                    <View style={styles.opponentSection}>
                      <Text style={styles.opponentLabel}>OPPONENT</Text>
                      <Image
                        source={item.oppAvatar ? { uri: item.oppAvatar } : require('../assets/5.png')}
                        style={styles.opponentAvatar}
                      />
                      <Text style={styles.opponentName} numberOfLines={1}>{item.opp}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <Text style={[styles.noRecordText, { marginTop: 20 }]}>No challenges match your filter.</Text>
            )}
          </View>

        </View>
      </ScrollView>

      <ChallengeModal
        visible={challengeModalVisible}
        onClose={() => setChallengeModalVisible(false)}
        data={selectedLog}
      />

      {/* ── LIFETIME ARCHIVE MODAL ── */}
      <Modal
        visible={showLifetimeArchive}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLifetimeArchive(false)}
      >
        <SafeAreaView style={styles.archiveModalContainer}>
          <View style={styles.archiveHeader}>
            <TouchableOpacity
              onPress={() => setShowLifetimeArchive(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.archiveCloseBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.archiveTitle}>Lifetime Archive</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Filter and Sort Controls */}
          <View style={styles.archiveControlsContainer}>
            {/* Workout Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Workout Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {(['ALL', 'BATTLE', 'SOLO', 'ACHIEVEMENTS'] as WorkoutType[]).map((type) => {
                  const getLabel = () => {
                    if (type === 'ALL') return 'All Workouts';
                    if (type === 'BATTLE') return 'Versus';
                    if (type === 'SOLO') return 'Solo';
                    return 'Achievements';
                  };
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterButton,
                        selectedWorkoutType === type && styles.filterButtonActive
                      ]}
                      onPress={() => setSelectedWorkoutType(type)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        selectedWorkoutType === type && styles.filterButtonTextActive
                      ]}>
                        {getLabel()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {(() => {
                  let options: SortBy[] = [];
                  if (selectedWorkoutType === 'ALL') {
                    options = ['DATE_NEWEST', 'DATE_OLDEST', 'XP_HIGH', 'XP_LOW'];
                  } else if (selectedWorkoutType === 'BATTLE') {
                    options = ['VERSUS_WORKOUT', 'VERSUS_RUN'];
                  } else if (selectedWorkoutType === 'SOLO') {
                    options = ['WORKOUT', 'RUN'];
                  } else if (selectedWorkoutType === 'ACHIEVEMENTS') {
                    options = ['DATE_NEWEST', 'DATE_OLDEST'];
                  }

                  return options.map((sort) => {
                    const getLabel = () => {
                      if (sort === 'DATE_NEWEST') return 'Newest';
                      if (sort === 'DATE_OLDEST') return 'Oldest';
                      if (sort === 'XP_HIGH') return 'High XP';
                      if (sort === 'XP_LOW') return 'Low XP';
                      if (sort === 'VERSUS_WORKOUT') return 'Workout';
                      if (sort === 'VERSUS_RUN') return 'Run';
                      if (sort === 'WORKOUT') return 'Workout';
                      if (sort === 'RUN') return 'Run';
                      return 'Newest';
                    };
                    return (
                      <TouchableOpacity
                        key={sort}
                        style={[
                          styles.filterButton,
                          selectedSort === sort && styles.filterButtonActive
                        ]}
                        onPress={() => setSelectedSort(sort)}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          selectedSort === sort && styles.filterButtonTextActive
                        ]}>
                          {getLabel()}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>

          {/* Workout History List */}
          <ScrollView style={styles.archiveListContainer}>
            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <View key={workout.id} style={styles.archiveWorkoutCard}>
                  {/* Header with type and date */}
                  <View style={styles.archiveCardHeader}>
                    <View style={styles.workoutTypeSection}>
                      <View style={styles.workoutTypeIconContainer}>
                        <Text style={styles.workoutTypeIconText}>
                          {getWorkoutTypeIcon(workout.type)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.archiveWorkoutType}>{getWorkoutTypeLabel(workout.type)}</Text>
                        <Text style={styles.archiveWorkoutMode}>{workout.mode}</Text>
                      </View>
                    </View>
                    <Text style={styles.archiveWorkoutDate}>{workout.date}</Text>
                  </View>

                  {/* Exercise info */}
                  <View style={styles.archiveCardBody}>
                    <View style={styles.archiveExerciseInfo}>
                      <Text style={styles.archiveExerciseName} numberOfLines={2}>{workout.exerciseName}</Text>
                      <View style={styles.archiveStatsRow}>
                        {workout.type === 'VERSUS_BATTLE' && (
                          <>
                            {!!workout.reps && <Text style={styles.archiveStat}>{workout.reps} reps</Text>}
                            {!!workout.sets && <Text style={styles.archiveStat}>•</Text>}
                            {!!workout.sets && <Text style={styles.archiveStat}>{workout.sets} sets</Text>}
                          </>
                        )}
                        {(workout.type === 'VERSUS_RUN' || workout.type === 'SOLO_RUN') && (
                          <>
                            {!!workout.distance && <Text style={styles.archiveStat}>{workout.distance.toFixed(2)} km</Text>}
                            {!!workout.duration && <Text style={styles.archiveStat}>•</Text>}
                            {!!workout.duration && <Text style={styles.archiveStat}>{workout.duration}</Text>}
                          </>
                        )}
                        {workout.type === 'SOLO_WORKOUT' && (
                          <>
                            {!!workout.reps && <Text style={styles.archiveStat}>{workout.reps} reps</Text>}
                            {!!workout.sets && <Text style={styles.archiveStat}>•</Text>}
                            {!!workout.sets && <Text style={styles.archiveStat}>{workout.sets} sets</Text>}
                          </>
                        )}
                        {workout.type === 'ACHIEVEMENT' && (
                          <Text style={styles.archiveStat}>Awarded 1000 XP</Text>
                        )}
                      </View>
                    </View>

                    {/* XP and Opponent / Achievement Info */}
                    <View style={styles.archiveCardRight}>
                      {workout.type !== 'ACHIEVEMENT' && (
                        <View style={styles.archiveXpBadge}>
                          <Text style={styles.archiveXpValue}>{workout.xp}</Text>
                          <Text style={styles.archiveXpLabel}>XP</Text>
                        </View>
                      )}
                      {workout.opponent && (
                        <View style={styles.archiveOpponentInfo}>
                          <Image
                            source={workout.oppAvatar ? { uri: workout.oppAvatar } : require('../assets/5.png')}
                            style={styles.archiveOpponentAvatar}
                          />
                          <Text style={styles.archiveOpponentName} numberOfLines={1}>{workout.opponent}</Text>
                        </View>
                      )}
                      {workout.type === 'ACHIEVEMENT' && workout.image && (
                        <View style={styles.archiveOpponentInfo}>
                          <Image
                            source={workout.image}
                            style={[styles.archiveOpponentAvatar, { backgroundColor: 'transparent' }]}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                    </View>
                  </View>

                  {workout.type === 'ACHIEVEMENT' && workout.description && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: '#9FAE64', fontFamily: 'Montserrat-Medium', fontSize: 11 }}>{workout.description}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.archiveEmpty}>
                <Text style={styles.archiveEmptyText}>
                  {workoutHistory.length === 0
                    ? 'No workouts yet. Start your first session!'
                    : 'No workouts match your filters.'}
                </Text>
              </View>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default PerformanceScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121310',
    marginBottom: -10,
  },
  container: {
    flex: 1,
    backgroundColor: '#121310',
  },

  // ── HEADER ──
  header: {
    width: '106%',
    height: 242,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  gemContainer: {
    position: 'absolute',
    left: 24,
    bottom: 12,
    zIndex: 10,
    elevation: 12,
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGem: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    zIndex: 15,
    shadowColor: '#8DEA0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
    zIndex: 11,
    shadowColor: '#8DEA0B',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  headerExpanded: {
    height: 312,
  },
  xpCard: {
    borderRadius: 16,
    backgroundColor: '#081007',
    width: 322,
    height: 130,
    padding: 20,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 1,
    elevation: 20,
    right: -80,
    marginTop: 40,
  },
  xpCardExpanded: {
    height: 200,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  xpLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
  },
  infoIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
    right: 20,
  },
  infoTooltipText: {
    color: '#71E948',
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 18,
    textAlign: 'right',
    width: 255,
    marginTop: 10,
  },
  xpNumber: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Black',
    fontSize: 40,
    marginVertical: 5,
    alignSelf: 'center',
  },

  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E2E1C',
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: -10
  },
  barFlow: {
    width: 120,
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#64C343',
    opacity: 0.9,
    shadowColor: '#64C343',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // ── BODY ──
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  topButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    height: 40,
  },
  dailyGainsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#9FAE64',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
  },
  dailyGainsTxt: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  dropIcon: {
    width: 14,
    height: 14,
    tintColor: '#000',
  },
  lifetimeBtn: {
    borderRadius: 15,
    borderWidth: 0.3,
    borderColor: '#EEFFAB',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifetimeTxt: {
    color: '#EEFFAB',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },

  dailyGainsPanel: {
    backgroundColor: '#111A0F',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#9FAE64',
    padding: 16,
    marginBottom: 16,
  },
  dailyXpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyXpContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dailyXpLabel: {
    color: '#9FAE64',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dailyXpDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dailyXpNumber: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Black',
    fontSize: 32,
  },
  dailyXpUnit: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  dailyGemIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 8,
    shadowColor: '#8DEA0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  noRecordText: {
    color: '#9FAE64',
    fontFamily: 'Montserrat',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  leaderboardsBtnWrapper: {
    marginTop: 10,
    width: 353,
    height: 45,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FFF5BC',
    marginBottom: 40,
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 25,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  leaderboardsGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  leaderboardsTxt: {
    fontFamily: 'Montserrat-ExtraBold',
    color: '#FFF5BC',
    fontSize: 18,
    marginRight: 10,
  },
  starIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },

  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 12,
  },
  achievementsTitle: {
    color: '#e4f4a6',
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
  },
  seeAll: {
    color: '#ccff00',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
  },
  achievementsBody: {
    backgroundColor: '#1F2118',
    width: '120%',
    marginLeft: -20,
    marginRight: -20,
    marginBottom: 40,
    borderRadius: 0,
  },
  achievementsContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    width: 100,
    flexShrink: 0,
  },
  medalIcon: {
    width: 81,
    height: 94,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  achievementName: {
    color: '#f0d158',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  awaitingText: {
    color: '#666',
    fontFamily: 'Montserrat-Bold',
    fontStyle: 'italic',
    fontSize: 13,
  },

  challengeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  challengeLogsTitle: {
    color: '#e4f4a6',
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
  },
  challengeFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6,
  },
  challengeFilterTxt: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
  },
  challengeFilterIcon: {
    width: 10,
    height: 10,
    tintColor: '#fff',
  },
  challengeDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 5,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 8,
    minWidth: 120,
    zIndex: 100,
  },
  challengeDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  challengeDropdownTxt: {
    color: '#fff',
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
  },
  challengeLogsContainer: {
    paddingBottom: 20,
  },
  logWrapper: {
    backgroundColor: '#0D0E09',
    borderRadius: 22,
    height: 125,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  logCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultBanner: {
    width: '30%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ skewX: '-25deg' }],
    left: -25,
    paddingLeft: 25,
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    transform: [{ skewX: '25deg' }],
    textAlign: 'center',
  },
  logInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  logExerciseText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  logStatsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Barlow-Medium',
    marginTop: -2,
  },
  opponentSection: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  opponentLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Montserrat-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.8,
  },
  opponentAvatar: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#222',
  },
  opponentName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Barlow-Bold',
    marginTop: 5,
    opacity: 0.9,
  },

  // ── LIFETIME ARCHIVE MODAL ──
  archiveModalContainer: {
    flex: 1,
    backgroundColor: '#121310',
  },
  archiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  archiveCloseBtn: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
  archiveTitle: {
    color: '#e4f4a6',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
  },

  archiveControlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    color: '#9FAE64',
    fontFamily: 'Montserrat-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterButtonActive: {
    backgroundColor: '#9FAE64',
    borderColor: '#9FAE64',
  },
  filterButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },

  archiveListContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  archiveWorkoutCard: {
    backgroundColor: '#0D0E09',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  archiveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutTypeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutTypeIconText: {
    fontSize: 18,
    color: '#CCFF00',
  },
  archiveWorkoutType: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Bold',
    fontSize: 13,
  },
  archiveWorkoutMode: {
    color: '#9FAE64',
    fontFamily: 'Barlow-Medium',
    fontSize: 11,
    marginTop: -2,
  },
  archiveWorkoutDate: {
    color: '#666',
    fontFamily: 'Barlow-Medium',
    fontSize: 11,
  },

  archiveCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  archiveExerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  archiveExerciseName: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    marginBottom: 6,
  },
  archiveStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archiveStat: {
    color: '#AAA',
    fontFamily: 'Barlow-Medium',
    fontSize: 12,
  },

  archiveCardRight: {
    alignItems: 'flex-end',
  },
  archiveXpBadge: {
    backgroundColor: '#081007',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  archiveXpValue: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Black',
    fontSize: 18,
  },
  archiveXpLabel: {
    color: '#9FAE64',
    fontFamily: 'Montserrat-Bold',
    fontSize: 9,
    textAlign: 'center',
  },

  archiveOpponentInfo: {
    alignItems: 'center',
    gap: 4,
  },
  archiveOpponentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  archiveOpponentName: {
    color: '#fff',
    fontFamily: 'Barlow-SemiBold',
    fontSize: 10,
    maxWidth: 50,
  },

  archiveEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  archiveEmptyText: {
    color: '#666',
    fontFamily: 'Montserrat',
    fontSize: 14,
    textAlign: 'center',
  },
});