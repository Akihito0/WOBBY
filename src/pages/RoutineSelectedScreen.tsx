import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  GestureResponderEvent,
  PanResponderGestureState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExerciseSet {
  id: string;
  set: number;
  weight: string;
  reps: number;
  status: 'START' | 'WAITING' | 'FINISHED';
}

interface Exercise {
  id: string;
  name: string;
  icon: any;
  sets: ExerciseSet[];
  expanded: boolean;
}

interface SwipeRow {
  exerciseId: string;
  setId: string;
}

const RoutineSelectedScreen = ({ navigation, route }: any) => {
  const routineType = route?.params?.routineType || 'PUSH';
  const screenWidth = Dimensions.get('window').width;

  const exercisesData: Exercise[] = [
    {
      id: '1',
      name: 'Bicep Curl',
      icon: require('../assets/push.png'),
      expanded: true,
      sets: [
        { id: '1', set: 1, weight: 'Body Weight', reps: 8, status: 'START' },
        { id: '2', set: 2, weight: 'Body Weight', reps: 12, status: 'WAITING' },
        { id: '3', set: 3, weight: 'Body Weight', reps: 12, status: 'WAITING' },
      ],
    },
    {
      id: '2',
      name: 'Bench Press',
      icon: require('../assets/dumbell.png'),
      expanded: false,
      sets: [
        { id: '4', set: 1, weight: '20 kg', reps: 10, status: 'START' },
      ],
    },
    {
      id: '3',
      name: 'Bench Press (Incline)',
      icon: require('../assets/dumbell.png'),
      expanded: false,
      sets: [
        { id: '5', set: 1, weight: '25 kg', reps: 8, status: 'START' },
      ],
    },
  ];

  const [exercises, setExercises] = useState(exercisesData);
  const [totalReps, setTotalReps] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [swipedRow, setSwipedRow] = useState<SwipeRow | null>(null);
  const animatedValues = useRef<{ [key: string]: Animated.Value }>({});

  // Auto-start Timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle workout finish callback from ActiveWorkoutScreen
  React.useEffect(() => {
    if (route.params?.finished && route.params?.exerciseId && route.params?.setId) {
      setExercises(prevExercises => {
        let foundCompleted = false;
        let unlockedNext = false;
        
        const newExercises = [...prevExercises];
        for (let i = 0; i < newExercises.length; i++) {
          const ex = { ...newExercises[i] };
          const sets = [...ex.sets];
          for (let j = 0; j < sets.length; j++) {
            // 1. Mark the completed set as FINISHED
            if (sets[j].id === route.params.setId && ex.id === route.params.exerciseId) {
              sets[j] = { ...sets[j], status: 'FINISHED' };
              foundCompleted = true;
            }
            // 2. Unlock the immediate next WAITING set after the completed one
            else if (foundCompleted && !unlockedNext && sets[j].status === 'WAITING') {
              sets[j] = { ...sets[j], status: 'START' };
              unlockedNext = true;
              ex.expanded = true; // Auto-expand the exercise
            }
          }
          ex.sets = sets;
          newExercises[i] = ex;
        }
        return newExercises;
      });

      // Clear the route params
      navigation.setParams({ finished: false, exerciseId: null, setId: null });
    }
  }, [route.params?.finished]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get or create animated value for a row
  const getAnimatedValue = (rowId: string): Animated.Value => {
    if (!animatedValues.current[rowId]) {
      animatedValues.current[rowId] = new Animated.Value(0);
    }
    return animatedValues.current[rowId];
  };

  // Handle pan gesture
  const createPanResponder = (exerciseId: string, setId: string) => {
    const rowId = `${exerciseId}-${setId}`;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => 
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (gestureState.dx < 0) {
          getAnimatedValue(rowId).setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (gestureState.dx < -50) {
          // Swipe left - show delete button
          Animated.timing(getAnimatedValue(rowId), {
            toValue: -80,
            duration: 200,
            useNativeDriver: false,
          }).start();
          setSwipedRow({ exerciseId, setId });
        } else {
          // Snap back
          Animated.timing(getAnimatedValue(rowId), {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
          setSwipedRow(null);
        }
      },
    });
  };

  // Toggle exercise expand/collapse
  const toggleExerciseExpand = (exerciseId: string) => {
    setSwipedRow(null); // Close any open swipe
    setExercises(exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, expanded: !ex.expanded } : ex
    ));
  };
  const updateSetWeight = (exerciseId: string, setId: string, newWeight: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId 
        ? {
            ...ex,
            sets: ex.sets.map(s => 
              s.id === setId ? { ...s, weight: newWeight } : s
            )
          }
        : ex
    ));
  };

  // Update set reps
  const updateSetReps = (exerciseId: string, setId: string, newReps: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId 
        ? {
            ...ex,
            sets: ex.sets.map(s => 
              s.id === setId ? { ...s, reps: parseInt(newReps) || 0 } : s
            )
          }
        : ex
    ));
  };

  // Delete a set
  const deleteSet = (exerciseId: string, setId: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId 
        ? {
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId)
          }
        : ex
    ));
    setSwipedRow(null);
  };

  // Add new set to exercise
  const handleAddSet = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSet: ExerciseSet = {
          id: `${exerciseId}-${ex.sets.length + 1}`,
          set: ex.sets.length + 1,
          weight: ex.sets[0]?.weight || 'Body Weight',
          reps: ex.sets[0]?.reps || 10,
          status: 'WAITING',
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  // Update status
  const updateStatus = (exerciseId: string, setId: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId 
        ? {
            ...ex,
            sets: ex.sets.map(s => {
              if (s.id === setId) {
                const statuses: Array<'START' | 'WAITING' | 'FINISHED'> = ['WAITING', 'START', 'FINISHED'];
                const currentIndex = statuses.indexOf(s.status);
                const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                return { ...s, status: nextStatus };
              }
              return s;
            })
          }
        : ex
    ));
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'WAITING':
        return { backgroundColor: '#FF0000', color: '#FFFFFF' };
      case 'START':
        return { backgroundColor: '#CCFF00', color: '#000000' };
      case 'FINISHED':
        return { backgroundColor: '#010101', color: '#CCFF00' };
      default:
        return { backgroundColor: '#666666', color: '#FFFFFF' };
    }
  };

  const renderSetRow = (exercise: Exercise, set: ExerciseSet) => {
    const rowId = `${exercise.id}-${set.id}`;
    const animatedValue = getAnimatedValue(rowId);
    const panResponder = createPanResponder(exercise.id, set.id);

    return (
      <View 
        key={set.id} 
        style={styles.setRowContainer}
        {...panResponder.panHandlers}
      >
        {/* Delete Button (Revealed on Swipe) */}
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteSet(exercise.id, set.id)}
          >
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Animated Content Row */}
        <Animated.View 
          style={[
            styles.setRowContent,
            { transform: [{ translateX: animatedValue }] }
          ]}
        >
          {/* Set Number */}
          <Text style={[styles.setNumber, { flex: 0.5 }]}>{set.set}</Text>

          {/* Weight Input */}
          <TextInput
            style={[styles.editableInput, { flex: 1.2 }]}
            value={set.weight}
            onChangeText={(text) => {
              setSwipedRow(null);
              updateSetWeight(exercise.id, set.id, text);
            }}
            placeholderTextColor="#999"
          />

          {/* Reps Input */}
          <TextInput
            style={[styles.editableInput, { flex: 0.8 }]}
            value={String(set.reps)}
            onChangeText={(text) => {
              setSwipedRow(null);
              updateSetReps(exercise.id, set.id, text);
            }}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          {/* Status Button */}
          <TouchableOpacity
            style={[
              styles.statusButton,
              { flex: 1, backgroundColor: getStatusStyles(set.status).backgroundColor },
            ]}
            onPress={() => {
              setSwipedRow(null);
              if (set.status === 'START') {
                updateStatus(exercise.id, set.id);
                navigation.navigate('ActiveWorkoutScreen', { 
                  exerciseName: exercise.name,
                  exerciseId: exercise.id,
                  setId: set.id,
                });
              } else {
                updateStatus(exercise.id, set.id);
              }
            }}
          >
            <Text style={[styles.statusButtonText, { color: getStatusStyles(set.status).color }]}>{set.status}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderExerciseCard = (exercise: Exercise) => (
    <View key={exercise.id} style={styles.exerciseCard}>
      {/* Exercise Header - Collapsible */}
      <TouchableOpacity
        style={styles.exerciseHeader}
        onPress={() => toggleExerciseExpand(exercise.id)}
      >
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Image source={exercise.icon} style={styles.exerciseIcon} />
        <Image 
          source={require('../assets/down.png')} 
          style={[
            styles.collapseIcon,
            { transform: [{ rotate: exercise.expanded ? '180deg' : '0deg' }] }
          ]} 
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {exercise.expanded && (
        <View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Set</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Weight (kg)</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Reps</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          </View>

          {/* Sets Rows */}
          {exercise.sets.map((set) => renderSetRow(exercise, set))}

          {/* Add Set Button */}
          <TouchableOpacity
            onPress={() => handleAddSet(exercise.id)}
            style={styles.addSetButton}
          >
            <LinearGradient
              colors={['#B1DD01', '#678101']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addSetGradient}
            >
              <Image
                source={require('../assets/addition.png')}
                style={styles.addSetIcon}
              />
              <Text style={styles.addSetText}>ADD SET</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Dynamic computation of completed sets and reps
  const completedSets = exercises.reduce((acc, ex) => 
    acc + ex.sets.filter(s => s.status === 'FINISHED').length, 0);

  const completedReps = exercises.reduce((acc, ex) => 
    acc + ex.sets.filter(s => s.status === 'FINISHED').reduce((r, s) => r + s.reps, 0), 0);

  return (
    <View style={styles.container}>
      {/* Header with SOLO WORKOUT */}
      <LinearGradient
        colors={['#0F4933', '#000000']}
        locations={[0, 0.93]}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0, y: 0.9 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../assets/back0.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOLO WORKOUT</Text>
      </LinearGradient>

      {/* PUSH ROUTINE Subtitle (RED) */}
      <Text style={styles.routineSubtitle}>{routineType} ROUTINE</Text>

      {/* Duration and Stats Combined Card */}
      <LinearGradient
        colors={['#000000', '#323C2E']}
        start={{ x: 0.02, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.durationCard}
      >
        <Text style={styles.durationLabel}>DURATION</Text>
        <Text style={styles.durationTimer}>{formatTime(elapsedSeconds)}</Text>

        {/* Stats Row Inside Duration Card */}
        <View style={styles.statsInsideRow}>
          <View style={styles.statInside}>
            <Text style={styles.statInsideLabel}>Total Repetition</Text>
            <Text style={styles.statInsideValue}>{completedReps}</Text>
          </View>
          <View style={styles.statInside}>
            <Text style={styles.statInsideLabel}>Total Sets</Text>
            <Text style={styles.statInsideValue}>{completedSets}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Exercises List */}
      <ScrollView style={styles.exercisesContainer} showsVerticalScrollIndicator={false}>
        {exercises.map(ex => renderExerciseCard(ex))}
      </ScrollView>

      {/* Finish Button */}
      <TouchableOpacity
        style={styles.finishBtnWrapper}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('WorkoutSummaryScreen', { exercises, elapsedSeconds, completedSets, completedReps })}
      >
        <LinearGradient
          colors={['#B1DD01', '#678101']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.finishGradient}
        >
          <Text style={styles.finishBtnText}>FINISH</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
  },

  // Header Styles
  headerGradient: {
    height: 134,
    width: '100%',
  },
  backBtn: {
    top: 50,
    left: 20,
    width: 34,
    height: 34,
  },
  backIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  headerTitle: {
    position: 'absolute',
    top: 77,
    width: '100%',
    textAlign: 'center',
    color: '#E0E0E0', 
    fontSize: 30,
    fontFamily: 'Montserrat-Black',
    fontWeight: '900',
  },

  // Routine Subtitle (RED)
  routineSubtitle: {
    color: '#FF0000',
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 900,
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Duration Card (Combined with stats inside)
  durationCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#B1DD01',
  },
  durationLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  durationTimer: {
    color: '#B1DD01',
    fontSize: 42,
    fontFamily: 'Montserrat-Black',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsInsideRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statInside: {
    alignItems: 'center',
    flex: 1,
  },
  statInsideLabel: {
    color: '#999999',
    fontSize: 11,
    fontFamily: 'Montserrat-Regular',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statInsideValue: {
    color: '#B1DD01',
    fontSize: 24,
    fontFamily: 'Montserrat-Black',
    fontWeight: 'bold',
  },

  // Exercises Container
  exercisesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  // Exercise Card Styles
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B1DD01',
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  exerciseName: {
    color: '#d1d1d1',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#B1DD01',
    marginRight: 12,
  },
  collapseIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#B1DD01',
  },

  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#222222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#B1DD01',
    marginTop: 12,
  },
  tableHeaderText: {
    color: '#B1DD01',
    fontSize: 11,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Set Row Styles
  setRowContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setRowContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  setNumber: {
    color: '#d1d1d1',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
  },
  editableInput: {
    color: '#d1d1d1',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    borderBottomWidth: 1,
    borderBottomColor: '#B1DD01',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusButtonText: {
    color: '#000000',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Delete Button (Swipe)
  deleteButton: {
    backgroundColor: '#FF4444',
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },

  // Add Set Button
  addSetButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addSetGradient: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addSetIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    resizeMode: 'contain',
  },
  addSetText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Finish Button
  finishBtnWrapper: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  finishBtnText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Montserrat-Black',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default RoutineSelectedScreen;
