import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import { supabase } from '../supabase';
import { useFocusEffect } from '@react-navigation/native';
import { calculateBMI, convertWeight, convertHeight, BMIResult } from '../utils/healthCalculations';

const { width } = Dimensions.get('window');

const defaultAvatar = require('../assets/user.png');
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

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<string>('KG');
  const [heightUnit, setHeightUnit] = useState<string>('cm');
  const [bmiResult, setBmiResult] = useState<BMIResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  useEffect(() => {
    if (route.params?.scrollTo === 'calendar') {
      setScrollToCalendar(true);
    }
  }, [route.params]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, age, weight, height, weight_unit, height_unit')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUsername(data.username ?? '');
      setAvatarUrl(data.avatar_url ?? null);
      setAge(data.age ?? null);
      setWeightUnit(data.weight_unit ?? 'KG');
      setHeightUnit(data.height_unit ?? 'cm');

      // Normalize weight to kg and height to cm before calculating BMI
      const rawWeight: number | null = data.weight ?? null;
      const rawHeight: number | null = data.height ?? null;

      const weightInKg = rawWeight
        ? (data.weight_unit?.toUpperCase() === 'LB'
            ? convertWeight.lbToKg(rawWeight)
            : rawWeight)
        : null;

      const heightInCm = rawHeight
        ? (data.height_unit?.toLowerCase() === 'in'
            ? convertHeight.inToCm(rawHeight)
            : rawHeight)
        : null;

      setWeight(rawWeight);
      setHeight(rawHeight);

      if (weightInKg && heightInCm) {
        const result = calculateBMI(weightInKg, heightInCm);
        setBmiResult(result);
      }
    } catch (err) {
      console.error('fetchProfile error:', err);
    } finally {
      setLoading(false);
    }
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

        <View style={styles.avatarSection} pointerEvents="box-none">
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <Image source={defaultAvatar} style={styles.avatar} resizeMode="cover" />
            )}
          </View>
          <Text style={styles.username}>{loading ? '...' : username}</Text>
        </View>

        <View style={styles.cardsRow}>
          {/* AGE CARD */}
          <LinearGradient
            colors={['#261A00', '#000000']}
            style={styles.ageCard}
          >
            <View style={styles.iconAlignRight}>
              <Image source={calendarIcon} style={styles.cardIconLarge} resizeMode="contain" />
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.ageValueRow}>
                <Text style={styles.statValue}>{loading ? '--' : (age ?? '--')}</Text>
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
                <Text style={[
                  styles.statValueBMI,
                  bmiResult ? { color: bmiResult.categoryColor } : {}
                ]}>
                  {loading ? '--' : (bmiResult ? bmiResult.bmi.toFixed(1) : '--')}
                </Text>
                <Text style={styles.cardSubNote}>Body Mass Index</Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.bmiRightSection}>
                <View style={styles.miniStatBox}>
                  <Text style={styles.miniLabel}>Weight</Text>
                  <Text style={styles.miniValue}>
                    {loading ? '--' : (weight ?? '--')}
                    {' '}<Text style={styles.miniUnit}>{weightUnit}</Text>
                  </Text>
                </View>
                <View style={styles.miniStatBox}>
                  <Text style={styles.miniLabel}>Height</Text>
                  <Text style={styles.miniValue}>
                    {loading ? '--' : (height ?? '--')}
                    {' '}<Text style={styles.miniUnit}>{heightUnit}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Activity Calendar */}
        <View
          style={styles.calendarContainer}
          onLayout={(event) => {
            if (scrollToCalendar) {
              const { y } = event.nativeEvent.layout;
              scrollViewRef.current?.scrollTo({ y, animated: true });
              setScrollToCalendar(false);
            }
          }}
        >
          <CustomCalendar
            onDateSelect={handleDateSelect}
            streakDates={['2026-04-14', '2026-04-15', '2026-04-16', '2026-04-19', '2026-04-20']}
          />
        </View>

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
    fontFamily: 'Montserrat_800ExtraBold',
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
    marginLeft: -5,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: 'Montserrat_800ExtraBold',
    marginBottom: -5,
  },
  statValueBMI: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: 'Montserrat_800ExtraBold',
    marginTop: -25,
    marginLeft: -5,
    marginBottom: -5,
  },
  ageUnit: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
  },
  cardSubNote: {
    color: '#717171',
    fontSize: 10,
    fontFamily: 'Barlow_400Regular',
    marginLeft: -5,
  },
  miniStatBox: {
    justifyContent: 'center',
  },
  miniLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: -3,
  },
  miniValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  miniUnit: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
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