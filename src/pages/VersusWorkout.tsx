import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Finding from '../components/Finding';
import ExerciseModal from '../components/ExerciseModal';
import { supabase } from '../supabase';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);

  const [isFinding, setIsFinding] = useState(false);
  
  const handleRunPress = async () => {
    setIsFinding(true);
    
    try {
      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user.');
        setIsFinding(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();

      // Create or update versus_match entry for this user
      const { data: existingMatch, error: checkError } = await supabase
        .from('versus_matches')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (!existingMatch) {
        // Create new match record - this user is now waiting
        const { data: newMatch, error: createError } = await supabase
          .from('versus_matches')
          .insert([
            {
              user_id: userId,
              status: 'waiting',
              created_at: now.toISOString(),
            }
          ])
          .select()
          .single();

        if (createError && createError.code !== 'PGRST116') throw createError;
      }

      // Poll for opponent match every 2 seconds (max 30 seconds)
      let matchFound = false;
      let attempts = 0;
      const maxAttempts = 15;

      while (!matchFound && attempts < maxAttempts) {
        attempts++;
        
        // Check for any other waiting user
        const { data: opponentMatches, error: opponentError } = await supabase
          .from('versus_matches')
          .select('*')
          .eq('status', 'waiting')
          .neq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (opponentError && opponentError.code !== 'PGRST116') throw opponentError;

        if (opponentMatches && opponentMatches.length > 0) {
          const opponent = opponentMatches[0];
          
          // Get opponent profile info
          const { data: opponentProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', opponent.user_id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') throw profileError;

          // Update both match records to "matched"
          const matchIds = [
            { user_id: userId },
            { user_id: opponent.user_id }
          ];

          for (const matchId of matchIds) {
            await supabase
              .from('versus_matches')
              .update({ 
                status: 'matched',
                opponent_id: matchId.user_id === userId ? opponent.user_id : userId,
                matched_at: new Date().toISOString()
              })
              .eq('user_id', matchId.user_id);
          }

          matchFound = true;
          setIsFinding(false);

          // Navigate to VersusRunScreen with opponent info
          navigation.navigate('VersusRun', {
            opponentUsername: opponentProfile?.username || 'Runner',
            opponentId: opponentProfile?.id || opponent.user_id,
            matchId: opponent.id,
          });

          return;
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // No match found after 30 seconds
      setIsFinding(false);
      
      // Clean up: remove this user's waiting record
      await supabase
        .from('versus_matches')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'waiting');

      Alert.alert(
        'No Opponent Found',
        'No other users are looking for a versus run right now. Try again later!'
      );
    } catch (error) {
      console.error('Error in matchmaking:', error);
      setIsFinding(false);
      Alert.alert('Error', 'Failed to find opponent. Please try again.');
    }
  };

const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
const [selectedRoutine, setSelectedRoutine] = useState({ type: '', exercises: [] as string[] });

const handleRoutineSelect = (routine: any) => {
  setSelectedRoutine({ type: routine.type, exercises: routine.exercises });
  setExerciseModalVisible(true);
};

const handleConfirmExercises = () => {
  setExerciseModalVisible(false);
  setIsFinding(true); // This triggers the Finding.tsx modal
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

      {/* Choose Mode */}
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
    {/* Top row: title + arrow */}
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

    {/* Expanded dropdown INSIDE the card */}
    {workoutExpanded && (
      <View style={styles.dropdownInner}>
        <Text style={styles.dropdownLabel}>Select your routine</Text>
        <View style={styles.routinesRow}>
          {routines.map((routine) => (
  <TouchableOpacity 
    key={routine.type} 
    style={styles.routineCardWrapper}
    onPress={() => handleRoutineSelect(routine)} // Click triggers ExerciseModal
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

<Finding visible={isFinding} />

<ExerciseModal 
  visible={exerciseModalVisible}
  routineType={selectedRoutine.type}
  exercises={selectedRoutine.exercises}
  onClose={() => setExerciseModalVisible(false)} // Closes on Cancel
  onConfirm={handleConfirmExercises} // Opens Finding.tsx on Confirm
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