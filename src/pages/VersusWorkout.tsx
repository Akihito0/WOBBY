import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Finding from '../components/Finding';
import MatchFoundModal from '../components/MatchFoundModal';
import ExerciseModal from '../components/ExerciseModal';
import { supabase } from '../supabase';
import { useVersusMatchmaking } from '../services/useVersusMatchmaking';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{name: string; xp: number; avatar?: {uri: string}}>({ name: '', xp: 0, avatar: undefined });
  const [matchFoundVisible, setMatchFoundVisible] = useState(false);

  // Matchmaking hook
  const { matchState, startMatchmaking, cancelMatchmaking, acceptMatch } = useVersusMatchmaking();

  // Fetch current user profile on mount
  useEffect(() => {
    fetchCurrentUserProfile();
  }, []);

  const fetchCurrentUserProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, xp')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setCurrentUser({
        name: profile?.username || 'You',
        xp: profile?.xp || 0,
        avatar: profile?.avatar_url ? { uri: profile.avatar_url } : undefined,
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  }, []);

  // Monitor matchmaking state and show appropriate modals
  useEffect(() => {
    console.log('🔔 [VersusWorkout] Match state changed:', matchState);
    
    if (matchState.status === 'error') {
      console.log('❌ [VersusWorkout] Error state detected:', matchState.error);
      setMatchFoundVisible(false);
      Alert.alert('Matchmaking Error', matchState.error || 'Unknown error');
    } else if (matchState.status === 'found' && matchState.opponent) {
      console.log('✅ [VersusWorkout] Match found! Showing MatchFoundModal for opponent:', matchState.opponent.username);
      // Show the match found modal
      setMatchFoundVisible(true);
    } else if (matchState.status === 'both_accepted' && matchState.opponent && matchState.matchId) {
      console.log('🎉 [VersusWorkout] Both users accepted! Navigating to VersusRun');
      setMatchFoundVisible(false);
      // Both users have accepted - now navigate
      navigation.navigate('VersusRun', {
        opponentUsername: matchState.opponent.username || 'Opponent',
        opponentId: matchState.opponent.id,
        opponentAvatar: matchState.opponent.avatar_url,
        matchId: matchState.matchId,
      });
    } else if (matchState.status === 'searching') {
      console.log('⏳ [VersusWorkout] Searching... Finding modal should be visible');
    } else if (matchState.status === 'idle') {
      console.log('🆓 [VersusWorkout] Idle state reached');
      setMatchFoundVisible(false);
    }
  }, [matchState.status, matchState.error, matchState.opponent, matchState.matchId, navigation]);

  const handleRunPress = async () => {
    try {
      // Start the matchmaking process
      await startMatchmaking();
    } catch (error) {
      Alert.alert('Error', 'Failed to start matchmaking. Please try again.');
    }
  };

  const handleMatchAccept = useCallback(async () => {
    if (!matchState.opponent || !matchState.matchId) return;

    console.log('✋ [VersusWorkout] User clicked Accept - marking acceptance...');
    
    // Call acceptMatch to mark this user as accepted
    // This will trigger the acceptance listener to watch for opponent
    await acceptMatch();
  }, [matchState.opponent, matchState.matchId, acceptMatch]);

  const handleMatchDecline = useCallback(async () => {
    setMatchFoundVisible(false);
    await cancelMatchmaking();
    Alert.alert('Match Declined', 'You have declined the match.');
  }, [cancelMatchmaking]);

const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
const [selectedRoutine, setSelectedRoutine] = useState({ type: '', exercises: [] as string[] });

const handleRoutineSelect = (routine: any) => {
  setSelectedRoutine({ type: routine.type, exercises: routine.exercises });
  setExerciseModalVisible(true);
};

const handleConfirmExercises = async () => {
  setExerciseModalVisible(false);
  // Start the matchmaking process
  await startMatchmaking();
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

<Finding visible={matchState.status === 'searching'} />

<MatchFoundModal
  visible={matchFoundVisible}
  currentUser={currentUser}
  opponent={matchState.opponent ? {
    name: matchState.opponent.username || 'Opponent',
    xp: matchState.opponent.xp || 0,
    avatar: matchState.opponent.avatar_url ? { uri: matchState.opponent.avatar_url } : undefined,
  } : { name: 'Opponent', xp: 0 }}
  onAccept={handleMatchAccept}
  onDecline={handleMatchDecline}
/>

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