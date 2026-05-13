import React from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SignOutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const SignOutModal: React.FC<SignOutModalProps> = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Image 
            source={require('../assets/sign_out.png')} 
            style={styles.loader}
            resizeMode="contain"
          />
          <Text style={styles.text}>Are you sure you want to sign out?</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            
            <LinearGradient
              colors={['#b35353', '#7e0000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signOutBtnGradient}
            >
              <TouchableOpacity style={styles.signOutBtn} onPress={onConfirm} activeOpacity={0.7}>
                <Text style={styles.signOutText}>SIGN OUT</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 370,
    height: 280,
    backgroundColor: '#220000ec', 
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#530101', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#520000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  loader: {
    width: 70, 
    height: 70,
    marginBottom: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#555',
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  signOutBtnGradient: {
    borderRadius: 15,
    flex: 1.6,
  },
  signOutBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    textAlign: 'center',
  }
});

export default SignOutModal;