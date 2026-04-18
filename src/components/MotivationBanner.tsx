import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native'; 

const MotivationBanner: React.FC = () => {
  const navigation = useNavigation<any>(); 
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    navigation.navigate('Workout'); 
  };

  return (
    <View style={styles.hPad}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>

          {/* ── Shadow wrapper ── */}
          <View style={styles.shadowWrapper}>
            <LinearGradient
              colors={["#3B4027", "#141414"]}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.motiveBanner}
            >
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

              <Text style={styles.playArrow}>▶</Text>
            </LinearGradient>
          </View>

        </Animated.View>
      </Pressable>
    </View>
  );
};

export default MotivationBanner;

const styles = StyleSheet.create({
  hPad: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  shadowWrapper: {
    backgroundColor: '#141414',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  motiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 140,
    position: 'relative',
    // overflow: 'hidden' removed — it clips the shadow on iOS
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
  playArrow: {
    position: 'absolute',
    right: 15,
    bottom: 10,
    color: '#fff',
    fontSize: 25,
  },
});