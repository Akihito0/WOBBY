import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Image, 
  PanResponder,
  Animated,
  Alert,
  ActivityIndicator
} from 'react-native';
import AssessBg from '../components/layout/AssessBg';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

const LEVELS = [
  { id: '01', title: 'Beginner', subtitle: 'Lightly Active', angle: 0 },
  { id: '02', title: 'Intermediate', subtitle: 'Moderately Active', angle: 45 },
  { id: '03', title: 'Advanced', subtitle: 'Highly Active', angle: 90 },
];

export default function PhysLvl({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const animatedAngle = useRef(new Animated.Value(0)).current;

  const updateLevelFromAngle = (angle: number) => {
    let closestIndex = 0;
    let minDiff = Math.abs(angle - LEVELS[0].angle);
    LEVELS.forEach((level, index) => {
      const diff = Math.abs(angle - level.angle);
      if (diff < minDiff) { minDiff = diff; closestIndex = index; }
    });
    setActiveIndex(closestIndex);
    Animated.spring(animatedAngle, {
      toValue: LEVELS[closestIndex].angle,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({ physical_level: LEVELS[activeIndex].title })
        .eq('id', user.id);

      if (error) throw error;
      onNext();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save physical level.');
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {

        const originX = width * 0.5;   
        const originY = height * 0.8;  

        const touchX = gestureState.moveX - originX;
        const touchY = originY - gestureState.moveY;

        let angle = Math.atan2(touchY, touchX) * (180 / Math.PI);
        if (angle < 0) angle = 0;
        if (angle > 90) angle = 90;

        animatedAngle.setValue(angle);
      },
      onPanResponderRelease: () => {
        const currentAngle = (animatedAngle as any)._value;
        updateLevelFromAngle(currentAngle);
      },
    })
  ).current;

  const current = LEVELS[activeIndex];

  return (
    <AssessBg onBack={onBack}>
      <View style={styles.container}>
        <Text style={styles.title}>Physical Activity{"\n"}Level</Text>

        <View style={styles.sliderContainer}>
          <View style={styles.arcWrapper} {...panResponder.panHandlers}>

            <View style={styles.arcBase} />

            {[0, 45, 90].map((angle) => (
              <View
                key={angle}
                style={[styles.tick, {
                  transform: [
                    { rotate: `${angle - 45}deg` },
                    { translateY: -200 }
                  ]
                }]}
              />
            ))}

            <Animated.View style={[styles.neonProgress, {
              transform: [{
                rotate: animatedAngle.interpolate({
                  inputRange: [0, 90],
                  outputRange: ['-45deg', '-135deg']
                })
              }]
            }]} />

            <Animated.View style={[styles.thumb, {
              transform: [
                {
                  rotate: animatedAngle.interpolate({
                    inputRange: [0, 90],
                    outputRange: ['45deg', '-45deg']
                  })
                },
                { translateY: -200 }
              ]
            }]}>
              <View style={styles.thumbInner} />
            </Animated.View>

          </View>

          <View style={styles.labelContainer}>
            <Text style={styles.bigNumber}>{current.id}</Text>
            <Text style={styles.levelTitle}>{current.title}</Text>
            <Text style={styles.levelSubtitle}>{current.subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButtonActive}
          onPress={handleContinue}
          disabled={loading}
        >
          <View style={styles.neonBorder} />
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#CCFF00" />
            ) : (
              <>
                <Text style={styles.buttonTextActive}>Continue</Text>
                <Image source={require('../assets/arrow0.png')} style={styles.arrow} />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </AssessBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: { fontFamily: 'Montserrat-Black', fontSize: 32, color: '#000', textAlign: 'center', marginTop: 10, marginBottom: -150, },

  sliderContainer: {
  flex: 1,
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center', 
},
 arcWrapper: {
  width: 400,
  height: 400,
  alignItems: 'center',
  justifyContent: 'center',
},

  arcBase: {
    width: 400, height: 400, borderRadius: 200,
    borderWidth: 10, borderColor: '#111',
    borderBottomColor: 'transparent', borderLeftColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },

  neonProgress: {
    position: 'absolute',
    width: 400, height: 400, borderRadius: 200,
    borderWidth: 12,
    borderTopColor: '#CCFF00',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    zIndex: 2,
  },

  tick: {
    position: 'absolute',
    width: 2, height: 20,
    backgroundColor: '#555',
    zIndex: 3,
  },

  thumb: {
    position: 'absolute',
    width: 80, height: 80,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  thumbInner: {
    width: 45, height: 45,
    backgroundColor: '#CCFF00',
    borderRadius: 15,
    borderWidth: 2.5, borderColor: '#000',
  },
labelContainer: {
  position: 'absolute', 
  alignItems: 'center',
},
  bigNumber: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 130, 
    color: '#000', 
    lineHeight: 130 
  },
  levelTitle: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 32, 
    color: '#000', 
    marginTop: -10 
  },
  levelSubtitle: { 
    fontFamily: 'Montserrat-Bold', 
    fontSize: 18, 
    color: '#818181' 
  },
  continueButtonActive: {
    position: 'absolute', 
    bottom: 80, 
    width: width * 0.85, 
    height: 60,
    backgroundColor: '#000', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderColor: '#CCFF00', 
    borderWidth: 2.5, 
    alignSelf: 'center'
  },
  neonBorder: {
    position: 'absolute', 
    top: -3, 
    bottom: -3,
    left: -3, 
    right: -3,
    borderRadius: 23, 
    borderWidth: 2, 
    borderColor: 'rgba(204, 255, 0, 0.3)'
  },
  buttonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  buttonTextActive: { 
    color: '#CCFF00', 
    fontFamily: 'Montserrat-ExtraBold', 
    fontSize: 18 
  },
  arrow: { 
    width: 20, 
    height: 20 
  }
});