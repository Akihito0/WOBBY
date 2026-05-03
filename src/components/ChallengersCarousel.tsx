import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native'; 


const ChallengersCarousel: React.FC = () => {
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
  navigation.navigate('Workout', {
    screen: 'VersusWorkoutScreen',
  });
};

  return (
    <View style={styles.section}>
       <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handlePress}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.shadowWrapper}>
      
      <LinearGradient
        colors={['#000000', '#432B16']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bannerContainer}
      >
        <View style={styles.textContainer}>
          <Text style={styles.subTitle}>Competition or Cooperation</Text>
          <Text style={styles.mainTitle}>FIND AN OPPONENT</Text>
          <Text style={styles.description}>
            Push past your limits together. Who will you face?
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/challenge.png')}
            style={styles.challengeIcon}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.playButton}>▶</Text>
      </LinearGradient>
                </View>
      </Animated.View>
      </Pressable>
    </View>
  );
};

export default ChallengersCarousel;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 0,
    paddingBottom: 24,
    alignItems: 'center',
    paddingTop: 16,
  },
  bannerContainer: {
    width: '100%', // Slightly wider to match typical mobile padding
    height: 140, 
    borderRadius: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1.5, // Give more room to text
    justifyContent: 'center',
  },
  shadowWrapper: {
    backgroundColor: '#141414',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  subTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#7F8C49',
    marginBottom: 3,
    marginLeft: 15,
  },
  mainTitle: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 20,
    color: '#F3FFC2',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  description: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 9,
    color: '#BED564',
    lineHeight: 14,
    marginLeft: 7,
  },
  iconContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeIcon: {
    width: '90%', // Make it overlap slightly like the image
    height: '90%',
    tintColor: '#CCFF00',
  },
  playButton: {
    position: 'absolute',
    right: 15,
    bottom: 10,
    color: '#fff',
    fontSize: 25,
  },
});