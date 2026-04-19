import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Animated, PanResponder, Alert,
  TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AddExerciseModal from '../components/AddExerciseModal';

const { width } = Dimensions.get('window');

type Set = { id: number; weight: string; reps: string };
type Exercise = { id: number; name: string; sets: Set[]; expanded: boolean };

const LegScreen = ({ navigation }: any) => {
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: 1,
      name: 'Squats',
      sets: [
        { id: 1, weight: 'Weighted', reps: '8' },
        { id: 2, weight: 'Weighted', reps: '8' },
        { id: 3, weight: 'Weighted', reps: '8' },
      ],
      expanded: false,
    },
    {
      id: 2,
      name: 'Lunges',
      sets: [
        { id: 1, weight: 'Body Weight', reps: '8' },
        { id: 2, weight: 'Body Weight', reps: '8' },
        { id: 3, weight: 'Body Weight', reps: '8' },
      ],
      expanded: false,
    },
    {
      id: 3,
      name: 'Leg Extensions',
      sets: [
        { id: 1, weight: 'Weighted', reps: '8' },
        { id: 2, weight: 'Weighted', reps: '8' },
        { id: 3, weight: 'Weighted', reps: '8' },
      ],
      expanded: false,
    },
  ]);

  const [editMode, setEditMode] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<number[]>([]);
  const [swipeOffsets] = useState<{ [key: string]: Animated.Value }>({});

  // Name exercise modal
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  // Editing a specific set cell
  const [editingCell, setEditingCell] = useState<{
    exerciseId: number;
    setId: number;
    field: 'weight' | 'reps';
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSwipeAnim = (key: string) => {
    if (!swipeOffsets[key]) {
      swipeOffsets[key] = new Animated.Value(0);
    }
    return swipeOffsets[key];
  };

  const createPanResponder = (exerciseId: number, setId: number) => {
    const key = `${exerciseId}-${setId}`;
    const anim = getSwipeAnim(key);
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) anim.setValue(Math.max(g.dx, -80));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Animated.spring(anim, { toValue: -80, useNativeDriver: true }).start();
        } else {
          Animated.spring(anim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    });
  };

  const toggleExpand = (id: number) => {
    setExercises(prev =>
      prev.map(ex => ex.id === id ? { ...ex, expanded: !ex.expanded } : ex)
    );
  };

  const addSet = (exerciseId: number) => {
    setExercises(prev =>
      prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const newId = ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.id)) + 1 : 1;
        return {
          ...ex,
          sets: [...ex.sets, { id: newId, weight: 'Body Weight', reps: '12' }],
        };
      })
    );
  };

  const deleteSet = (exerciseId: number, setId: number) => {
    setExercises(prev =>
      prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const filtered = ex.sets.filter(s => s.id !== setId);
        const renumbered = filtered.map((s, i) => ({ ...s, id: i + 1 }));
        return { ...ex, sets: renumbered };
      })
    );
  };

  // Opens the name modal instead of immediately adding
  const promptAddExercise = () => {
    setNewExerciseName('');
    setNameModalVisible(true);
  };

  const confirmAddExercise = () => {
    const trimmed = newExerciseName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name for the exercise.');
      return;
    }
    const newId = exercises.length > 0 ? Math.max(...exercises.map(e => e.id)) + 1 : 1;
    setExercises(prev => [
      ...prev,
      { id: newId, name: trimmed, sets: [], expanded: true },
    ]);
    setNameModalVisible(false);
    setNewExerciseName('');
  };

  const toggleSelectDelete = (id: number) => {
    setSelectedToDelete(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const confirmDelete = () => {
    if (selectedToDelete.length === 0) {
      setEditMode(false);
      return;
    }
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete the selected exercise(s)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setExercises(prev => prev.filter(ex => !selectedToDelete.includes(ex.id)));
            setSelectedToDelete([]);
            setEditMode(false);
          },
        },
      ]
    );
  };

  // Start editing a cell
  const startEditCell = (exerciseId: number, setId: number, field: 'weight' | 'reps', currentValue: string) => {
    setEditingCell({ exerciseId, setId, field });
    setEditingValue(currentValue);
  };

  // Save edited cell value
  const saveEditCell = () => {
    if (!editingCell) return;
    const { exerciseId, setId, field } = editingCell;
    setExercises(prev =>
      prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id !== setId) return s;
            return { ...s, [field]: editingValue };
          }),
        };
      })
    );
    setEditingCell(null);
    setEditingValue('');
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <LinearGradient
        colors={['#180020', '#000000']}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
          <Image source={require('../assets/back0.png')} style={styles.backBtn} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LEG</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Your Exercises Row */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Exercises</Text>
          <TouchableOpacity onPress={() => {
            if (editMode) {
              confirmDelete();
            } else {
              setEditMode(true);
              setSelectedToDelete([]);
            }
          }}>
            {editMode ? (
              <Text style={styles.deleteConfirmText}>
                {selectedToDelete.length > 0 ? 'Delete' : 'Done'}
              </Text>
            ) : (
              <Image source={require('../assets/pencil.png')} style={styles.pencilIcon} />
            )}
          </TouchableOpacity>
        </View>

        {/* Exercise Cards */}
        {exercises.map(exercise => (
          <View key={exercise.id} style={styles.exerciseWrapper}>
            <View style={[styles.exerciseCard, exercise.expanded && styles.exerciseCardExpanded]}>

              {/* Exercise Header Row */}
              <View style={styles.exerciseHeaderRow}>
                {editMode && (
                  <TouchableOpacity onPress={() => toggleSelectDelete(exercise.id)} style={styles.checkbox}>
                    <View style={[
                      styles.checkboxBox,
                      selectedToDelete.includes(exercise.id) && styles.checkboxChecked,
                    ]}>
                      {selectedToDelete.includes(exercise.id) && (
                        <Text style={styles.checkboxTick}>✕</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <Text style={[styles.exerciseName, editMode && { marginLeft: 10 }]}>
                  {exercise.name}
                </Text>

                <TouchableOpacity onPress={() => toggleExpand(exercise.id)}>
                  <Image
                    source={exercise.expanded ? require('../assets/up.png') : require('../assets/down.png')}
                    style={styles.dropdownIcon}
                  />
                </TouchableOpacity>
              </View>

              {/* Expanded Dropdown */}
              {exercise.expanded && (
                <View style={styles.dropdownContent}>

                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>SET</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>WEIGHT(KG)</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>REPS</Text>
                  </View>

                  {/* Sets */}
                  {exercise.sets.map(set => {
                    const key = `${exercise.id}-${set.id}`;
                    const anim = getSwipeAnim(key);
                    const panResponder = createPanResponder(exercise.id, set.id);

                    return (
                      <View key={set.id} style={styles.setRowContainer}>
                        {/* Delete X revealed on swipe */}
                        <TouchableOpacity
                          style={styles.deleteSetBtn}
                          onPress={() => deleteSet(exercise.id, set.id)}
                        >
                          <Text style={styles.deleteSetX}>✕</Text>
                        </TouchableOpacity>

                        <Animated.View
                          style={[styles.setRow, { transform: [{ translateX: anim }] }]}
                          {...panResponder.panHandlers}
                        >
                          {/* SET number — not editable */}
                          <Text style={[styles.setCell, { flex: 0.6 }]}>{set.id}</Text>

                          {/* WEIGHT — tap to edit */}
                          <TouchableOpacity
                            style={{ flex: 1.4, alignItems: 'center' }}
                            onPress={() => startEditCell(exercise.id, set.id, 'weight', set.weight)}
                          >
                            {editingCell?.exerciseId === exercise.id &&
                             editingCell?.setId === set.id &&
                             editingCell?.field === 'weight' ? (
                              <TextInput
                                style={styles.cellInput}
                                value={editingValue}
                                onChangeText={setEditingValue}
                                onBlur={saveEditCell}
                                onSubmitEditing={saveEditCell}
                                autoFocus
                                selectTextOnFocus
                              />
                            ) : (
                              <Text style={styles.setCell}>{set.weight}</Text>
                            )}
                          </TouchableOpacity>

                          {/* REPS — tap to edit */}
                          <TouchableOpacity
                            style={{ flex: 0.8, alignItems: 'center' }}
                            onPress={() => startEditCell(exercise.id, set.id, 'reps', set.reps)}
                          >
                            {editingCell?.exerciseId === exercise.id &&
                             editingCell?.setId === set.id &&
                             editingCell?.field === 'reps' ? (
                              <TextInput
                                style={styles.cellInput}
                                value={editingValue}
                                onChangeText={setEditingValue}
                                onBlur={saveEditCell}
                                onSubmitEditing={saveEditCell}
                                keyboardType="numeric"
                                autoFocus
                                selectTextOnFocus
                              />
                            ) : (
                              <Text style={styles.setCell}>{set.reps}</Text>
                            )}
                          </TouchableOpacity>
                        </Animated.View>

                        <View style={styles.setDivider} />
                      </View>
                    );
                  })}

                  {/* Add Set Button */}
                  <TouchableOpacity
                    style={styles.addSetWrapper}
                    onPress={() => addSet(exercise.id)}
                  >
                    <LinearGradient
                      colors={['#E7FF89', '#E7FF89']}
                      style={styles.addSetBtn}
                    >
                      <View style={styles.addIcon}>
                        <Image source={require('../assets/addd0.png')} style={styles.addIcon} />
                      </View>
                      <Text style={styles.addSetText}>ADD SET</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                </View>
              )}
            </View>
          </View>
        ))}

        {/* Add Exercise Button */}
        <TouchableOpacity style={styles.addExWrapper} onPress={promptAddExercise}>
          <LinearGradient colors={['#2F4128', '#2F4128']} style={styles.addExBtn}>
            <View>
              <Image source={require('../assets/addd1.png')} style={styles.addIcon} />
            </View>
            <Text style={styles.addExText}>ADD EXERCISE</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Add Exercise Modal ── */}
      <AddExerciseModal
        visible={nameModalVisible}
        onClose={() => setNameModalVisible(false)}
        onConfirm={confirmAddExercise}
        value={newExerciseName}
        onChangeText={setNewExerciseName}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    width: '100%',
    height: 117,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 18,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  backBtnWrapper: {
    justifyContent: 'center' 
},
  backBtn: { 
    width: 30, 
    height: 30, 
    resizeMode: 'contain' 
},
  headerTitle: { 
    color: '#d1d1d1', 
    fontSize: 32, 
    fontFamily: 'Montserrat-Black', 
 },

  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 24, 
    paddingBottom: 60 
},

  sectionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
},
  sectionTitle: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontFamily: 'Montserrat-SemiBold' 
},
  pencilIcon: { 
    width: 22, 
    height: 22, 
    resizeMode: 'contain', 
 },
  deleteConfirmText: { 
    color: '#FF4444', 
    fontSize: 16, 
    fontFamily: 'Montserrat-Bold' 
},
  exerciseWrapper: { 
    marginBottom: 12 
},
  exerciseCard: { 
    borderWidth: 1.5, 
    borderColor: '#42752E', 
    borderRadius: 12, 
    overflow: 'hidden' },
  exerciseCardExpanded: { 
    borderColor: '#42752E' 
},
  exerciseHeaderRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 18, 
    backgroundColor: '#111111',
  },
  exerciseName: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontFamily: 'Montserrat-ExtraBold', 
    flex: 1,
    right: -10,
},
  dropdownIcon: { 
    width: 28, 
    height: 28, 
    resizeMode: 'contain', 
},
  // Checkbox — now red
  checkbox: { 
    marginRight: 4 
},
  checkboxBox: {
    width: 22, 
    height: 22, 
    borderRadius: 5,
    borderWidth: 2, 
    borderColor: '#FF3B30',
    backgroundColor: 'transparent',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  checkboxChecked: { 
    backgroundColor: '#FF3B30' 
},
  checkboxTick: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontFamily: 'Montserrat-Black' 
},
  dropdownContent: { 
    backgroundColor: '#111111', 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    paddingTop: 8 
},
  tableHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#222222', 
    borderRadius: 8,
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    marginBottom: 4,
  },
  tableHeaderText: { 
    color: '#CCFF00', 
    fontSize: 12, 
    fontFamily: 'Montserrat-Bold', 
    textAlign: 'center' 
},
  setRowContainer: { 
    position: 'relative', 
    overflow: 'hidden' 
},
  setRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 14, 
    paddingHorizontal: 12,
    backgroundColor: '#111111',
  },
  setCell: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontFamily: 'Montserrat-Regular', 
    textAlign: 'center' 
},

  // Inline editable cell
  cellInput: {
    color: '#CCFF00', 
    fontSize: 15, 
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#CCFF00',
    paddingVertical: 2, 
    minWidth: 60,
  },

  setDivider: { 
    height: 1, 
    backgroundColor: '#2A2A2A', 
    marginHorizontal: 4 
},
  deleteSetBtn: {
    position: 'absolute', 
    right: 0, 
    top: 0, 
    bottom: 0,
    width: 80, 
    backgroundColor: '#FF3B30',
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: -1,
  },
  deleteSetX: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontFamily: 'Montserrat-Black' 
},
  addSetWrapper: { 
    overflow: 'hidden', 
    marginTop: 12,
},
  addSetBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 6, 
    width: 320,
    height: 35,
},
  addIcon: { 
    width: 20, 
    height: 20, 
    resizeMode: 'contain',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
},
  addSetText: { 
    color: '#000000', 
    fontSize: 15, 
    fontFamily: 'Montserrat-Bold', 
    flex: 1, 
    textAlign: 'center',
    marginTop: -5,
},

  addExWrapper: {
    borderRadius: 15, 
    overflow: 'hidden', 
    marginTop: 8,
    borderWidth: 0.8, 
    borderColor: '#CCFF00',
  },
  addExBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 15 
},
  addExIconBox: {
    width: 28, 
    height: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
  },
  addExText: { 
    color: '#CCFF00', 
    fontSize: 15, 
    fontFamily: 'Montserrat-ExtraBold', 
    letterSpacing: 1, 
    flex: 1, 
    textAlign: 'center' 
},
});

export default LegScreen;