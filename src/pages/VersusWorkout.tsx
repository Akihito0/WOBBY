import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Finding from '../components/Finding';
import ExerciseModal from '../components/ExerciseModal';
import DistanceSelectionModal from '../components/DistanceSelectionModal';
import { supabase } from '../supabase';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState({ type: '', exercises: [] as string[] });

  // 👇 ADDED: Refs to hold the selected rules and track cancellation
  const matchRulesRef = useRef<{ exercise: string; sets: number; reps: number } | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const myMatchIdRef = useRef<string | null>(null);

  // ─── MATCHMAKING LOGIC ───
  // We use a useEffect that triggers when `isFinding` becomes true.
  // This allows React to render the Finding modal BEFORE the heavy database work begins.
  useEffect(() => {
    if (isFinding && matchRulesRef.current) {
      isCancelledRef.current = false; // Reset cancel flag
      startMatchmaking(matchRulesRef.current.exercise, matchRulesRef.current.sets, matchRulesRef.current.reps);
    }
  }, [isFinding]);

  const startMatchmaking = async (exercise: string, sets: number, reps: number) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user.');
        setIsFinding(false);
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

      // If user clicked cancel during the network request, abort.
      if (isCancelledRef.current) return;

      if (waitingMatches && waitingMatches.length > 0) {
        // 🎉 MATCH FOUND! We are Player 2. Join the match!
        const match = waitingMatches[0];
        
        const { error: updateError } = await supabase
          .from('versus_battles')
          .update({
            player2_id: userId,
            status: 'matched' 
          })
          .eq('id', match.id);

        if (updateError) throw updateError;
        
        setIsFinding(false);
        Alert.alert('Match Found!', 'Get ready to workout!');
        
        // TODO: 
        navigation.navigate('LiveVersusRoutine', { matchId: match.id, isPlayer1: false });
        return;
      }

      // 2. NO MATCH FOUND. We are Player 1. Create a new room and wait.
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
      
      // Save ID so we can delete it if we cancel
      myMatchIdRef.current = newMatch.id; 

      // 3. Poll for an opponent for 30 seconds
      let matchFound = false;
      let attempts = 0;
      const maxAttempts = 15; 

      while (!matchFound && attempts < maxAttempts) {
        // Break the loop instantly if user hit cancel
        if (isCancelledRef.current) {
           await cleanUpMyMatch();
           return;
        }

        attempts++;
        
        const { data: checkMatch } = await supabase
          .from('versus_battles')
          .select('status, player2_id')
          .eq('id', newMatch.id)
          .single();

        if (checkMatch && checkMatch.status === 'matched' && checkMatch.player2_id) {
          matchFound = true;
          setIsFinding(false);
          Alert.alert('Challenger Approaching!', 'Get ready to workout!');
          
          // TODO: 
          navigation.navigate('LiveVersusRoutine', { matchId: newMatch.id, isPlayer1: true });
          return;
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 4. Timeout reached. Nobody joined.
      if (!isCancelledRef.current) {
        setIsFinding(false);
        await cleanUpMyMatch();
        Alert.alert(
          'No Opponent Found',
          `Nobody is looking to do ${sets} sets of ${reps} ${exercise} right now. Try different rules or try again later!`
        );
      }

    } catch (error) {
      console.error('Matchmaking error:', error);
      if (!isCancelledRef.current) {
        setIsFinding(false);
        Alert.alert('Error', 'Matchmaking failed. Please try again.');
      }
    }
  };

  // Helper to delete the empty room
  const cleanUpMyMatch = async () => {
    if (myMatchIdRef.current) {
      await supabase.from('versus_battles').delete().eq('id', myMatchIdRef.current);
      myMatchIdRef.current = null;
    }
  };

  // ─── UI HANDLERS ───

  const handleRoutineSelect = (routine: any) => {
    setSelectedRoutine({ type: routine.type, exercises: routine.exercises });
    setExerciseModalVisible(true);
  };

  // When user hits "Find Match" on the Exercise Modal
  const handleConfirmExercises = (exercise: string, sets: number, reps: number) => {
    setExerciseModalVisible(false);
    
    // Store rules and trigger the useEffect
    matchRulesRef.current = { exercise, sets, reps };
    setIsFinding(true); 
  };

  // When user hits "Cancel" on the Finding Loader Modal
  const handleCancelFinding = () => {
    Alert.alert(
      'Cancel Matchmaking?',
      'Are you sure you want to stop looking for an opponent?',
      [
        { text: 'No, keep waiting', style: 'cancel' },
        { 
          text: 'Yes, stop', 
          style: 'destructive',
          onPress: () => {
            isCancelledRef.current = true; // Instantly breaks the while loop
            setIsFinding(false);           // Closes the modal
            cleanUpMyMatch();              // Deletes the room from Supabase
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

      {/* 👇 PASS THE onCancel PROP! */}
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

  // Choose Mode
  chooseModeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat-SemiBold',
    marginTop: 32,
    marginBottom: 10,
    right: -15,
  },

  // Mode Buttons
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

  // Dropdown INSIDE the card
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