import React from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity } from 'react-native';

interface FindingProps {
  visible: boolean;
  onCancel: () => void; // 👇 ADDED THIS
}

const Finding: React.FC<FindingProps> = ({ visible, onCancel }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Image 
            source={require('../assets/loader.gif')} 
            style={styles.loader}
            resizeMode="contain"
          />
          <Text style={styles.text}>FINDING A WORKOUT BUDDY</Text>
          
          {/* 👇 ADDED CANCEL BUTTON */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
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
    width: 320,
    height: 280, // Increased height to fit the button
    backgroundColor: '#0f0f0f', 
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#b5d37d', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#b5d37d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  loader: {
    width: 250, 
    height: 100,
    marginBottom: 15,
  },
  text: {
    color: '#8c8c8c',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 25,
  },
  cancelBtn: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#555'
  },
  cancelText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  }
});

export default Finding;