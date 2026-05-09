import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DistanceSelectionModalProps {
  visible: boolean;
  onSelect: (distance: 1 | 3 | 5) => void;
  onCancel: () => void;
}

const DistanceSelectionModal = ({ visible, onSelect, onCancel }: DistanceSelectionModalProps) => {
  const [selected, setSelected] = useState<1 | 3 | 5 | null>(null);

  const handleSelect = (distance: 1 | 3 | 5) => {
    setSelected(distance);
    onSelect(distance);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1a1a1a', '#0f0f0f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <Text style={styles.title}>SELECT TARGET DISTANCE</Text>
          <Text style={styles.subtitle}>Choose your race distance</Text>

          <View style={styles.optionsContainer}>
            {/* 1 KM Option */}
            <TouchableOpacity
              onPress={() => handleSelect(1)}
              style={[styles.option, selected === 1 && styles.selectedOption]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selected === 1
                    ? ['#34D399', '#5EE7DF']
                    : ['#2d2d2d', '#1a1a1a']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.optionGradient}
              >
                <Text style={[styles.distanceValue, selected === 1 && styles.selectedText]}>1</Text>
                <Text style={[styles.distanceLabel, selected === 1 && styles.selectedText]}>KM</Text>
                <Text style={[styles.distanceTime, selected === 1 && styles.selectedText]}></Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 3 KM Option */}
            <TouchableOpacity
              onPress={() => handleSelect(3)}
              style={[styles.option, selected === 3 && styles.selectedOption]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selected === 3
                    ? ['#A3CF06', '#C4E93C']
                    : ['#2d2d2d', '#1a1a1a']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.optionGradient}
              >
                <Text style={[styles.distanceValue, selected === 3 && styles.selectedText]}>3</Text>
                <Text style={[styles.distanceLabel, selected === 3 && styles.selectedText]}>KM</Text>
                <Text style={[styles.distanceTime, selected === 3 && styles.selectedText]}></Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 5 KM Option */}
            <TouchableOpacity
              onPress={() => handleSelect(5)}
              style={[styles.option, selected === 5 && styles.selectedOption]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selected === 5
                    ? ['#FF6B6B', '#FF8787']
                    : ['#2d2d2d', '#1a1a1a']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.optionGradient}
              >
                <Text style={[styles.distanceValue, selected === 5 && styles.selectedText]}>5</Text>
                <Text style={[styles.distanceLabel, selected === 5 && styles.selectedText]}>KM</Text>
                <Text style={[styles.distanceTime, selected === 5 && styles.selectedText]}></Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onCancel}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>CANCEL</Text>
          </TouchableOpacity>
        </LinearGradient>
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
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Montserrat-Black',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Barlow-Regular',
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 25,
    gap: 12,
  },
  option: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 5,
  },
  selectedOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionGradient: {
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  distanceValue: {
    color: '#CCCCCC',
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    lineHeight: 36,
  },
  distanceLabel: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginTop: 4,
  },
  distanceTime: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'Barlow-Regular',
    marginTop: 6,
  },
  selectedText: {
    color: '#121310',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#333333',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
});

export default DistanceSelectionModal;
