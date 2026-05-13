import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Finding from '../components/Finding';
import ExerciseModal from '../components/ExerciseModal';
import DistanceSelectionModal from '../components/DistanceSelectionModal';
import MatchFoundModal from '../components/MatchFoundModal';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useVersusMatchmaking } from '../services/useVersusMatchmaking';
import { useHealth } from '../context/HealthContext';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [isRunFinding, setIsRunFinding] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState({ type: '', exercises: [] as string[] });

  const { heartRate } = useHealth();

  const { matchState, startMatchmaking: startRunMatchmaking, cancelMatchmaking: cancelRunMatchmaking, acceptMatch } = useVersusMatchmaking();
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<{ name: string; xp: number; avatar?: any }>({ name: 'You', xp: 0 });

  // New states for workout two-way accept/decline flow
  const [showWorkoutMatchModal, setShowWorkoutMatchModal] = useState(false);
  const [workoutOpponentData, setWorkoutOpponentData] = useState<{ name: string; xp: number; avatar?: any } | null>(null);
  const [workoutCurrentUserData, setWorkoutCurrentUserData] = useState<{ name: string; xp: number; avatar?: any } | null>(null);
  const [workoutMatchId, setWorkoutMatchId] = useState<string | null>(null);
  const [workoutConfig, setWorkoutConfig] = useState<{ exercise: string; sets: number; reps: number } | null>(null);
  const isPlayer1Ref = useRef<boolean>(false);
  const hasMatchedRef = useRef<boolean>(false);

  // Refs to manage our network connections so we can cancel them cleanly
  const realtimeSubRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workoutPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myMatchIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // ─── PURGE STALE RECORDS ───
  // Deletes any ghost 'waiting' or 'cancelled' records for the current user
  const cleanupStaleRecords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const userId = session.user.id;
      currentUserIdRef.current = userId;

      console.log('🧹 [Stale Cleanup] Purging ghost records for user:', userId);

      // Call the database RPC to clean up stale records
      const { error: rpcError } = await supabase.rpc('cleanup_stale_workout_matches', { p_user_id: userId });
      if (rpcError) {
        console.warn('⚠️ [Stale Cleanup] RPC failed, falling back to manual cleanup:', rpcError.message);
        // Fallback: manually delete stale records for this user
        await supabase.from('versus_battles').delete()
          .eq('player1_id', userId)
          .in('status', ['waiting', 'cancelled']);
        await supabase.from('versus_battles').delete()
          .eq('player2_id', userId)
          .in('status', ['waiting', 'cancelled']);
      } else {
        console.log('✅ [Stale Cleanup] Ghost records purged successfully');
      }
    } catch (err) {
      console.error('❌ [Stale Cleanup] Error:', err);
    }
  };

  // ─── SAFE CLEANUP FUNCTION ───
  // This completely stops the search, disconnects the listener, and deletes the empty room
  const cleanupWorkoutMatchmaking = async (deleteRow: boolean = true) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (workoutPollingRef.current) clearInterval(workoutPollingRef.current);
    
    if (realtimeSubRef.current) {
      supabase.removeChannel(realtimeSubRef.current);
      realtimeSubRef.current = null;
    }
    
    if (deleteRow) {
      // Delete by myMatchIdRef (Player 1 scenario)
      if (myMatchIdRef.current) {
        await supabase.from('versus_battles').delete().eq('id', myMatchIdRef.current);
        myMatchIdRef.current = null;
      }
      // Also delete by workoutMatchId state (Player 2 scenario — joiner never sets myMatchIdRef)
      if (workoutMatchId) {
        await supabase.from('versus_battles').delete().eq('id', workoutMatchId);
      }
    }

    // reset workout modal & states
    setShowWorkoutMatchModal(false);
    setWorkoutOpponentData(null);
    setWorkoutCurrentUserData(null);
    setWorkoutMatchId(null);
    isPlayer1Ref.current = false;
    hasMatchedRef.current = false;

    setIsFinding(false);
  };

  // ─── CLEANUP ON MOUNT & UNMOUNT ───
  useEffect(() => {
    // On mount: purge any leftover ghost records from previous sessions/crashes
    cleanupStaleRecords();

    return () => {
      // On unmount: clean up any active matchmaking
      cleanupWorkoutMatchmaking();
    };
  }, []);

  // ─── MATCHMAKING LOGIC ───
  const startWorkoutMatchmaking = async (exercise: string, sets: number, reps: number) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user.');
        await cleanupWorkoutMatchmaking();
        return;
      }

      const userId = session.user.id;
      currentUserIdRef.current = userId;

      // 🧹 Purge any ghost records before starting a new search
      await cleanupStaleRecords();

      setWorkoutConfig({ exercise, sets, reps });

      // 1. Search for a waiting match with the EXACT SAME RULES
      const { data: waitingMatches, error: searchError } = await supabase
        .from('versus_battles')
        .select('*')
        .eq('status', 'waiting')
        .eq('exercise_name', exercise)
        .eq('target_sets', Number(sets) || 1)
        .eq('target_reps', Number(reps) || 10)
        .neq('player1_id', userId) // Don't match with ourselves
        .limit(1);

      if (searchError) throw searchError;

      // 🎉 WE ARE PLAYER 2: A match was found!
      if (waitingMatches && waitingMatches.length > 0) {
        const match = waitingMatches[0];
        
        // Join the match by updating the database
        const { data: updatedMatch, error: updateError } = await supabase
          .from('versus_battles')
          .update({
            player2_id: userId,
            status: 'matched'
          })
          .eq('id', match.id)
          .select();

        if (updateError) throw updateError;
        if (!updatedMatch || updatedMatch.length === 0) {
          console.error("Failed to join match: RLS policy might be preventing the update.");
          Alert.alert('Matchmaking Error', 'Could not join the match. Please check database permissions (RLS).');
          await cleanupWorkoutMatchmaking();
          return;
        }

        // Fetch opponent (player1) profile and show accept/decline modal
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, xp, avatar_url')
            .eq('id', match.player1_id)
            .single();

          if (!profileError && profile) {
            setWorkoutOpponentData({ name: profile.username || 'Opponent', xp: profile.xp || 0, avatar: profile.avatar_url });
          } else {
            setWorkoutOpponentData({ name: 'Opponent', xp: 0 });
          }
        } catch (err) {
          console.error('Error fetching opponent profile:', err);
          setWorkoutOpponentData({ name: 'Opponent', xp: 0 });
        }

        setWorkoutMatchId(match.id);
        isPlayer1Ref.current = false; // we're player2 here
        setIsFinding(false);
        setShowWorkoutMatchModal(true);

        const handleUpdateP2 = async (newRow: any) => {
          if (newRow.player1_accepted && newRow.player2_accepted) {
            setShowWorkoutMatchModal(false);
            await cleanupWorkoutMatchmaking(false); // DO NOT DELETE THE ROW!
            const isPlayer1 = userId === newRow.player1_id;
            navigation.navigate('LiveVersusRoutine', { matchId: match.id, isPlayer1 });
          }
          if (newRow.status === 'cancelled') {
            console.log('⚠️ [P2] Opponent cancelled the match. Stopping.');
            await cleanupWorkoutMatchmaking();
            Alert.alert('Match Cancelled', 'Your opponent cancelled the match. Tap Find Match to search again.');
          }
        };

        // Subscribe to accept/decline updates for this match
        const channel = supabase.channel(`match_${match.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'versus_battles', filter: `id=eq.${match.id}` },
            async (payload) => handleUpdateP2(payload.new)
          )
          .subscribe();

        realtimeSubRef.current = channel;

        // Polling fallback — also detects if row was deleted (ghost protection)
        workoutPollingRef.current = setInterval(async () => {
          try {
            const { data, error } = await supabase.from('versus_battles').select('*').eq('id', match.id).single();
            if (error || !data) {
              // Row was deleted by the other player — treat as cancelled
              console.log('👻 [P2 Polling] Match row disappeared — opponent cancelled.');
              await cleanupWorkoutMatchmaking();
              Alert.alert('Match Cancelled', 'Your opponent left the match. Tap Find Match to search again.');
              return;
            }
            handleUpdateP2(data);
          } catch(e) {}
        }, 1000);

        return;
      }

      // ⏳ WE ARE PLAYER 1: No match found. Create a room and wait.
      const { data: newMatch, error: createError } = await supabase
        .from('versus_battles')
        .insert([{
          player1_id: userId,
          exercise_name: exercise || 'Workout',
          target_sets: Number(sets) || 1,
          target_reps: Number(reps) || 10,
          status: 'waiting'
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      // Save ID so we can delete it if we hit Cancel
      myMatchIdRef.current = newMatch.id; 

      const handleUpdateP1 = async (newRow: any) => {
        // When Player 2 updates the row to 'matched', fetch opponent and show modal
        if (newRow.status === 'matched' && newRow.player2_id) {
          if (!hasMatchedRef.current) {
            hasMatchedRef.current = true;

            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, xp, avatar_url')
                .eq('id', newRow.player2_id)
                .single();

              if (!profileError && profile) {
                setWorkoutOpponentData({ name: profile.username || 'Opponent', xp: profile.xp || 0, avatar: profile.avatar_url });
              } else {
                setWorkoutOpponentData({ name: 'Opponent', xp: 0 });
              }
            } catch (err) {
              console.error('Error fetching opponent profile:', err);
              setWorkoutOpponentData({ name: 'Opponent', xp: 0 });
            }

            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            setWorkoutMatchId(newMatch.id);
            isPlayer1Ref.current = true; // creator is player1
            setIsFinding(false);
            setShowWorkoutMatchModal(true);
          }
        }

        // If both accepted, navigate
        if (newRow.player1_accepted && newRow.player2_accepted) {
          setShowWorkoutMatchModal(false);
          await cleanupWorkoutMatchmaking(false); // DO NOT DELETE THE ROW!
          // navigate as player1 if the creator is player1
          navigation.navigate('LiveVersusRoutine', { matchId: newMatch.id, isPlayer1: true });
        }

        if (newRow.status === 'cancelled') {
          console.log('⚠️ [P1] Player 2 cancelled the match. Stopping.');
          await cleanupWorkoutMatchmaking();
          Alert.alert('Match Cancelled', 'Your opponent declined the match. Tap Find Match to search again.');
        }
      };

      // Set up a Realtime Listener on our new row
      const channel = supabase.channel(`match_${newMatch.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'versus_battles', filter: `id=eq.${newMatch.id}` },
          async (payload) => handleUpdateP1(payload.new)
        )
        .subscribe();

      realtimeSubRef.current = channel;

      // Polling fallback & Race Condition Fix
      workoutPollingRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase.from('versus_battles').select('*').eq('id', newMatch.id).single();
          
          // If our own row disappeared, another player deleted it or it was cleaned up
          if (error || !data) {
            console.log('👻 [P1 Polling] Our waiting row disappeared. Stopping.');
            if (workoutPollingRef.current) clearInterval(workoutPollingRef.current);
            return;
          }

          handleUpdateP1(data);
            
          // 🔥 RACE CONDITION FIX 🔥
          // If we are still waiting, check if there's an OLDER match we can merge into
          if (data.status === 'waiting' && !hasMatchedRef.current) {
            const { data: olderMatches } = await supabase
              .from('versus_battles')
              .select('id')
              .eq('status', 'waiting')
              .eq('exercise_name', exercise)
              .eq('target_sets', sets)
              .eq('target_reps', reps)
              .is('player2_id', null)
              .neq('id', newMatch.id)
              .lt('created_at', data.created_at) // MUST BE OLDER
              .order('created_at', { ascending: true })
              .limit(1);
              
            if (olderMatches && olderMatches.length > 0) {
              console.log("Race condition detected! Found an older match. Merging...");
              // Stop our current finding process and delete our newly created room
              await cleanupWorkoutMatchmaking(); 
              // Wait a tiny bit and restart matchmaking so we cleanly join the older room as Player 2
              setTimeout(() => startWorkoutMatchmaking(exercise, sets, reps), 500);
            }
          }
        } catch(e) {}
      }, 1500);

      // Automatically cancel after 30 seconds if nobody joins
      timeoutRef.current = setTimeout(async () => {
        await cleanupWorkoutMatchmaking();
         Alert.alert(
           'No Opponent Found',
           `Nobody is looking to do ${sets} sets of ${reps} ${exercise} right now. Try again later!`
         );
      }, 30000);

    } catch (error) {
      console.error('Matchmaking error:', error);
      await cleanupWorkoutMatchmaking();
      Alert.alert('Error', 'Matchmaking failed. Please try again.');
    }
  };


  // ─── UI HANDLERS ───
  const handleRoutineSelect = (routine: any) => {
    setSelectedRoutine({ type: routine.type, exercises: routine.exercises });
    setExerciseModalVisible(true);
  };

  const handleConfirmExercises = (exercise: string, sets: number, reps: number) => {
    setExerciseModalVisible(false);
    setIsFinding(true); 
    
    // We use a tiny timeout to let the UI render the "Finding" modal 
    // before we freeze the app with heavy network database calls!
     setTimeout(() => {
       startWorkoutMatchmaking(exercise, sets, reps);
     }, 100);
  };

  const handleCancelFinding = async () => {
    Alert.alert(
      'Cancel Matchmaking?',
      'Are you sure you want to stop looking for an opponent?',
      [
        { text: 'No, keep waiting', style: 'cancel' },
        { 
          text: 'Yes, stop', 
          style: 'destructive',
          onPress: async () => {
            // Step 1: Set status to 'cancelled' FIRST so the other player's listener is notified
            if (myMatchIdRef.current) {
              console.log('🛑 [Cancel] Setting status to cancelled for row:', myMatchIdRef.current);
              await supabase.from('versus_battles')
                .update({ status: 'cancelled' })
                .eq('id', myMatchIdRef.current);
            }
            if (workoutMatchId) {
              console.log('🛑 [Cancel] Setting status to cancelled for row:', workoutMatchId);
              await supabase.from('versus_battles')
                .update({ status: 'cancelled' })
                .eq('id', workoutMatchId);
            }

            // Step 2: Clean up listeners, polling, timeouts, and delete the row
            await cleanupWorkoutMatchmaking(); 
          }
        }
      ]
    );
  };

  const handleRunPress = () => {
    // Open the distance selector modal first
    setDistanceModalVisible(true);
  };

  const handleDistanceSelect = async (distance: 1 | 3 | 5) => {
    setDistanceModalVisible(false);
    setIsRunFinding(true);
    try {
      await startRunMatchmaking(distance);
    } catch (err) {
      console.error('Run matchmaking start error:', err);
      setIsRunFinding(false);
      Alert.alert('Error', 'Failed to start run matchmaking. Please try again.');
    }
  };

  const handleDistanceCancel = () => setDistanceModalVisible(false);

  // Fetch current user data for use in the workout MatchFoundModal
  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user?.id) return;
        const userId = session.user.id;
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, xp, avatar_url')
          .eq('id', userId)
          .single();
        if (!error && profile) {
          setWorkoutCurrentUserData({ name: profile.username || 'You', xp: profile.xp || 0, avatar: profile.avatar_url });
        }
      } catch (err) {
        console.error('Error fetching current user for workout modal:', err);
      }
    })();
  }, []);

  // --- Accept / Decline handlers for workout matchmaking ---
  const handleAcceptWorkoutMatch = async () => {
    try {
      if (!workoutMatchId) return;

      const updates: any = {};
      if (isPlayer1Ref.current) updates.player1_accepted = true;
      else updates.player2_accepted = true;

      const { data: updatedMatch, error: updateError } = await supabase
        .from('versus_battles')
        .update(updates)
        .eq('id', workoutMatchId)
        .select();

      if (updateError) throw updateError;
      if (!updatedMatch || updatedMatch.length === 0) {
        console.error("Failed to accept match: RLS policy might be preventing the update.");
        Alert.alert('Matchmaking Error', 'Could not accept the match. Please check database permissions (RLS).');
        return;
      }
    } catch (err) {
      console.error('Accept workout match error:', err);
      Alert.alert('Error', 'Failed to accept match.');
    }
  };

  const handleDeclineWorkoutMatch = async () => {
    try {
      const matchIdToDecline = workoutMatchId;
      if (!matchIdToDecline) return;

      console.log('👎 [Decline] Declining match:', matchIdToDecline);

      // Step 1: Update status to 'cancelled' so the other player's listener is notified
      const { error: updateError } = await supabase
        .from('versus_battles')
        .update({ status: 'cancelled' })
        .eq('id', matchIdToDecline);

      if (updateError) console.error('⚠️ [Decline] Error updating status:', updateError);

      // Step 2: Clean up local state (this also clears workoutMatchId)
      setShowWorkoutMatchModal(false);
      await cleanupWorkoutMatchmaking(false); // Don't delete yet — we handle it below

      // Step 3: Give the other player's listener a moment to see 'cancelled', then delete the row
      setTimeout(async () => {
        console.log('🗑️ [Decline] Deleting cancelled match row:', matchIdToDecline);
        await supabase.from('versus_battles').delete().eq('id', matchIdToDecline);
      }, 1500);

      // Step 4: Restart matchmaking with a fresh search
      if (workoutConfig) {
        setIsFinding(true);
        setTimeout(() => {
          startWorkoutMatchmaking(workoutConfig.exercise, workoutConfig.sets, workoutConfig.reps);
        }, 2000); // Wait for the delete to complete before re-searching
      }
    } catch (err) {
      console.error('❌ [Decline] Error declining match:', err);
      Alert.alert('Error', 'Failed to decline match.');
    }
  };

  useEffect(() => {
    // When a match is found, show the MatchFoundModal and fetch current user profile
    if (matchState.status === 'found' && matchState.opponent && matchState.matchId) {
      setIsRunFinding(false);
      setMatchModalVisible(true);

      (async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session?.user?.id) return;
          const userId = session.user.id;
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, xp, avatar_url')
            .eq('id', userId)
            .single();
          if (!error && profile) {
            setCurrentProfile({ name: profile.username || 'You', xp: profile.xp || 0, avatar: profile.avatar_url });
          }
        } catch (err) {
          console.error('Error fetching current profile for match modal:', err);
        }
      })();
    }

    if (matchState.status === 'error') {
      setIsRunFinding(false);
      setMatchModalVisible(false);
      Alert.alert('Error', matchState.error || 'Matchmaking failed.');
    }
  }, [matchState]);

  // Navigate only after both users accepted the match
  useEffect(() => {
    // Only navigate when both have accepted AND the local user has accepted.
    if (
      matchState.status === 'both_accepted' &&
      matchState.opponent &&
      matchState.matchId &&
      matchState.userAccepted === true
    ) {
      setMatchModalVisible(false);
      navigation.navigate('VersusRun', {
        opponentUsername: matchState.opponent.username || 'Runner',
        opponentId: matchState.opponent.id,
        matchId: matchState.matchId,
        targetDistance: matchState.targetDistance,
      });
    }
  }, [matchState]);

  const routines = [
    { type: 'PUSH', sub: 'Chest, Shoulders, Triceps', icon: require('../assets/push.png'), exercises: ['Push Ups', 'Bench Press', 'Tricep Dips']},
    { type: 'PULL', sub: 'Back, Biceps',              icon: require('../assets/pull.png'), exercises: ['Pull Ups', 'Seated Cable Row', 'Bicep Curls'] },
    { type: 'LEG',  sub: 'Lower Body',                icon: require('../assets/leg.png'),  exercises: ['Squats', 'Lunges', 'Leg Extensions'] },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <LinearGradient
        colors={['#432B16', '#000000']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../assets/back0.png')} style={styles.backBtn} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VERSUS WORKOUT</Text>
      </LinearGradient>

      {/* Stats Card */}
      <LinearGradient
        colors={['#000000', '#323C2E']}
        start={{ x: 0.02, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.statsCard} 
      >
        <View style={{ position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, marginRight: 4 }}>❤️</Text>
          <Text style={{ color: '#FF4444', fontSize: 12, fontFamily: 'Barlow-Bold' }}>
            {heartRate !== null && heartRate !== undefined ? `${heartRate} BPM` : '-- BPM'}
          </Text>
        </View>
        <Text style={styles.labelSmall}>DURATION</Text>
        <Text style={styles.timerText}>00:00:00</Text>
        <View style={styles.row}>
          <View style={styles.statGroup}>
            <Text style={styles.labelTiny}>Total Repetition</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statGroup}>
            <Text style={styles.labelTiny}>Total Sets</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.chooseModeTitle}>Choose Mode</Text>

      {/* WORKOUT Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setWorkoutExpanded(!workoutExpanded)}
        style={styles.modeButtonWrapper}
      >
        <LinearGradient
          colors={['#000000', '#0F4933']}
          start={{ x: 0.8, y: 0.5 }}
          end={{ x: 0.27, y: 0.5 }}
          style={styles.modeButton}
        >
          <View style={styles.modeButtonTopRow}>
            <Text style={styles.modeButtonText}>WORKOUT</Text>
            <Image
              source={
                workoutExpanded
                  ? require('../assets/down.png')
                  : require('../assets/gooo.png')
              }
              style={styles.modeButtonIcon}
            />
          </View>

          {workoutExpanded && (
            <View style={styles.dropdownInner}>
              <Text style={styles.dropdownLabel}>Select your routine</Text>
              <View style={styles.routinesRow}>
                {routines.map((routine) => (
                  <TouchableOpacity 
                    key={routine.type} 
                    style={styles.routineCardWrapper}
                    onPress={() => handleRoutineSelect(routine)} 
                  >
                    <LinearGradient
                      colors={['#180020', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.routineCard}
                    >
                      <Image source={routine.icon} style={styles.routineIcon} />
                      <Text style={styles.routineTitle}>{routine.type}</Text>
                      <Text style={styles.routineSub}>{routine.sub}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* RUN Button */}
      <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRunPress}
          style={styles.modeButtonWrapper}
        >
        <LinearGradient
          colors={['#000000', '#193845']}
          start={{ x: 0.8, y: 0.5 }}
          end={{ x: 0.27, y: 0.5 }}
          style={styles.modeButton}
        >
          <View style={styles.modeButtonTopRow}>
            <Text style={styles.modeButtonText}>RUN</Text>
            <Image source={require('../assets/gooo.png')} style={styles.modeButtonIcon} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* PASS THE onCancel PROP! */}
      <Finding visible={isFinding} onCancel={handleCancelFinding} />

      {/* Distance selector for RUN mode */}
      <DistanceSelectionModal
        visible={distanceModalVisible}
        onSelect={handleDistanceSelect}
        onCancel={handleDistanceCancel}
      />

      {/* Finding modal for run matchmaking */}
      <Finding
        visible={isRunFinding}
        onCancel={async () => {
          await cancelRunMatchmaking();
          setIsRunFinding(false);
        }}
      />

      {/* Match found acceptance modal */}
      <MatchFoundModal
        visible={matchModalVisible}
        currentUser={{ name: currentProfile.name, xp: currentProfile.xp, avatar: currentProfile.avatar }}
        opponent={{ name: matchState.opponent?.username || 'Opponent', xp: matchState.opponent?.xp || 0, avatar: matchState.opponent?.avatar_url }}
        targetDistance={matchState.targetDistance}
        onAccept={async () => {
          try {
            await acceptMatch();
          } catch (err) {
            console.error('Accept match error:', err);
            Alert.alert('Error', 'Failed to accept match.');
          }
        }}
        onDecline={async () => {
          try {
            await cancelRunMatchmaking();
          } catch (err) {
            console.error('Decline match error:', err);
          }
          setMatchModalVisible(false);
          setIsRunFinding(false);
        }}
      />

      {/* Workout Match Found Modal (two-way accept/decline) */}
      <MatchFoundModal
        visible={showWorkoutMatchModal}
        currentUser={{ name: workoutCurrentUserData?.name || 'You', xp: workoutCurrentUserData?.xp || 0, avatar: workoutCurrentUserData?.avatar }}
        opponent={{ name: workoutOpponentData?.name || 'Opponent', xp: workoutOpponentData?.xp || 0, avatar: workoutOpponentData?.avatar }}
        isWorkoutMode={true}
        workoutConfig={workoutConfig || undefined}
        onAccept={handleAcceptWorkoutMatch}
        onDecline={handleDeclineWorkoutMatch}
      />

      <ExerciseModal 
        visible={exerciseModalVisible}
        routineType={selectedRoutine.type}
        exercises={selectedRoutine.exercises}
        onClose={() => setExerciseModalVisible(false)} 
        onConfirm={handleConfirmExercises} 
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 65,
    marginBottom: 32,
    width: 500,
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    left: -20,
  },
 backBtn: { 
    width: 30, 
    height: 30, 
    position: 'absolute', 
    left: 12,
    marginTop: -65,
  },
  headerTitle: {
    color: '#d1d1d1',
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    right: -70,
  },
  statsCard: {
    borderRadius: 15,
    padding: 30,
    marginTop: -15,
    alignItems: 'center',
  },
  labelSmall: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 5,
  },
  labelTiny: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
  },
  statGroup: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#A3CF06',
    fontSize: 30,
    fontFamily: 'Barlow-Bold',
  },
  timerText: {
    color: '#A3CF06',
    fontSize: 40,
    fontFamily: 'Barlow-Bold',
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },

  chooseModeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat-SemiBold',
    marginTop: 32,
    marginBottom: 10,
    right: -15,
  },

 modeButtonWrapper: {
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 14,
  marginTop: 5,
},
modeButton: {
  borderRadius: 16,
  paddingVertical: 22,
  paddingHorizontal: 20,
},
modeButtonTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
modeButtonText: {
  color: '#FFFFFF',
  fontSize: 20,
  fontFamily: 'Montserrat-ExtraBold',
  right: -15,
},
modeButtonIcon: {
  width: 25,
  height: 25,
  resizeMode: 'contain',
  left: -15,
},

dropdownInner: {
  marginTop: 10,
},
dropdownLabel: {
  color: '#CCCCCC',
  fontSize: 13,
  fontFamily: 'Montserrat-Regular',
  marginBottom: 15,
  right: -15,
},
routinesRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10,
},
routineCardWrapper: {
  flex: 1,
  borderRadius: 14,
  overflow: 'hidden',
},
routineCard: {
  borderRadius: 14,
  paddingVertical: 20,
  paddingHorizontal: 8,
  alignItems: 'center',
},
routineIcon: {
  width: 50,
  height: 50,
  resizeMode: 'contain',
  marginBottom: 10,
},
routineTitle: {
  color: '#ffffff',
  fontSize: 16,
  fontFamily: 'Montserrat-Bold',
  textAlign: 'left',
},
routineSub: {
  color: '#888888',
  fontSize: 9,
  fontFamily: 'Montserrat-Regular',
  textAlign: 'center',
  marginTop: 4,
},
});

export default VersusWorkoutScreen;