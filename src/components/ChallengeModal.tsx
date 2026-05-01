import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';

interface ChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  data: {
    status: 'VICTORY' | 'DEFEAT';
    exerciseName: string;
    reps: number;
    sets: number;
    date: string;
    duration: string;
    opponent: string;
    xp: number;
  } | null;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({ visible, onClose, data }) => {
  if (!data) return null;

  const isVictory = data.status === 'VICTORY';

  // Dynamic Theme based on victory/defeat
  const theme = {
    title: isVictory ? '#8DEA0B' : '#E20000',
    divider: isVictory ? '#8DEA0B' : '#E20000',
    subheading: isVictory ? '#B7FF53' : '#FF9595',
    xp: isVictory ? '#B7FF53' : '#FF9595',
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          
          {/* Status Header */}
          <Text style={[styles.statusTitle, { color: theme.title }]}>
            {data.status === 'VICTORY' ? 'VICTORY' : 'DEFEAT'}
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Exercise Overview */}
          <View style={styles.subHeader}>
            <Text style={[styles.exerciseName, { color: theme.subheading }]}>
              {data.exerciseName}
            </Text>
            <Text style={[styles.statsRow, { color: theme.subheading }]}>
              {data.reps} reps  |  {data.sets} sets
            </Text>
          </View>

          {/* Performance Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Date:</Text>
              <Text style={styles.metricValue}>{data.date}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Duration:</Text>
              <Text style={styles.metricValue}>{data.duration}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Opponent:</Text>
              <Text style={styles.metricValue}>{data.opponent}</Text>
            </View>
          </View>

          {/* XP Reward Section */}
          <View style={styles.xpSection}>
            <Text style={[styles.xpValue, { color: theme.xp }]}>
              + {data.xp} XP
            </Text>
            <Image source={require('../assets/xp_gem.png')} style={styles.gem} />
          </View>

        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '88%',
    backgroundColor: '#121212',
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#C6E48B', // Muted lime border from image_3b4475.png
    padding: 30,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
  },
  divider: {
    width: '75%',
    height: 1.5,
    marginVertical: 15,
    marginTop: 10,
  },
  subHeader: {
    alignItems: 'center',
    marginBottom: 35,
  },
  exerciseName: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    textTransform: 'uppercase',
  },
  statsRow: {
    fontSize: 16,
    fontFamily: 'Barlow-Bold', // Barlow for numbers/sets
    marginTop: 4,
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metricLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Barlow-Bold',
    width: 90,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Barlow-Regular',
    flex: 1,
  },
  xpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  xpValue: {
    fontSize: 22,
    fontFamily: 'Barlow-Bold',
    marginRight: 8,
  },
  gem: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});

export default ChallengeModal;