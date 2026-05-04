import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { BarChart, LineChart } from 'react-native-gifted-charts';

import { getHeartRateHistory, HeartRateSample } from '../../modules/wobby-health';
import { useHealth } from '../context/HealthContext';

interface HeartRateModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabOption = 'H' | 'D' | 'W' | 'M';

const TABS: { id: TabOption; label: string; days: number }[] = [
  { id: 'H', label: 'H', days: 1 }, 
  { id: 'D', label: 'D', days: 1 },
  { id: 'W', label: 'W', days: 7 },
  { id: 'M', label: 'M', days: 30 },
];

export default function HeartRateModal({ visible, onClose }: HeartRateModalProps) {
  const { heartRate: liveHeartRate } = useHealth();
  
  const [activeTab, setActiveTab] = useState<TabOption>('H');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ max: 0, min: 0, avg: 0 });

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, activeTab]);

  const handleTabPress = (tabId: TabOption) => {
    if (activeTab === tabId) return;
    setLoading(true);
    setChartData([]); 
    setActiveTab(tabId);
  };

  const getGroupKey = (dateString: string, tab: TabOption) => {
    const d = new Date(dateString);
    if (tab === 'H') return `${d.getHours()}:${d.getMinutes()}`; 
    if (tab === 'D') return `${d.getDate()}-${d.getHours()}`; 
    return `${d.getMonth()}-${d.getDate()}`; 
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const selectedTab = TABS.find((t) => t.id === activeTab) || TABS[0];
      const rawHistory: HeartRateSample[] = await getHeartRateHistory(selectedTab.days);
      
      let history = rawHistory;
      if (activeTab === 'H') {
        const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
        history = rawHistory.filter(item => new Date(item.date).getTime() >= oneHourAgo);
      }
      
      if (history && history.length > 0) {
        let globalMax = 0;
        let globalMin = 999;
        let sum = 0;

        history.forEach((item) => {
          if (item.value > globalMax) globalMax = item.value;
          if (item.value < globalMin && item.value > 0) globalMin = item.value;
          sum += item.value;
        });

        const aggregated: { value: number; min: number; max: number; fullDate: string; dateObj: Date }[] = [];
        let currentGroup = '';
        let currentBucketValues: number[] = [];
        let bucketDate = '';

        history.forEach((sample, index) => {
          const groupKey = getGroupKey(sample.date, activeTab);

          if (groupKey !== currentGroup) {
            if (currentBucketValues.length > 0) {
              const avg = currentBucketValues.reduce((a, b) => a + b, 0) / currentBucketValues.length;
              const bMin = Math.min(...currentBucketValues);
              const bMax = Math.max(...currentBucketValues);
              aggregated.push({ value: Math.round(avg), min: bMin, max: bMax, fullDate: bucketDate, dateObj: new Date(bucketDate) });
            }
            currentGroup = groupKey;
            bucketDate = sample.date;
            currentBucketValues = [sample.value];
          } else {
            currentBucketValues.push(sample.value);
          }

          if (index === history.length - 1 && currentBucketValues.length > 0) {
            const avg = currentBucketValues.reduce((a, b) => a + b, 0) / currentBucketValues.length;
            const bMin = Math.min(...currentBucketValues);
            const bMax = Math.max(...currentBucketValues);
            aggregated.push({ value: Math.round(avg), min: bMin, max: bMax, fullDate: bucketDate, dateObj: new Date(bucketDate) });
          }
        });

        const displayData = aggregated.map((d, index) => {
          let label = '';
          const date = d.dateObj;

          if (activeTab === 'H') {
            if (index % 5 === 0) {
              let hours = date.getHours();
              let mins = date.getMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12 || 12;
              const minsStr = mins < 10 ? '0' + mins : mins;
              label = `${hours}:${minsStr} ${ampm}`;
            }
          } else if (activeTab === 'D') {
            if (index % 4 === 0) {
              let hours = date.getHours();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12 || 12;
              label = `${hours} ${ampm}`;
            }
          } else if (activeTab === 'W') {
            label = date.toLocaleDateString('en-US', { weekday: 'short' });
          } else if (activeTab === 'M') {
            if (index % 5 === 0) {
              label = `${date.getMonth() + 1}/${date.getDate()}`;
            }
          }

          if (activeTab === 'H') {
            return {
              value: d.value,
              label,
              fullDate: d.fullDate,
              rawAvg: d.value 
            };
          } else {
            const pillHeight = Math.max(6, d.max - d.min); 
            const baseValue = Math.max(0, d.max - pillHeight);
            
            return { 
              value: d.max, 
              stacks: [
                { value: baseValue, color: 'transparent' },
                { value: pillHeight, color: '#ccff00', borderRadius: 4, marginBottom: 2 }
              ],
              label, 
              fullDate: d.fullDate,
              rawAvg: d.value 
            };
          }
        });

        setStats({
          max: Math.round(globalMax),
          min: globalMin === 999 ? 0 : Math.round(globalMin),
          avg: Math.round(sum / history.length),
        });
        setChartData(displayData);
      } else {
        setChartData([]);
        setStats({ max: 0, min: 0, avg: 0 });
      }
    } catch (error) {
      console.log('Error fetching heart rate history:', error);
    } finally {
      setLoading(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80;
  
  const numPoints = chartData.length || 1;
  const hourlySpacing = Math.max(5, (chartWidth - 20) / numPoints);
  const barSpacing = Math.max(8, (chartWidth - 30 - (numPoints * 6)) / Math.max(numPoints - 1, 1));

  const chartPointerConfig = useMemo(() => ({
    pointerStripHeight: 200,
    pointerStripColor: '#ccff00',
    pointerStripWidth: 2,
    pointerColor: '#ccff00',
    radius: 6,
    pointerLabelWidth: 80,
    pointerLabelHeight: 40,
    activatePointersOnLongPress: true,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any) => {
      if (!items || !items[0]) return null;
      const val = items[0].rawAvg || items[0].value;
      return (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipValue}>{val} <Text style={{fontSize: 10}}>BPM</Text></Text>
        </View>
      );
    },
  }), []);

  // 👇 FIX: Reusable axis label style that forces width to prevent truncation
  const xAxisLabelStyle = { 
    color: '#94A3B8', 
    fontSize: 10, 
    fontFamily: 'Montserrat_600SemiBold', 
    textAlign: 'center' as const,
    width: 70, // Forces the container to be wide enough for the text
    marginLeft: -25, // Pulls the label back to the left so it stays centered under the data point
    marginTop: 4, // Replaces vertical shift
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Heart Rate Tracker</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.tabContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
                onPress={() => handleTabPress(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ccff00" />
            </View>
          ) : chartData.length > 0 ? (
            <>
              <View style={styles.cardRow}>
                <LinearGradient
                  colors={['#1a0b1c', '#000000']}
                  style={[styles.featureCard, { flex: 1, marginRight: 10 }]}
                >
                  <Text style={styles.cardSubtitle}>
                    {activeTab === 'H' ? "HOURLY AVG" : activeTab === 'D' ? "DAILY AVG" : activeTab === 'W' ? "7-DAY AVG" : "30-DAY AVG"}
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.mainValue}>{stats.avg}</Text>
                    <Text style={styles.statusText}>BPM</Text>
                  </View>
                </LinearGradient>

                <LinearGradient
                  colors={['#1c0b0b', '#000000']}
                  style={[styles.featureCard, { flex: 1.2 }]}
                >
                  <Text style={styles.cardSubtitle}>RANGE</Text>
                  <View style={styles.rangeRow}>
                    <Text style={styles.rangeValue}>H: <Text style={styles.accentOrange}>{stats.max}</Text></Text>
                    <Text style={styles.rangeValue}>L: <Text style={styles.accentGreen}>{stats.min}</Text></Text>
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.sectionHeader}>Activity Trends</Text>

              <View style={styles.chartContainer}>
                {activeTab === 'H' ? (
                  <LineChart
                    data={chartData}
                    height={220}
                    width={chartWidth}
                    thickness={0} 
                    hideDataPoints={false}
                    dataPointsColor="#ccff00"
                    dataPointsRadius={4}
                    initialSpacing={10}
                    spacing={hourlySpacing} 
                    
                    yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Montserrat_600SemiBold' }}
                    xAxisLabelTextStyle={xAxisLabelStyle} // 👇 Applied fix here
                    
                    yAxisColor="transparent"
                    xAxisColor="#333333"
                    hideRules={false}
                    rulesType="solid"
                    rulesColor="rgba(255,255,255,0.05)"
                    maxValue={stats.max + 15}
                    noOfSections={5}
                    isAnimated
                    pointerConfig={chartPointerConfig}
                  />
                ) : (
                  <BarChart
                    stackData={chartData}
                    height={220}
                    width={chartWidth}
                    barWidth={6}
                    initialSpacing={10}
                    spacing={barSpacing} 

                    yAxisTextStyle={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Montserrat_600SemiBold' }}
                    xAxisLabelTextStyle={xAxisLabelStyle} // 👇 Applied fix here
                    
                    yAxisColor="transparent"
                    xAxisColor="#333333"
                    hideRules={false}
                    rulesType="solid"
                    rulesColor="rgba(255,255,255,0.05)"
                    maxValue={stats.max + 15}
                    noOfSections={5}
                    isAnimated
                    pointerConfig={chartPointerConfig}
                  />
                )}
              </View>

              <LinearGradient
                colors={['#1c0303', '#000000']}
                style={styles.liveBottomCard}
              >
                <View style={styles.liveHeaderRow}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.liveLabel}>CURRENT HEART RATE</Text>
                </View>
                <View style={styles.liveValueRow}>
                  <Text style={styles.liveValueBig}>
                    {liveHeartRate !== null ? liveHeartRate : '--'}
                  </Text>
                  <Text style={styles.liveUnitBig}>BPM</Text>
                </View>
              </LinearGradient>

            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="pulse-outline" size={54} color="#333" />
              <Text style={styles.emptyText}>No heart rate history found for this time period.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', 
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E', 
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#636366', 
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_800ExtraBold',
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featureCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainValue: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: 'Montserrat_900Black',
    marginRight: 6,
  },
  statusText: {
    color: '#ccff00', 
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  rangeRow: {
    flexDirection: 'column', 
    marginTop: 5,
    gap: 4,
  },
  rangeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  accentOrange: { color: '#FF8A00' },
  accentGreen: { color: '#ccff00' },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
    marginTop: 10,
    marginBottom: 20,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    paddingVertical: 20,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  tooltipContainer: {
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccff00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 22,
  },
  liveBottomCard: {
    marginTop: 24,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
    marginRight: 8,
  },
  liveLabel: {
    color: '#FF4444',
    fontSize: 13,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 2,
  },
  liveValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  liveValueBig: {
    color: '#FFFFFF',
    fontSize: 72, 
    fontFamily: 'Montserrat_900Black',
    marginRight: 8,
  },
  liveUnitBig: {
    color: '#ccff00', 
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
  },
});