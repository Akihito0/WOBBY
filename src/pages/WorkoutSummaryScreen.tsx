import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 👇 ADDED: Import BarChart for the vertical Apple Health style
import { BarChart } from 'react-native-gifted-charts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WorkoutSummaryScreen({ route, navigation }: any) {
  const [workoutTitle, setWorkoutTitle] = useState('Chest Day!');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Receives the live exercises array with the newly injected HR data
  const exercises = route.params?.exercises || [
    { name: 'Push ups', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
    { name: 'Bench Press', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
    { name: 'Tricep Dips', duration: '30 minutes', reps: 115, sets: 3, avgWeight: 'None' },
  ];

  // 👇 ADDED: Extract and aggregate HR data into stacked vertical bars
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

            // Force a minimum pill height of 8 so flat data never renders as dots
            const pillHeight = 8;
            const baseValue = Math.max(0, hr - pillHeight);

            dataPoints.push({
              stacks: [
                { value: baseValue, color: 'transparent' },
                { value: pillHeight, color: '#FF4444', borderRadius: 4, marginBottom: 2 }
              ],
              rawHR: hr // Store raw value for the tooltip
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

  // Precise math to prevent the right-side overflow of the chart container
  const chartWidth = SCREEN_WIDTH - 80;
  const barWidth = 6;
  const numBars = stackedData.length || 1;
  const availableWidth = chartWidth - 30; // Buffer to stop the right edge from clipping
  const safeSpacing = numBars > 1 ? (availableWidth - (numBars * barWidth)) / (numBars - 1) : 0;

  // 👇 ADDED: Memorized pointer config for the tooltip
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
      // Pull the rawHR we injected to ensure the tooltip shows the correct total BPM
      const val = items[0].rawHR || items[0].value;
      return (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipValue}>{val} <Text style={{fontSize: 10}}>BPM</Text></Text>
        </View>
      );
    },
  }), []);

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
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{item.duration || '-'}</Text>
                  </View>
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
                      <View style={styles.statCol} /> 
                    </View>
                  </>
                )}

              </View>
            </LinearGradient>
          );
        })}

        {/* 👇 ADDED: Global Workout Heart Rate Trend Chart moved to the bottom */}
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

  // 👇 ADDED: Styles for the global HR Chart
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