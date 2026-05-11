import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AchievementGridCard from '../components/AchievementGridCard';
import AchievementListCard from '../components/AchievementListCard';
import AchievementModal from '../components/AchievementModal';

interface Achievement {
  id: string;
  name: string;
  subtext: string;
  xp: number;
  category: string;
  image: any; 
}

// 1. Keep the DATA outside (this is fine)
export const ACHIEVEMENT_DATA: Achievement[] = [
  {
    id: '1',
    name: 'Perfect Form',
    subtext: 'Completing a full set with 100% repetitions in safe zones.',
    xp: 1000,
    category: '   Form & Technical Mastery',
    image: require('../assets/perfect_form.png'),
  },
  {
    id: '2',
    name: 'Injury-Free Streak',
    subtext: 'Completing 10 consecutive sessions without the model triggering a high-risk form warning.',
    xp: 1000,
    category: '   Form & Technical Mastery',
    image: require('../assets/injury_free.png'),
  },
  {
    id: '3',
    name: 'Pushup Prodigy',
    subtext: 'Reaching a cumulative total of 1,000 tracked pushups.',
    xp: 1000,
    category: '   Bodyweight Mastery',
    image: require('../assets/pushup_prodigy.png'),
  },
   {
    id: '4',
    name: 'Dips Dynamo',
    subtext: 'Completing a cumulative total of 500 tricep dips.',
    xp: 1000,
    category: '   Bodyweight Mastery',
    image: require('../assets/dips_dynamo.png'),
  },
   {
    id: '5',
    name: 'Squat Scholar',
    subtext: 'Reaching 500 cumulative squats.',
    xp: 1000,
    category: '   Bodyweight Mastery',
    image: require('../assets/squat_scholar.png'),
  },
   {
    id: '6',
    name: 'Lunge Legend',
    subtext: 'Completing 100 lunges.',
    xp: 1000,
    category: '   Bodyweight Mastery',
    image: require('../assets/lunge_legend.png'),
  },
  {
    id: '7',
    name: 'The Strider I',
    subtext: 'Completing a total of 5 km.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/striderI.png'),
  },
  {
    id: '8',
    name: 'The Climber I ',
    subtext: 'Achieving a total elevation gain of 50 m.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/climberI.png'),
  },
  {
    id: '9',
    name: 'The Pacer I ',
    subtext: 'Achieving an average pace of 10:00/km or faster in a single run.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/pacerI.png'),
  },
  {
    id: '10',
    name: 'The Strider II',
    subtext: 'Completing a total of 10 km.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/striderII.png'),
  },
  {
    id: '11',
    name: 'The Climber II ',
    subtext: 'Achieving a total elevation gain of 250 m.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/climberII.png'),
  },
   {
    id: '12',
    name: 'The Pacer II ',
    subtext: 'Achieving an average pace of 6:00/km or faster in a single run.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/pacerII.png'),
  },
  {
    id: '13',
    name: 'The Strider III',
    subtext: 'Completing a total of 21km (Half-Marathon distance).',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/striderIII.png'),
  },
  {
    id: '14',
    name: 'The Climber III ',
    subtext: 'Achieving a total elevation gain of 500 m.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/climberIII.png'),
  },
   {
    id: '15',
    name: 'The Pacer III ',
    subtext: 'Achieving an average pace of 3:00/km or faster in a single run.',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/pacerIII.png'),
  },
  {
    id: '16',
    name: 'The Strider IV',
    subtext: 'Completing a total of 42km (Full Marathon distance).',
    xp: 1000,
    category: '   Strides & Summits',
    image: require('../assets/striderIV.png'),
  },
  {
    id: '17',
    name: 'Sync Specialist',
    subtext: 'Successfully syncing heart rate data from an external wearable (Apple Watch, Garmin, or WearOS).',
    xp: 1000,
    category: '   Hybrid Health & Biometrics',
    image: require('../assets/sync_specialist.png'),
  },
  {
    id: '18',
    name: 'BMI Voyager',
    subtext: 'Recording height and weight data to track Body Mass Index (BMI) changes over 30 days.',
    xp: 1000,
    category: '   Hybrid Health & Biometrics',
    image: require('../assets/bmi_voyager.png'),
  },

  {
    id: '20',
    name: '7 - Day Streak',
    subtext: 'Maintaining consistency by completing at least one tracked workout for seven consecutive days.',
    xp: 1000,
    category: '   Progression & Consistency',
    image: require('../assets/7_day_streak.png'),
  },
   {
    id: '21',
    name: 'Habit Builder',
    subtext: 'Completing 21 days of workouts within a single month to reinforce long-term retention.',
    xp: 1000,
    category: '   Progression & Consistency',
    image: require('../assets/habit_builder.png'),
  },
  {
    id: '22',
    name: 'Early Bird',
    subtext: 'Completing a full workout session before 8:00 AM.',
    xp: 1000,
    category: '   Progression & Consistency',
    image: require('../assets/early_bird.png'),
  },
  {
    id: '23',
    name: 'Night Owl',
    subtext: 'Finishing a tracked workout session after 9:00 PM.',
    xp: 1000,
    category: '   Progression & Consistency',
    image: require('../assets/night_owl.png'),
  },
];

