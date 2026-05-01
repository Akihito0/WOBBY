import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  routineType: string;
  exercises: string[];
}

const ExerciseModal: React.FC<ExerciseModalProps> = ({ visible, onClose, onConfirm, routineType, exercises }) => {
  // Track the index of the selected exercise
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset selection when the modal opens/closes
  useEffect(() => {
    if (!visible) setSelectedIndex(null);
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Pick Exercise</Text>
          <View style={styles.divider} />
          
          <Text style={styles.routineType}>{routineType}</Text>

          {exercises.map((item, index) => {
            const isSelected = selectedIndex === index;
            return (
              <TouchableOpacity 
                key={index} 
                onPress={() => setSelectedIndex(index)}
                style={styles.capsuleWrapper}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isSelected ? ['#CCFF00', '#7A9900'] : ['#FFFFFF', '#FFFFFF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.exerciseCapsule,
                  ]}
                >
                  <Text style={[styles.exerciseText, { color: isSelected ? '#000' : '#333' }]}>
                    {item}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={styles.confirmWrapper}>
              <TouchableOpacity 
                onPress={onConfirm}
                disabled={selectedIndex === null} // Only clickable if an exercise is chosen
              >
                <LinearGradient
                  // Confirm button turns green when an exercise is selected, otherwise stays white/grey
                  colors={selectedIndex !== null ? ['#CCFF00', '#7A9900'] : ['#FFFFFF', '#CCCCCC']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmText}>CONFIRM</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#121212',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#C6E48B',
    padding: 25,
    alignItems: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Montserrat-ExtraBold',
    marginBottom: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  routineType: {
    color: '#CCFF00',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  capsuleWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  exerciseCapsule: {
    width: '100%',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exerciseText: {
    fontSize: 18,
    fontFamily: 'Montserrat-ExtraBold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#555',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
  },
  confirmWrapper: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  confirmBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 15,
  },
  confirmText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Montserrat-ExtraBold',
  },
});

export default ExerciseModal;