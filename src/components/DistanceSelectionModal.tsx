import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DistanceSelectionModalProps {
  visible: boolean;
  onSelect: (distance: 1 | 3 | 5) => void;
  onCancel: () => void;
}

const DISTANCE_OPTIONS: (1 | 3 | 5)[] = [1, 3, 5];

const DistanceSelectionModal = ({ visible, onSelect, onCancel }: DistanceSelectionModalProps) => {
  const [selected, setSelected] = useState<1 | 3 | 5 | null>(null);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Match Setup</Text>
          <View style={styles.divider} />

          <Text style={styles.routineType}>SELECT TARGET DISTANCE</Text>
          <Text style={styles.subLabel}>Choose your race distance</Text>

          <View style={styles.optionsRow}>
            {DISTANCE_OPTIONS.map((dist) => (
              <TouchableOpacity 
                key={dist} 
                onPress={() => setSelected(dist)}
                style={styles.pillWrapper}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selected === dist ? ['#CCFF00', '#7A9900'] : ['#2A2A2A', '#1A1A1A']}
                  style={styles.pill}
                >
                  <View style={styles.pillContent}>
                    <Text style={[styles.pillText, { color: selected === dist ? '#000' : '#FFF' }]}>
                      {dist}
                    </Text>
                    <Text style={[styles.unitText, { color: selected === dist ? '#000' : '#888' }]}>
                      KM
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={styles.confirmWrapper}>
              <TouchableOpacity 
                onPress={handleConfirm}
                disabled={!selected}
              >
                <LinearGradient
                  colors={selected ? ['#CCFF00', '#7A9900'] : ['#333', '#222']}
                  style={styles.confirmBtn}
                >
                  <Text style={[styles.confirmText, { color: selected ? '#000' : '#666' }]}>FIND MATCH</Text>
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
    alignItems: 'center' 
  },
  container: { 
    width: '90%', 
    backgroundColor: '#121212', 
    borderRadius: 30, 
    borderWidth: 1.5, 
    borderColor: '#C6E48B', 
    padding: 25, 
    alignItems: 'center' 
  },
  title: { 
    color: '#FFF', 
    fontSize: 22, 
    fontFamily: 'Montserrat-ExtraBold', 
    marginBottom: 10 
  },
  divider: { 
    width: '100%', 
    height: 1, 
    backgroundColor: '#333', 
    marginBottom: 20 
  },
  routineType: { 
    color: '#CCFF00', 
    fontSize: 14, 
    fontFamily: 'Montserrat-Bold', 
    marginBottom: 5, 
    alignSelf: 'flex-start' 
  },
  subLabel: { 
    color: '#888', 
    fontSize: 12, 
    fontFamily: 'Montserrat-Bold', 
    marginBottom: 20, 
    alignSelf: 'flex-start' 
  },
  optionsRow: { 
    flexDirection: 'row', 
    gap: 12, 
    width: '100%',
    justifyContent: 'space-between'
  },
  pillWrapper: { 
    flex: 1,
  },
  pill: { 
    borderRadius: 15, 
    paddingVertical: 20, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillContent: {
    alignItems: 'center',
  },
  pillText: { 
    fontSize: 24, 
    fontFamily: 'Montserrat-ExtraBold' 
  },
  unitText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    marginTop: 2
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 15,
    marginTop: 30, 
    width: '100%' 
  },
  cancelBtn: { 
    flex: 1, 
    borderRadius: 15, 
    borderWidth: 1.5, 
    borderColor: '#555', 
    paddingVertical: 14, 
    alignItems: 'center' 
  },
  cancelText: { 
    color: '#888', 
    fontSize: 15, 
    fontFamily: 'Montserrat-Bold' 
  },
  confirmWrapper: { 
    flex: 1.5, 
    borderRadius: 15, 
    overflow: 'hidden' 
  },
  confirmBtn: { 
    paddingVertical: 15, 
    alignItems: 'center', 
    borderRadius: 15 
  },
  confirmText: { 
    fontSize: 15, 
    fontFamily: 'Montserrat-ExtraBold' 
  },
});

export default DistanceSelectionModal;
