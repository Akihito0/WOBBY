import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MotivationBanner: React.FC = () => {
  return (
    <View style={styles.hPad}>
      <LinearGradient
        colors={["#3B4027", "#141414"]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.motiveBanner}
      >
        {/* The Arm Illustration */}
        <Image
          source={require("../assets/dumbell_build.png")}
          style={styles.armIllustration}
          resizeMode="contain"
        />

        <View style={styles.motiveContent}>
          <Text style={styles.motiveDay}>Today is Day One</Text>
          <Text style={styles.motiveTitle}>TIME TO BUILD YOURSELF</Text>
          <Text style={styles.motiveBody}>
            No pressure, just progress. Ready to see what you can do?
          </Text>
        </View>

        {/* Play Icon Overlay */}
        <TouchableOpacity style={styles.playButtonOverlay}>
          <Text style={styles.playArrow}>▶</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

export default MotivationBanner;

const styles = StyleSheet.create({
  hPad: {
    paddingHorizontal: 0, 
    paddingBottom: 24,
  },
  motiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 140,
    overflow: "hidden",
    position: 'relative',
  },
  armIllustration: {
    width: 150,
    height: 170,
    position: 'absolute',
    left: -5,
    bottom: -15,
  },
  motiveContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 60,
  },
  motiveDay: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: "#7F8C49",
    marginBottom: 4,
  },
  motiveTitle: {
    fontFamily: "Montserrat_900Black",
    fontSize: 20,
    color: "#F3FFC2",
    textAlign: 'center',
    lineHeight: 26,
  },
  motiveBody: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    color: "#BED564",
    textAlign: 'center',
    marginTop: 3,
  },
  playButtonOverlay: {
    position: 'absolute',
    right: 15,
    bottom: 10,
  },
  playArrow: {
    color: '#fff',
    fontSize: 25,
  },
});