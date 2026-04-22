import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function WorkoutSummaryScreen({ route, navigation }: any) {
  const [workoutTitle, setWorkoutTitle] = useState('Chest Day!');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Use the exercises passed from the active workout, or mock data if testing natively
  const exercises = route.params?.exercises || [
    { name: 'Push ups', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
    { name: 'Bench Press', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
    { name: 'Tricep Dips', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
  ];

  const handleDiscard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'WorkoutMain' }],
    });
  };

  const handleSave = () => {
    // TODO: Create logic to push this workout payload to the Dashboard (Home) feed
    navigation.reset({
      index: 0,
      routes: [{ name: 'WorkoutMain' }],
    });
  };

  return (
    <View style={styles.container}>
      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={['#3a1a1a', '#18181b']}
        locations={[0, 1]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#CCFF00" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FINISH WORKOUT</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* INPUT FIELDS */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.singleLineInput}
            value={workoutTitle}
            onChangeText={setWorkoutTitle}
            placeholder="Workout Title"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.multiLineInput}
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            placeholder="How did it go? Share more about your workout!"
            placeholderTextColor="#888"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* MEDIA UPLOAD BOX */}
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={32} color="#00BFFF" />
          <Text style={styles.uploadText}>Add Photos/Videos</Text>
        </TouchableOpacity>

        {/* EXERCISES LIST */}
        {exercises.map((item: any, index: number) => (
          <LinearGradient
            key={index}
            colors={['#2A2A2A', '#1d2105']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.exerciseCardGradient}
          >
            <View style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              
              <View style={styles.exerciseStatsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Duration:</Text>
                  <Text style={styles.statValue}>{item.duration || '0 minutes'}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Reps:</Text>
                  <Text style={styles.statValue}>{item.reps || 0}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Sets:</Text>
                  <Text style={styles.statValue}>{item.sets || 0}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Avg. Weight</Text>
                  <Text style={styles.statValue}>{item.avgWeight || 'None'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.discardButton} 
          onPress={handleDiscard} 
          activeOpacity={0.8}
        >
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave} 
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>Save Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b', // Background dark mode matching the prompt
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Barlow-ExtraBold',
    fontSize: 22,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 15,
  },
  singleLineInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#CCFF00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  multiLineInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#CCFF00',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: '#FFF',
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    height: 120,
  },
  uploadBox: {
    height: 120,
    borderWidth: 2,
    borderColor: '#00BFFF',
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(0, 191, 255, 0.05)',
  },
  uploadText: {
    color: '#00BFFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 12,
    marginTop: 8,
  },
  exerciseCardGradient: {
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  exerciseCard: {
    padding: 20,
  },
  exerciseName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: '#FFF',
    marginBottom: 15,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 13,
    color: '#FFF',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#151515',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  discardButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  discardText: {
    color: '#FF3333',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#CCFF00',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveText: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
});

