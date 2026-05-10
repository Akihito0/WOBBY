import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Animated, PanResponder, Alert,
  TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import { loadUserRoutine, saveUserRoutine, getDefaultExercises, RoutineExercise } from '../services/routineService';

type Set = { id: number; weight: string; reps: string };
type Exercise = { id: number; name: string; sets: Set[]; expanded: boolean };

const PullScreen = ({ navigation }: any) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savedSnapshotRef = useRef<string>('');

  const [editMode, setEditMode] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<number[]>([]);
  const [swipeOffsets] = useState<{ [key: string]: Animated.Value }>({});
  const [editingCell, setEditingCell] = useState<{
    exerciseId: number;
    setId: number;
    field: 'weight' | 'reps';
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSnapshot = (exs: Exercise[]) =>
    JSON.stringify(exs.map(ex => ({ id: ex.id, name: ex.name, sets: ex.sets.map(s => ({ id: s.id, weight: s.weight, reps: s.reps })) })));

  const isDirty = useMemo(() => {
    if (!savedSnapshotRef.current) return false;
    return getSnapshot(exercises) !== savedSnapshotRef.current;
  }, [exercises]);

  // ─── Load user routine on mount ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        let data: RoutineExercise[] | null = null;
        if (userId) {
          data = await loadUserRoutine(userId, 'PULL');
        }
        const source = data || getDefaultExercises('PULL');
        const mapped: Exercise[] = source.map(ex => ({ ...ex, expanded: false }));
        setExercises(mapped);
        savedSnapshotRef.current = getSnapshot(mapped);
      } catch (err) {
        console.error('Load routine error:', err);
        const defaults = getDefaultExercises('PULL');
        const mapped: Exercise[] = defaults.map(ex => ({ ...ex, expanded: false }));
        setExercises(mapped);
        savedSnapshotRef.current = getSnapshot(mapped);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ─── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'Please log in to save.');
        setIsSaving(false);
        return;
      }
      const dataToSave: RoutineExercise[] = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets.map(s => ({ id: s.id, weight: s.weight, reps: s.reps })),
      }));
      const success = await saveUserRoutine(userId, 'PULL', dataToSave);
      if (success) {
        savedSnapshotRef.current = getSnapshot(exercises);
        Alert.alert('Saved! ✅', 'Your Pull routine has been updated.');
      } else {
        Alert.alert('Error', 'Failed to save routine.');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Back button with dirty check ──────────────────────────────────────────
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        if (getSnapshot(exercises) === savedSnapshotRef.current) return;
        e.preventDefault();
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved changes to your routine. What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
            { text: 'Save & Exit', onPress: async () => { await handleSave(); navigation.dispatch(e.data.action); } },
          ]
        );
      }
    });
    return unsub;
  }, [navigation, exercises]);

  // ─── Exercise editing helpers ──────────────────────────────────────────────
  const getSwipeAnim = (key: string) => {
    if (!swipeOffsets[key]) { swipeOffsets[key] = new Animated.Value(0); }
    return swipeOffsets[key];
  };

  const createPanResponder = (exerciseId: number, setId: number) => {
    const key = `${exerciseId}-${setId}`;
    const anim = getSwipeAnim(key);
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => { if (g.dx < 0) anim.setValue(Math.max(g.dx, -80)); },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) { Animated.spring(anim, { toValue: -80, useNativeDriver: true }).start(); }
        else { Animated.spring(anim, { toValue: 0, useNativeDriver: true }).start(); }
      },
    });
  };

  const toggleExpand = (id: number) => { setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, expanded: !ex.expanded } : ex)); };

  const addSet = (exerciseId: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const newId = ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.id)) + 1 : 1;
      return { ...ex, sets: [...ex.sets, { id: newId, weight: 'Body Weight', reps: '12' }] };
    }));
  };

  const deleteSet = (exerciseId: number, setId: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const filtered = ex.sets.filter(s => s.id !== setId);
      return { ...ex, sets: filtered.map((s, i) => ({ ...s, id: i + 1 })) };
    }));
  };

  const toggleSelectDelete = (id: number) => { setSelectedToDelete(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const startEditCell = (exerciseId: number, setId: number, field: 'weight' | 'reps', currentValue: string) => {
    setEditingCell({ exerciseId, setId, field }); setEditingValue(currentValue);
  };

  const saveEditCell = () => {
    if (!editingCell) return;
    const { exerciseId, setId, field } = editingCell;
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, sets: ex.sets.map(s => s.id !== setId ? s : { ...s, [field]: editingValue }) };
    }));
    setEditingCell(null); setEditingValue('');
  };

  if (isLoading) {
    return (<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#CCFF00" /></View>);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#180020', '#000000']} start={{ x: 1, y: 0.5 }} end={{ x: 0.3, y: 0.5 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
          <Image source={require('../assets/back0.png')} style={styles.backBtn} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PULL</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Exercises</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isDirty ? styles.saveBtnActive : styles.saveBtnInactive]}
            onPress={handleSave} disabled={!isDirty || isSaving} activeOpacity={isDirty ? 0.7 : 1}
          >
            <Text style={[styles.saveBtnText, isDirty ? styles.saveBtnTextActive : styles.saveBtnTextInactive]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {exercises.map(exercise => (
          <View key={exercise.id} style={styles.exerciseWrapper}>
            <View style={[styles.exerciseCard, exercise.expanded && styles.exerciseCardExpanded]}>
              <View style={styles.exerciseHeaderRow}>
                {editMode && (
                  <TouchableOpacity onPress={() => toggleSelectDelete(exercise.id)} style={styles.checkbox}>
                    <View style={[styles.checkboxBox, selectedToDelete.includes(exercise.id) && styles.checkboxChecked]}>
                      {selectedToDelete.includes(exercise.id) && <Text style={styles.checkboxTick}>✕</Text>}
                    </View>
                  </TouchableOpacity>
                )}
                <Text style={[styles.exerciseName, editMode && { marginLeft: 10 }]}>{exercise.name}</Text>
                <TouchableOpacity onPress={() => toggleExpand(exercise.id)}>
                  <Image source={exercise.expanded ? require('../assets/up.png') : require('../assets/down.png')} style={styles.dropdownIcon} />
                </TouchableOpacity>
              </View>

              {exercise.expanded && (
                <View style={styles.dropdownContent}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>SET</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>WEIGHT(KG)</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>REPS</Text>
                  </View>

                  {exercise.sets.map(set => {
                    const key = `${exercise.id}-${set.id}`;
                    const anim = getSwipeAnim(key);
                    const panResponder = createPanResponder(exercise.id, set.id);
                    return (
                      <View key={set.id} style={styles.setRowContainer}>
                        <TouchableOpacity style={styles.deleteSetBtn} onPress={() => deleteSet(exercise.id, set.id)}>
                          <Text style={styles.deleteSetX}>✕</Text>
                        </TouchableOpacity>
                        <Animated.View style={[styles.setRow, { transform: [{ translateX: anim }] }]} {...panResponder.panHandlers}>
                          <Text style={[styles.setCell, { flex: 0.6 }]}>{set.id}</Text>
                          <TouchableOpacity style={{ flex: 1.4, alignItems: 'center' }} onPress={() => startEditCell(exercise.id, set.id, 'weight', set.weight)}>
                            {editingCell?.exerciseId === exercise.id && editingCell?.setId === set.id && editingCell?.field === 'weight' ? (
                              <TextInput style={styles.cellInput} value={editingValue} onChangeText={setEditingValue} onBlur={saveEditCell} onSubmitEditing={saveEditCell} autoFocus selectTextOnFocus />
                            ) : (<Text style={styles.setCell}>{set.weight}</Text>)}
                          </TouchableOpacity>
                          <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }} onPress={() => startEditCell(exercise.id, set.id, 'reps', set.reps)}>
                            {editingCell?.exerciseId === exercise.id && editingCell?.setId === set.id && editingCell?.field === 'reps' ? (
                              <TextInput style={styles.cellInput} value={editingValue} onChangeText={setEditingValue} onBlur={saveEditCell} onSubmitEditing={saveEditCell} keyboardType="numeric" autoFocus selectTextOnFocus />
                            ) : (<Text style={styles.setCell}>{set.reps}</Text>)}
                          </TouchableOpacity>
                        </Animated.View>
                        <View style={styles.setDivider} />
                      </View>
                    );
                  })}

                  <TouchableOpacity style={styles.addSetWrapper} onPress={() => addSet(exercise.id)}>
                    <LinearGradient colors={['#E7FF89', '#E7FF89']} style={styles.addSetBtn}>
                      <View style={styles.addIcon}><Image source={require('../assets/addd0.png')} style={styles.addIcon} /></View>
                      <Text style={styles.addSetText}>ADD SET</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { width: '100%', height: 117, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 18, paddingHorizontal: 20, justifyContent: 'space-between' },
  backBtnWrapper: { justifyContent: 'center' },
  backBtn: { width: 30, height: 30, resizeMode: 'contain' },
  headerTitle: { color: '#d1d1d1', fontSize: 32, fontFamily: 'Montserrat-Black' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Montserrat-SemiBold' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5 },
  saveBtnActive: { backgroundColor: '#CCFF00', borderColor: '#CCFF00' },
  saveBtnInactive: { backgroundColor: 'transparent', borderColor: '#333' },
  saveBtnText: { fontSize: 14, fontFamily: 'Montserrat-Bold' },
  saveBtnTextActive: { color: '#000' },
  saveBtnTextInactive: { color: '#555' },
  pencilIcon: { width: 22, height: 22, resizeMode: 'contain' },
  deleteConfirmText: { color: '#FF4444', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  exerciseWrapper: { marginBottom: 12 },
  exerciseCard: { borderWidth: 1.5, borderColor: '#42752E', borderRadius: 12, overflow: 'hidden' },
  exerciseCardExpanded: { borderColor: '#42752E' },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18, backgroundColor: '#111111' },
  exerciseName: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Montserrat-ExtraBold', flex: 1, right: -10 },
  dropdownIcon: { width: 28, height: 28, resizeMode: 'contain' },
  checkbox: { marginRight: 4 },
  checkboxBox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#FF3B30', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#FF3B30' },
  checkboxTick: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Montserrat-Black' },
  dropdownContent: { backgroundColor: '#111111', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#222222', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4 },
  tableHeaderText: { color: '#CCFF00', fontSize: 12, fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  setRowContainer: { position: 'relative', overflow: 'hidden' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, backgroundColor: '#111111' },
  setCell: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Montserrat-Regular', textAlign: 'center' },
  cellInput: { color: '#CCFF00', fontSize: 15, fontFamily: 'Montserrat-Regular', textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#CCFF00', paddingVertical: 2, minWidth: 60 },
  setDivider: { height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 4 },
  deleteSetBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', zIndex: -1 },
  deleteSetX: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Montserrat-Black' },
  addSetWrapper: { overflow: 'hidden', marginTop: 12 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, width: 320, height: 35 },
  addIcon: { width: 20, height: 20, resizeMode: 'contain', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addSetText: { color: '#000000', fontSize: 15, fontFamily: 'Montserrat-Bold', flex: 1, textAlign: 'center', marginTop: -5 },
  addExWrapper: { borderRadius: 15, overflow: 'hidden', marginTop: 8, borderWidth: 0.8, borderColor: '#CCFF00' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 15 },
  addExIconBox: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addExText: { color: '#CCFF00', fontSize: 15, fontFamily: 'Montserrat-ExtraBold', letterSpacing: 1, flex: 1, textAlign: 'center' },
});

export default PullScreen;