const AchievementsScreen = ({ route, navigation }: any) => {
  const unlockedAchievements: string[] = route?.params?.unlockedAchievements || [];
  // 2. MOVE STATES INSIDE THE COMPONENT
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

  const handlePressGrid = (item: any) => {
    setSelectedAchievement(item);
    setModalVisible(true);
  };

  // Grouping the data by category
  const groupedData = ACHIEVEMENT_DATA.reduce((acc, obj) => {
    const key = obj.category.trim(); // Trim spaces to avoid grouping issues
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Full-Width Header */}
      <LinearGradient
        colors={['#390025', '#000000']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image 
                source={require('../assets/back0.png')} 
                style={styles.backIcon} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ACHIEVEMENTS</Text>
            <View style={{ width: 24 }} /> 
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Toggle Section */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleWrapper}>
            <TouchableOpacity 
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.activeToggle]}
            >
              <Image 
                source={require('../assets/listview.png')} 
                style={[styles.toggleIcon, { tintColor: viewMode === 'list' ? '#D85FAE' : '#888' }]} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setViewMode('grid')}
              style={[styles.toggleBtn, viewMode === 'grid' && styles.activeToggle]}
            >
              <Image 
                source={require('../assets/gridview.png')} 
                style={[styles.toggleIcon, { tintColor: viewMode === 'grid' ? '#D85FAE' : '#888' }]} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Grouped Achievements Rendering */}
        {Object.keys(groupedData).map((category) => (
          <View key={category} style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
              {groupedData[category].map((item) => {
                const isLocked = !unlockedAchievements.includes(item.id);
                return viewMode === 'grid' ? (
                  <TouchableOpacity key={item.id} onPress={() => handlePressGrid(item)}>
                    <AchievementGridCard 
                      name={item.name} 
                      xp={item.xp} 
                      imageSource={item.image} 
                      isLocked={isLocked}
                    />
                  </TouchableOpacity>
                ) : (
                  <AchievementListCard 
                    key={item.id}
                    name={item.name} 
                    subtext={item.subtext} 
                    xp={item.xp} 
                    imageSource={item.image} 
                    isLocked={isLocked}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 3. Modal needs to be inside the main View */}
      <AchievementModal 
        isVisible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        achievement={selectedAchievement}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  headerGradient: {
    width: '100%',
    paddingBottom: 20,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  headerTitle: { 
    color: '#d1d1d1', 
    fontSize: 32, 
    fontFamily: 'Montserrat-Black', 
    right: -45,
    bottom: -20,
  },
  backIcon: {
    width: 30, 
    height: 30, 
    position: 'absolute', 
    left: 12,
    marginTop: -40,
  },
  scrollContent: {
    paddingBottom: 70,
  },
  toggleSection: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#333',
  },
  toggleIcon: {
    width: 18,
    height: 18,
  },
  categoryBlock: {
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  categoryTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  listContainer: {
    flexDirection: 'column',
  },
});

export default AchievementsScreen;