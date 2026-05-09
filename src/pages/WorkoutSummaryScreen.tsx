import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { uploadRunMedia } from '../services/runUpload';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to convert image URI to base64 for uploading
const uriToBase64 = async (uri: string): Promise<string | null> => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read blob as data URL'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  } catch (error) {
    console.error('Error in uriToBase64:', error);
    return null;
  }
};

export default function WorkoutSummaryScreen({ route, navigation }: any) {
  const [workoutTitle, setWorkoutTitle] = useState('Chest Day!');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Extract navigation params
  const routineType = route.params?.routineType || 'Workout';
  const elapsedSeconds = route.params?.elapsedSeconds || 0;
  const exercises = route.params?.exercises || [];

  const { stackedData, workoutStats } = useMemo(() => {
    let dataPoints: any[] = [];
    let sum = 0;
    let max = 0;
    let min = 999;

    exercises.forEach((ex: any) => {
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach((set: any) => {
          if (set.avgHR && set.avgHR > 0) {
            const hr = set.avgHR;
            sum += hr;
            if (hr > max) max = hr;
            if (hr < min) min = hr;

            const pillHeight = 8;
            const baseValue = Math.max(0, hr - pillHeight);

            dataPoints.push({
              stacks: [
                { value: baseValue, color: 'transparent' },
                { value: pillHeight, color: '#FF4444', borderRadius: 4, marginBottom: 2 }
              ],
              rawHR: hr
            });
          }
        });
      }
    });

    return {
      stackedData: dataPoints,
      workoutStats: {
        avg: dataPoints.length > 0 ? Math.round(sum / dataPoints.length) : 0,
        max: max,
        min: min === 999 ? 0 : min,
      }
    };
  }, [exercises]);

  const chartWidth = SCREEN_WIDTH - 80;
  const barWidth = 6;
  const numBars = stackedData.length || 1;
  const availableWidth = chartWidth - 30;
  const safeSpacing = numBars > 1 ? (availableWidth - (numBars * barWidth)) / (numBars - 1) : 0;

  const chartPointerConfig = useMemo(() => ({
    pointerStripHeight: 150,
    pointerStripColor: '#FF4444',
    pointerStripWidth: 2,
    pointerColor: '#FF4444',
    radius: 6,
    pointerLabelWidth: 80,
    pointerLabelHeight: 40,
    activatePointersOnLongPress: true,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any) => {
      if (!items || !items[0]) return null;
      const val = items[0].rawHR || items[0].value;
      return (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipValue}>{val} <Text style={{fontSize: 10}}>BPM</Text></Text>
        </View>
      );
    },
  }), []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to add one.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleDiscard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'WorkoutMain' }],
    });
  };

  const handleSave = async () => {
    if (!workoutTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your workout.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user. Please log in again.');
        setIsSaving(false);
        return;
      }

      let uploadedImageUrl = null;

      // 1. Upload image if the user selected one
      if (selectedImage) {
        const base64Data = await uriToBase64(selectedImage);
        if (base64Data) {
          const fileName = `routine-${Date.now()}.jpg`;
          uploadedImageUrl = await uploadRunMedia(session.user.id, base64Data, fileName, 'image/jpeg');
        }
      }

      // 2. Save everything to completed_routines
      const { error } = await supabase.from('completed_routines').insert([
        {
          user_id: session.user.id,
          routine_type: routineType,
          caption: workoutTitle.trim(),
          notes: workoutNotes.trim(),
          media_url: uploadedImageUrl,
          total_duration: elapsedSeconds,
          exercises_data: exercises,
        }
      ]);

      if (error) {
        Alert.alert('Error', `Failed to save workout: ${error.message}`);
        setIsSaving(false);
        return;
      }

      // 💰 CALCULATE & AWARD XP
      let totalRepsCompleted = 0;
      let totalSetsCompleted = 0;
      let totalTargetReps = 0;

      exercises.forEach((ex: any) => {
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach((s: any) => {
            totalRepsCompleted += Number(s.reps) || 0;
            totalSetsCompleted += 1;
            totalTargetReps += Number(s.reps) || 0; // All finished sets count as target met
          });
        }
      });

      const baseXP = 50;
      const repXP = totalRepsCompleted * 5;
      const setXP = totalSetsCompleted * 25;
      const durationBonus = elapsedSeconds > 300 ? 50 : 0; // >5 min
      const perfectBonus = totalRepsCompleted >= totalTargetReps && totalSetsCompleted > 0 ? 100 : 0;
      const earnedXP = baseXP + repXP + setXP + durationBonus + perfectBonus;

      // Save XP to profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ xp: (profile.xp || 0) + earnedXP })
            .eq('id', session.user.id);
        }
      } catch (xpErr) {
        console.log('XP save error (non-critical):', xpErr);
      }

      Alert.alert('Workout Saved! 💪', `You earned +${earnedXP} XP!\n\n🏋️ ${totalRepsCompleted} reps × ${totalSetsCompleted} sets`);
      setIsSaving(false);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'Home' } }],
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
      setIsSaving(false);
    }
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
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={handlePickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#00BFFF" />
              <Text style={styles.uploadText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* EXERCISES LIST */}
        {exercises.map((item: any, index: number) => {
          
          let exerciseAvgHR = 0;
          let exerciseMaxHR = 0;
          
          if (Array.isArray(item.sets)) {
            const setsWithHR = item.sets.filter((s: any) => s.avgHR > 0);
            
            if (setsWithHR.length > 0) {
              const sumAvg = setsWithHR.reduce((acc: number, s: any) => acc + s.avgHR, 0);
              exerciseAvgHR = Math.round(sumAvg / setsWithHR.length);
              exerciseMaxHR = Math.max(...setsWithHR.map((s: any) => s.maxHR || 0));
            }
          }

          return (
            <LinearGradient
              key={index}
              colors={['#2A2A2A', '#1d2105']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exerciseCardGradient}
            >
              <View style={styles.exerciseCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  
                  {exerciseAvgHR > 0 && (
                     <View style={styles.hrBadge}>
                       <Text style={{fontSize: 10, marginRight: 4}}>❤️</Text>
                       <Text style={styles.hrBadgeText}>HR TRACKED</Text>
                     </View>
                  )}
                </View>
                
                <View style={styles.exerciseStatsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Reps</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) ? item.sets.reduce((acc: number, s: any) => acc + (Number(s.reps) || 0), 0) : (item.reps || 0)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Sets</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) ? item.sets.length : (item.sets || 0)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Avg. Wgt</Text>
                    <Text style={styles.statValue}>
                      {Array.isArray(item.sets) 
                        ? (item.sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0), 0) / (item.sets.length || 1)).toFixed(1) 
                        : (item.avgWeight || 'None')}
                    </Text>
                  </View>
                </View>

                {exerciseAvgHR > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.exerciseStatsRow}>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Average HR</Text>
                        <Text style={styles.statValue}>{exerciseAvgHR} <Text style={{fontSize: 10, color: '#888'}}>BPM</Text></Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Peak HR</Text>
                        <Text style={[styles.statValue, {color: '#FF4444'}]}>{exerciseMaxHR} <Text style={{fontSize: 10, color: '#888'}}>BPM</Text></Text>
                      </View>
                      <View style={styles.statCol} /> 
                    </View>
                  </>
                )}

              </View>
            </LinearGradient>
          );
        })}

        {stackedData.length > 0 && (
          <View style={styles.hrChartContainer}>
            <View style={styles.hrChartHeader}>
              <Text style={styles.hrChartTitle}>WORKOUT HR TREND</Text>
              <Text style={styles.hrChartRangeValue}>
                {workoutStats.min}–{workoutStats.max} <Text style={styles.hrChartBpm}>BPM</Text>
              </Text>
            </View>

            <BarChart
              stackData={stackedData}
              height={150}
              width={chartWidth}
              barWidth={barWidth}
              spacing={safeSpacing}
              initialSpacing={10}
              hideRules={false}
              rulesType="solid"
              rulesColor="rgba(255,255,255,0.05)"
              yAxisTextStyle={{ color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium' }}
              hideYAxisText={false}
              yAxisColor="transparent"
              xAxisColor="#333333"
              maxValue={Math.max(workoutStats.max, 120) + 10} 
              noOfSections={4}
              pointerConfig={chartPointerConfig}
            />
          </View>
        )}

      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.discardButton} 
          onPress={handleDiscard} 
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave} 
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveText}>Save Workout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b', 
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
  },
  hrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  hrBadgeText: {
    color: '#FF4444',
    fontFamily: 'Montserrat-Bold',
    fontSize: 9,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'flex-start',
    flex: 1,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  hrChartContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    paddingTop: 16,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  hrChartHeader: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  hrChartTitle: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hrChartRangeValue: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Montserrat-Black',
  },
  hrChartBpm: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Montserrat-Medium',
  },
  tooltipContainer: {
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
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