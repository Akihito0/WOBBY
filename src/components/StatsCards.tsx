import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHealth } from '../context/HealthContext';
import { supabase } from '../supabase';
import { calculateBMI } from '../utils/healthCalculations';

interface StatsCardsProps {
  onBMIPress?: () => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({ onBMIPress }) => {
  const { heartRate } = useHealth();
  const [bmi, setBmi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBMI();
  }, []);

  const fetchBMI = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('weight, height')
        .eq('id', user.id)
        .single();

      if (error || !profile?.weight || !profile?.height) {
        setBmi(null);
        return;
      }

      // Calculate BMI using utility function
      const bmiResult = calculateBMI(profile.weight, profile.height);
      setBmi(bmiResult.bmi);
    } catch (error) {
      console.log('Error fetching BMI:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.statsRow}>

      {/* ── XP CARD ── */}
      <View style={[styles.shadowWrapper, { flex: 1.5, backgroundColor: '#000000' }]}>
        <LinearGradient
          colors={["#460025", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statCard, styles.xpCard]}
        >
          <Text style={styles.youHave}>YOU HAVE</Text>
          <Image 
            source={require("../assets/xp_gem.png")} 
            style={styles.gemImage} 
            resizeMode="contain"
          />
          <Text style={styles.xpNum}>0 XP</Text>
          <Text style={styles.xpSub}>Every move counts.{"\n"}Complete sessions to earn more!</Text>
        </LinearGradient>
      </View>

      {/* ── HEART RATE CARD ── */}
      <View style={[styles.shadowWrapper, { flex: 1, backgroundColor: '#000000' }]}>
        <LinearGradient
          colors={["#290000", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.statCard, styles.hrCard]}
        >
          <Image
            source={require("../assets/heart_rate.png")}
            style={styles.hrImageCenter}
            resizeMode="contain"
          />
          {heartRate !== null ? (
            <>
              <Text style={styles.hrNum}>{heartRate}</Text>
              <Text style={styles.hrUnit}>BPM</Text>
            </>
          ) : (
            <Text style={styles.hrNoWatch}>No watch detected</Text>
          )}
        </LinearGradient>
      </View>

      {/* ── BMI CARD ── */}
      <TouchableOpacity 
        style={[styles.shadowWrapper, { flex: 1, backgroundColor: '#000000' }]}
        onPress={onBMIPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={["#000328", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.statCard, styles.bmiCard]}
        >
          <Image
            source={require("../assets/bmi.png")}
            style={styles.bmiImageGauge}
            resizeMode="contain"
          />
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.bmiTextRow}>
              <Text style={styles.bmiNumSmall}>{bmi !== null ? bmi : '—'}</Text>
              <Text style={styles.bmiLabelSmall}>BMI</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );
};

export default StatsCards;

const styles = StyleSheet.create({
  statsRow: { 
    flexDirection: "row", 
    paddingHorizontal: 14, 
    gap: 8, 
    marginBottom: 20,
    marginTop: 10,
  },
  shadowWrapper: {
    borderRadius: 20,
    // iOS
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    // Android
    elevation: 8,
  },
  statCard: { 
    borderRadius: 20,
    paddingVertical: 20, 
    paddingHorizontal: 7, 
    alignItems: "center", 
    justifyContent: "center", 
    maxHeight: 110,
    // overflow: 'hidden' removed — clips shadow on iOS
    borderWidth: 0,
  },
  xpCard: { 
    paddingTop: 12,
  },
  youHave: { 
    fontFamily: "Barlow_700Bold",
    fontSize: 7, 
    color: "#fff", 
    marginBottom: 6,
    marginTop: 5,
  },
  gemImage: { width: 25, height: 25, marginBottom: 2 },
  xpNum: { 
    fontFamily: "Montserrat_900Black", 
    fontSize: 20, 
    color: "#CCFF00", 
  },
  xpSub: { 
    fontFamily: "Barlow_400Regular", 
    fontSize: 7.5, 
    color: "#888", 
    textAlign: "center", 
    lineHeight: 10, 
    marginTop: -3,
  },
  hrCard: { justifyContent: "center" },
  hrImageCenter: { width: 70, height: 70, marginTop: -15, marginLeft: 25, marginBottom: 2 },
  hrNum: {
    fontFamily: "Montserrat_900Black",
    fontSize: 24,
    color: "#FF4444",
    marginTop: -5,
  },
  hrUnit: {
    fontFamily: "Barlow_400Regular",
    fontSize: 9,
    color: "#888",
    marginTop: -2,
  },
  hrNoWatch: { 
    fontFamily: "Barlow_400Regular", 
    fontSize: 9, 
    color: "#888", 
    fontStyle: 'italic', 
    marginTop: 10,
  },
  bmiCard: { justifyContent: "center" },
  bmiImageGauge: { width: 80, height: 80, marginTop: -5, marginLeft: 20, marginBottom: 1 },
  bmiTextRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    gap: 7,
    marginTop: -7,
  },
  bmiNumSmall: { 
    fontFamily: "Montserrat_900Black", 
    fontSize: 28, 
    color: "#fff",
  },
  bmiLabelSmall: { 
    fontFamily: "Montserrat_600SemiBold", 
    fontSize: 10, 
    color: "#666", 
  },
});