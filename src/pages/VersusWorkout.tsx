import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Finding from '../components/Finding';
import ExerciseModal from '../components/ExerciseModal';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState({ type: '', exercises: [] as string[] });

  // Refs to manage our network connections so we can cancel them cleanly
  const realtimeSubRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myMatchIdRef = useRef<string | null>(null);

  // ─── SAFE CLEANUP FUNCTION ───
  // This completely stops the search, disconnects the listener, and deletes the empty room
  const cleanupMatchmaking = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (realtimeSubRef.current) {
      supabase.removeChannel(realtimeSubRef.current);
      realtimeSubRef.current = null;
    }
    
    if (myMatchIdRef.current) {
      await supabase.from('versus_battles').delete().eq('id', myMatchIdRef.current);
      myMatchIdRef.current = null;
    }
    
    setIsFinding(false);
  };

  // ─── MATCHMAKING LOGIC ───
  const startMatchmaking = async (exercise: string, sets: number, reps: number) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user.');
        await cleanupMatchmaking();
        return;
      }

      const userId = session.user.id;

      // 1. Search for a waiting match with the EXACT SAME RULES
      const { data: waitingMatches, error: searchError } = await supabase
        .from('versus_battles')
        .select('*')
        .eq('status', 'waiting')
        .eq('exercise_name', exercise)
        .eq('target_sets', sets)
        .eq('target_reps', reps)
        .neq('player1_id', userId) // Don't match with ourselves
        .limit(1);

      if (searchError) throw searchError;

      // 🎉 WE ARE PLAYER 2: A match was found!
      if (waitingMatches && waitingMatches.length > 0) {
        const match = waitingMatches[0];
        
        // Join the match by updating the database
        const { error: updateError } = await supabase
          .from('versus_battles')
          .update({
            player2_id: userId,
            status: 'matched' 
          })
          .eq('id', match.id);

        if (updateError) throw updateError;
        
        await cleanupMatchmaking(); // Reset UI
        navigation.navigate('LiveVersusRoutine', { matchId: match.id, isPlayer1: false });
        return;
      }

      // ⏳ WE ARE PLAYER 1: No match found. Create a room and wait.
      const { data: newMatch, error: createError } = await supabase
        .from('versus_battles')
        .insert([{
          player1_id: userId,
          exercise_name: exercise,
          target_sets: sets,
          target_reps: reps,
          status: 'waiting'
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      // Save ID so we can delete it if we hit Cancel
      myMatchIdRef.current = newMatch.id; 

      // Set up a Realtime Listener on our new row
      const channel = supabase.channel(`match_${newMatch.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'versus_battles', filter: `id=eq.${newMatch.id}` },
          (payload) => {
            // When Player 2 updates the row to 'matched', this fires instantly!
            if (payload.new.status === 'matched') {
               console.log("Opponent joined!");
               cleanupMatchmaking().then(() => {
                 navigation.navigate('LiveVersusRoutine', { matchId: newMatch.id, isPlayer1: true });
               });
            }
          }
        )
        .subscribe();

      realtimeSubRef.current = channel;

      // Automatically cancel after 30 seconds if nobody joins
      timeoutRef.current = setTimeout(async () => {
         await cleanupMatchmaking();
         Alert.alert(
           'No Opponent Found',
           `Nobody is looking to do ${sets} sets of ${reps} ${exercise} right now. Try again later!`
         );
      }, 30000);

    } catch (error) {
      console.error('Matchmaking error:', error);
      await cleanupMatchmaking();
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
       startMatchmaking(exercise, sets, reps);
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
            await cleanupMatchmaking(); 
          }
        }
      ]
    );
  };

  const handleRunPress = async () => {
    Alert.alert("Coming Soon", "Versus Run logic is currently under construction.");
  };

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