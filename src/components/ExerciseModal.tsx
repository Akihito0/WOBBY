import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (exercise: string, sets: number, reps: number) => void;
  routineType: string;
  exercises: string[];
}

const SET_OPTIONS = [1, 2, 3];
const REP_OPTIONS = [6, 8, 12];

const ExerciseModal: React.FC<ExerciseModalProps> = ({ visible, onClose, onConfirm, routineType, exercises }) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedSets, setSelectedSets] = useState<number | null>(null);
  const [selectedReps, setSelectedReps] = useState<number | null>(null);

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedExercise(null);
      setSelectedSets(null);
      setSelectedReps(null);
    }
  }, [visible]);

  // Only allow confirm if all three rules are picked!
  const canConfirm = selectedExercise !== null && selectedSets !== null && selectedReps !== null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Match Setup</Text>
          <View style={styles.divider} />
          
          <Text style={styles.routineType}>{routineType} EXERCISES</Text>

          {/* Exercise Selection */}
          <View style={styles.optionsRow}>
            {exercises.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setSelectedExercise(item)}
                style={styles.pillWrapper}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedExercise === item ? ['#CCFF00', '#7A9900'] : ['#2A2A2A', '#1A1A1A']}
                  style={styles.pill}
                >
                  <Text style={[styles.pillText, { color: selectedExercise === item ? '#000' : '#FFF' }]}>
                    {item}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sets Selection */}
          <Text style={styles.subLabel}>TARGET SETS</Text>
          <View style={styles.optionsRow}>
            {SET_OPTIONS.map((sets) => (
              <TouchableOpacity key={`set-${sets}`} onPress={() => setSelectedSets(sets)} style={styles.circleWrapper}>
                <LinearGradient
                  colors={selectedSets === sets ? ['#CCFF00', '#7A9900'] : ['#2A2A2A', '#1A1A1A']}
                  style={styles.circlePill}
                >
                  <Text style={[styles.pillText, { color: selectedSets === sets ? '#000' : '#FFF' }]}>{sets}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reps Selection */}
          <Text style={styles.subLabel}>REPS PER SET</Text>
          <View style={styles.optionsRow}>
            {REP_OPTIONS.map((reps) => (
              <TouchableOpacity key={`rep-${reps}`} onPress={() => setSelectedReps(reps)} style={styles.circleWrapper}>
                <LinearGradient
                  colors={selectedReps === reps ? ['#CCFF00', '#7A9900'] : ['#2A2A2A', '#1A1A1A']}
                  style={styles.circlePill}
                >
                  <Text style={[styles.pillText, { color: selectedReps === reps ? '#000' : '#FFF' }]}>{reps}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={styles.confirmWrapper}>
              <TouchableOpacity 
                onPress={() => onConfirm(selectedExercise!, selectedSets!, selectedReps!)}
                disabled={!canConfirm}
              >
                <LinearGradient
                  colors={canConfirm ? ['#CCFF00', '#7A9900'] : ['#333', '#222']}
                  style={styles.confirmBtn}
                >
                  <Text style={[styles.confirmText, { color: canConfirm ? '#000' : '#666' }]}>FIND MATCH</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', backgroundColor: '#121212', borderRadius: 30, borderWidth: 1.5, borderColor: '#C6E48B', padding: 25, alignItems: 'center' },
  title: { color: '#FFF', fontSize: 22, fontFamily: 'Montserrat-ExtraBold', marginBottom: 10 },
  divider: { width: '100%', height: 1, backgroundColor: '#333', marginBottom: 20 },
  routineType: { color: '#CCFF00', fontSize: 14, fontFamily: 'Montserrat-Bold', marginBottom: 15, alignSelf: 'flex-start' },
  subLabel: { color: '#888', fontSize: 12, fontFamily: 'Montserrat-Bold', marginTop: 15, marginBottom: 10, alignSelf: 'flex-start' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  pillWrapper: { flexGrow: 1, minWidth: '45%' },
  pill: { borderRadius: 15, paddingVertical: 12, alignItems: 'center' },
  circleWrapper: { flex: 1 },
  circlePill: { borderRadius: 15, paddingVertical: 12, alignItems: 'center' },
  pillText: { fontSize: 14, fontFamily: 'Montserrat-ExtraBold' },
  buttonRow: { flexDirection: 'row', gap: 15, marginTop: 30, width: '100%' },
  cancelBtn: { flex: 1, borderRadius: 15, borderWidth: 1.5, borderColor: '#555', paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 15, fontFamily: 'Montserrat-Bold' },
  confirmWrapper: { flex: 1.5, borderRadius: 15, overflow: 'hidden' },
  confirmBtn: { paddingVertical: 15, alignItems: 'center', borderRadius: 15 },
  confirmText: { fontSize: 15, fontFamily: 'Montserrat-ExtraBold' },
});

export default ExerciseModal;