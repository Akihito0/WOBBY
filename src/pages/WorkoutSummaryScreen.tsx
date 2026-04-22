import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function WorkoutSummaryScreen({ route, navigation }: any) {
  const { 
    exercises = [], 
    elapsedSeconds = 0, 
    completedSets = 0, 
    completedReps = 0 
  } = route.params || {};

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F4933', '#000000']}
        locations={[0, 0.93]}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>WORKOUT SUMMARY</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>DURATION</Text>
          <Text style={styles.value}>{formatTime(elapsedSeconds)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.label}>TOTAL SETS</Text>
            <Text style={styles.value}>{completedSets}</Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.label}>TOTAL REPS</Text>
            <Text style={styles.value}>{completedReps}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <LinearGradient
            colors={['#B1DD01', '#678101']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>GO TO DASHBOARD</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121310' 
  },
  headerGradient: { 
    paddingTop: 80, 
    paddingBottom: 30, 
    paddingHorizontal: 20, 
    alignItems: 'center' 
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  content: { 
    padding: 20, 
    gap: 15 
  },
  card: { 
    backgroundColor: '#323C2E', 
    padding: 24, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  row: { 
    flexDirection: 'row', 
    gap: 15 
  },
  halfCard: { 
    flex: 1 
  },
  label: { 
    color: '#AAA', 
    fontSize: 14, 
    marginBottom: 8,
    fontWeight: '600'
  },
  value: { 
    color: '#B1DD01', 
    fontSize: 36, 
    fontWeight: 'bold' 
  },
  homeBtn: { 
    marginTop: 40, 
    borderRadius: 30, 
    overflow: 'hidden' 
  },
  btnGradient: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  btnText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});
