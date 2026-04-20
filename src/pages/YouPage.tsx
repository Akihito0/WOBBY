import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import CustomCalendar from '../components/CustomCalendar'; 
import ActivityFeed from '../components/ActivityFeed';

const { width } = Dimensions.get('window');

const avatarImage = require('../assets/5.png');
const calendarIcon = require('../assets/calendar.png'); 
const speedometerIcon = require('../assets/bmi.png');

type YouStackParamList = {
  YouMain: { scrollTo?: string };
  YouSettings: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'YouMain'>;

export default function YouPage({ navigation }: Props) {
  const route = useRoute<RouteProp<YouStackParamList, 'YouMain'>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollToCalendar, setScrollToCalendar] = useState(false);

  useEffect(() => {
    if (route.params?.scrollTo === 'calendar') {
      setScrollToCalendar(true);
    }
  }, [route.params]);
  const user = {
    username: 'cashew_123',
    age: 21,
    bmi: 25.0,
    weight: 75,
    height: 165,
  };

  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date.toISOString());
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        
        <LinearGradient
          colors={['#001E20', '#000000']}
          style={styles.backgroundGradientCard}   
        >
          
          {/* Settings button top-right */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('YouSettings')}
               activeOpacity={0.7}
            >
              <Ionicons name="settings" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

          {/* Avatar and Username are contained within the gradient card area */}
          <View 
          style={styles.avatarSection}
          pointerEvents="box-none"
          >
            <View style={styles.avatarWrapper}>
              <Image source={avatarImage} style={styles.avatar} resizeMode="cover" />
            </View>
            <Text style={styles.username}>{user.username}</Text>
          </View>

        <View style={styles.cardsRow}>
          {/* AGE CARD WITH SPECIFIC GRADIENT */}
          <LinearGradient 
            colors={['#261A00', '#000000']} 
            style={styles.ageCard}
          >
            <View style={styles.iconAlignRight}>
              <Image source={calendarIcon} style={styles.cardIconLarge} resizeMode="contain" />
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.ageValueRow}>
                <Text style={styles.statValue}>{user.age}</Text>
                <Text style={styles.ageUnit}> yrs</Text>
              </View>
              <Text style={styles.cardSubNote}>Current age</Text>
            </View>
          </LinearGradient>

          {/* BMI CARD */}
          <LinearGradient colors={['#000328', '#000000']} style={styles.bmiCard}>
            <View style={styles.bmiContent}>
              <View style={styles.bmiLeftSection}>
                <Image source={speedometerIcon} style={styles.speedometerIcon} resizeMode="contain" />
                <Text style={styles.statValueBMI}>{user.bmi.toFixed(2)}</Text>
                <Text style={styles.cardSubNote}>Body Mass Index</Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.bmiRightSection}>
                <View style={styles.miniStatBox}>
                   <Text style={styles.miniLabel}>Weight</Text>
                   <Text style={styles.miniValue}>{user.weight} <Text style={styles.miniUnit}>kg</Text></Text>
                </View>
                <View style={styles.miniStatBox}>
                   <Text style={styles.miniLabel}>Height</Text>
                   <Text style={styles.miniValue}>{user.height} <Text style={styles.miniUnit}>cm</Text></Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Activity Calendar section - Olive background from image */}
        <View style={styles.calendarContainer} onLayout={(event) => {
          if (scrollToCalendar) {
            const { y } = event.nativeEvent.layout;
            scrollViewRef.current?.scrollTo({ y, animated: true });
            setScrollToCalendar(false); // Reset after scrolling
          }
        }}>
          <CustomCalendar
            onDateSelect={handleDateSelect}
            streakDates={['2026-04-14', '2026-04-15', '2026-04-16', '2026-04-19', '2026-04-20']}
          />
        </View>
          {/* ════════ ACTIVITY FEED ════════ */}
        <ActivityFeed />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121310', 
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  backgroundGradientCard: {
    paddingTop: 50,
    paddingBottom: 50,        
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 25,
  },
  settingsButton: {
    backgroundColor: '#334155', 
    padding: 10,
    borderRadius: 11,
    marginTop: 5,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -110,          
    marginBottom: 20,        
    zIndex: 10, 
    elevation: 10, 
  },
  avatarWrapper: {
    width: 130,
    height: 130,
    borderRadius: 10, 
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: '#1E293B', 
    marginBottom: 15, 
    marginTop: 35,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: "Montserrat_800ExtraBold",
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ageCard: {
    width: '30%', 
    height: 110,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'space-between',
  },
  bmiCard: {
   width: '65%', 
    height: 110,
    borderRadius: 20,
    padding: 15,
  },
  iconAlignRight: {
    alignItems: 'flex-end',
  },
  cardIconLarge: {
    width: 55,
    height: 55,
    marginBottom: -10,
    marginTop: -10,
    marginRight: -10,
  },
  speedometerIcon: {
    width: 90,
    height: 70,
    marginBottom: 10,
    marginLeft: 15,
    marginTop: -15,
  },
  bmiContent: {
    flexDirection: 'row',
    height: '100%',
    //alignItems: 'center',
  },
  bmiLeftSection: {
    flex: 1.2,
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '105%',
    backgroundColor: 'rgb(255, 255, 255)',
    marginHorizontal: 10,
  },
  bmiRightSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  cardBottom: {
    marginTop: 'auto',
  },
  ageValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: -5
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: "Montserrat_800ExtraBold",
    marginBottom: -5,
  },
  statValueBMI: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: "Montserrat_800ExtraBold",
    marginTop: -25,
    marginLeft: -5,
    marginBottom: -5,
  },
  ageUnit: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  cardSubNote: {
    color: '#717171',
    fontSize: 10,
    fontFamily: "Barlow_400Regular",
    marginLeft: -5,
  },
  miniStatBox: {
    justifyContent: 'center',
  },
  miniLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: "Montserrat_400Regular",
    marginBottom: -3,
  },
  miniValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: "Montserrat_800ExtraBold",
  },
  miniUnit: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: "Montserrat_400Regular",
  },
  calendarContainer: {
    marginHorizontal: 15,
    backgroundColor: '#13150F', 
    borderRadius: 32,
    padding: 10,
    paddingVertical: 20,
    marginBottom: 20,
  },
});