import React from 'react';
import { View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    ViewStyle, 
    TextStyle, 
    ImageStyle 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// DATA 
const sessionCards = [
  { 
    label: "PUSH", 
    sub: "Chest, Shoulders, Triceps", 
    image: require("../assets/push.png") 
  },
  { 
    label: "PULL", 
    sub: "Back, Biceps", 
    image: require("../assets/pull.png") 
  },
  { 
    label: "LEG", 
    sub: "Lower Body", 
    image: require("../assets/leg.png") 
  },
];

const TargetedSessions: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Targeted Sessions</Text>
      <View style={styles.sessionRow}>
        {sessionCards.map((item) => (
          <TouchableOpacity key={item.label} activeOpacity={0.8} style={styles.cardWrapper}>
            <LinearGradient
              colors={["#1a0525", "#050505"]} // Deep Purple to Black
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.cardGradient}
            >
              <Image 
                source={item.image} 
                style={styles.sessionImg} 
                resizeMode="contain" 
              />
              <View style={styles.textContent}>
                <Text style={styles.mainLabel}>{item.label}</Text>
                <Text style={styles.subLabel}>{item.sub}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default TargetedSessions;

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 16,
    color: "#fff",
    textTransform: "uppercase",
    marginLeft: 16,
    marginBottom: 15,
    marginTop: -4
  },
  sessionRow: { 
    flexDirection: "row", 
    paddingHorizontal: 14, 
    gap: 8, 
  },
  cardWrapper: {
    flex: 1,
    height: 120, 
  },
  cardGradient: {
    flex: 1,
    borderRadius: 20, 
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 0,
  },
  sessionImg: {
    width: '90%',
    height: 65,
    marginTop: -5,
    marginLeft: 35,
  },
  textContent: {
    flex: 1,
    alignItems: 'flex-end', 
    width: '100%',
    paddingRight: -5,
  },
  mainLabel: {
    fontFamily: "Montserrat_900Black",
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 5,
  },
  subLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 6.5,
    color: "#777",
    textAlign: 'right',
    marginTop: -1,
  },
});