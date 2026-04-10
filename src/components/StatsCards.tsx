import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const StatsCards: React.FC = () => {
  return (
    <View style={styles.statsRow}>
      
      {/* XP CARD */}
      <LinearGradient
        colors={["#1a0525", "#0a0310"]}
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

      {/* Heart Rate CARD */}
      <LinearGradient
        colors={["#2a0808", "#100303"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, styles.hrCard]}
      >
        <Image
          source={require("../assets/heart_rate.png")}
          style={styles.hrImageCenter}
          resizeMode="contain"
        />
        <Text style={styles.hrNoWatch}>No watch detected</Text>
      </LinearGradient>

      {/* BMI CARD */}
      <LinearGradient
        colors={["#080a1a", "#030410"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, styles.bmiCard]}
      >
        <Image
          source={require("../assets/bmi.png")}
          style={styles.bmiImageGauge}
          resizeMode="contain"
        />
        <View style={styles.bmiTextRow}>
          <Text style={styles.bmiNumSmall}>25</Text>
          <Text style={styles.bmiLabelSmall}>BMI</Text>
        </View>
      </LinearGradient>
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
    marginTop: 10
  },
  statCard: { 
    flex: 1, 
    borderRadius: 20,
    paddingVertical: 20, 
    paddingHorizontal: 8, 
    alignItems: "center", 
    justifyContent: "center", 
    maxHeight: 110,
    overflow: "hidden", 
    borderWidth: 0,
  },
  xpCard: { 
    paddingTop: 12,
    flex: 1.5
  },
  youHave: { 
    fontFamily: "Barlow_700Bold", // Corrected to use Bold weight
    fontSize: 7, 
    color: "#fff", 
    letterSpacing: 1.5,  
    marginBottom: 6,
    marginTop: 5
  },
  gemImage: { width: 25, height: 25, marginBottom: 2 },
  xpNum: { 
    fontFamily: "Montserrat_900Black", 
    fontSize: 20, 
    color: "#CCFF00", 
    letterSpacing: 0.5 
  },
  xpSub: { 
    fontFamily: "Barlow_400Regular", 
    fontSize: 7.5, 
    color: "#888", 
    textAlign: "center", 
    lineHeight: 10, 
    marginTop: -3
  },
  hrCard: { justifyContent: "center" },
  hrImageCenter: { width: 80, height: 80, marginTop: -18, marginLeft: 25, marginBottom: 3 },
  hrNoWatch: { 
    fontFamily: "Barlow_400Regular", 
    fontSize: 9, 
    color: "#888", 
    fontStyle: 'italic', 
    marginTop: 5
  },
  bmiCard: { justifyContent: "center" },
  bmiImageGauge: { width: 80, height: 80, marginTop: -5, marginLeft: 25, marginBottom: 1 },
  bmiTextRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    gap: 7,
    marginTop: -7
  },
  bmiNumSmall: { 
    fontFamily: "Montserrat_900Black", 
    fontSize: 28, 
    color: "#fff" 
  },
  bmiLabelSmall: { 
    fontFamily: "Montserrat_600SemiBold", 
    fontSize: 10, 
    color: "#666", 
    letterSpacing: 1 
  },
});