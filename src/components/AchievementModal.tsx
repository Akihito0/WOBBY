import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Pressable 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AchievementModalProps {
  isVisible: boolean;
  onClose: () => void;
  achievement: {
    name: string;
    subtext: string;
    image: any;
    dateAchieved?: string; // e.g., "04.17.2026"
  } | null;
}

const AchievementModal = ({ isVisible, onClose, achievement }: AchievementModalProps) => {
  if (!achievement) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
        <Pressable style={styles.centeredView} onPress={onClose}>
          
          <Pressable style={styles.modalView}>
            {/* Outer Border Gradient/Container */}
            <View style={styles.modalBorder}>
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{achievement.name}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Image source={require('../assets/X.png')} style={styles.closeIcon} />
                </TouchableOpacity>
              </View>

              {/* Body Content */}
              <LinearGradient
                colors={['#000', '#666']}
                style={styles.contentGradient}
              >
                <Image source={achievement.image} style={styles.medalIcon} resizeMode="contain" />

                {/* Date Box */}
                <View style={styles.dateBox}>
                  <Text style={styles.dateText}>
                    {achievement.dateAchieved || 'MM.DD.YYYY'}
                  </Text>
                </View>

                <Text style={styles.subtext}>
                  Awarded for {achievement.subtext}
                </Text>

                {/* Confirm Button */}
                <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#37C60D', '#318B18']}
                    style={styles.confirmBtn}
                  >
                    <Text style={styles.confirmText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>

            </View>
          </Pressable>
        </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: { flex: 1 },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    width: '85%',
    maxWidth: 350,
  },
  modalBorder: {
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#6E8900',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
  },
  closeBtn: {
    position: 'absolute',
    right: 15,
  },
  closeIcon: {
    width: 20,
    height: 20,
    // box-shadow handled by asset or elevation here
  },
  contentGradient: {
    padding: 25,
    alignItems: 'center',
  },
  medalIcon: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  dateBox: {
    backgroundColor: '#363A28',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
    // Box Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dateText: {
    color: '#FFF',
    fontFamily: 'Barlow-Bold',
    fontSize: 16,
  },
  subtext: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    marginBottom: 30,
    lineHeight: 20,
  },
  confirmBtn: {
    paddingHorizontal: 60,
    paddingVertical: 12,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 8,
  },
  confirmText: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
});

export default AchievementModal;