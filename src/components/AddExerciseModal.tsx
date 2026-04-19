import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  value: string;
  onChangeText: (text: string) => void;
}

const AddExerciseModal = ({
  visible,
  onClose,
  onConfirm,
  value,
  onChangeText,
}: AddExerciseModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.nameModalCard}>
          {/* MAIN TITLE RESTORED */}
          <Text style={styles.nameModalTitle}>Add Your Exercise</Text>

          {/* SUBTITLE 1: NAME OF EXERCISE */}
          <Text style={styles.sectionTitle}>Name of Exercise</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Bench Press"
            placeholderTextColor="#555"
            value={value}
            onChangeText={onChangeText}
            autoFocus
          />

          {/* SUBTITLE 2: FORMS AND ANGLES */}
          <Text style={styles.sectionTitle}>Form</Text>
          <View style={styles.formButtonContainer}>
            <TouchableOpacity style={styles.formBtn} onPress={() => console.log('Placeholder 1')}>
              <Text style={styles.formBtnText}>Add Form</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nameModalButtons}>
            <TouchableOpacity
              style={styles.nameModalCancelBtn}
              onPress={onClose}
            >
              <Text style={styles.nameModalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onConfirm} style={styles.nameModalConfirmWrapper}>
              <LinearGradient
                colors={['#CCFF00', '#8AAB00']}
                style={styles.nameModalConfirmBtn}
              >
                <Text style={styles.nameModalConfirmText}>Add</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameModalCard: {
    width: '85%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#42752E',
  },
  nameModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
    textAlign: 'left',
    opacity: 0.9,
  },
  nameInput: {
    backgroundColor: '#0D0D0D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#42752E',
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  formButtonContainer: {
    marginBottom: 25,
    gap: 10,
  },
  formBtn: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  formBtnText: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  nameModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nameModalCancelBtn: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#555',
    paddingVertical: 12,
    alignItems: 'center',
  },
  nameModalCancelText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
  },
  nameModalConfirmWrapper: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  nameModalConfirmBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 15,
  },
  nameModalConfirmText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Montserrat-ExtraBold',
  },
});

export default AddExerciseModal;