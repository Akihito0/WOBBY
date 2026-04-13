import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { height: screenHeight } = Dimensions.get('window');

const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 190;

export default function ActiveWorkoutScreen({ navigation, route }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [isExpanded, setIsExpanded] = useState(false);

  // Animated values
  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const weightOpacity = useRef(new Animated.Value(0)).current;
  const weightTranslateY = useRef(new Animated.Value(12)).current;

  const isExpandedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Lower tab bar opacity when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: {
          opacity: 0,
          pointerEvents: 'none',
        },
      });
      return () => {
        parent?.setOptions({
          tabBarStyle: {
            opacity: 1,
            pointerEvents: 'auto',
          },
        });
      };
    }, [navigation])
  );

  const expandContainer = () => {
    if (isExpandedRef.current) return;
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.parallel([
      Animated.spring(animatedHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(weightOpacity, {
        toValue: 1,
        duration: 200,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.spring(weightTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
      }),
    ]).start();
  };

  const collapseContainer = () => {
    if (!isExpandedRef.current) return;
    isExpandedRef.current = false;
    Animated.parallel([
      Animated.spring(animatedHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(weightOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(weightTranslateY, {
        toValue: 12,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setIsExpanded(false));
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < -30) {
          expandContainer();
        } else if (gestureState.dy > 30) {
          collapseContainer();
        }
      },
    })
  );

  const exerciseName = route.params?.exerciseName || 'PUSH-UP';

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <CameraView style={StyleSheet.absoluteFillObject} facing={cameraFacing} />
      ) : (
        <LinearGradient
          colors={['#1a1d1b', '#000000']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <Animated.View
        style={[styles.bottomOverlay, { height: animatedHeight }]}
        {...panResponderRef.current.panHandlers}
      >
        {/* Grabber */}
        <View style={styles.grabberTarget}>
          <View style={styles.grabber} />
        </View>

        <View style={styles.controlsRow}>
          {/* Left: Workout */}
          <View style={styles.sideColumn}>
            <Text style={styles.topLabel}>WORKOUT</Text>
            <View style={styles.circleWhite}>
              <Image source={require('../assets/workout.png')} style={styles.whiteBtnIcon} />
            </View>
            <Text style={styles.bottomLabelGreen}>{exerciseName}</Text>
          </View>

          {/* Middle: Start */}
          <View style={styles.centerColumn}>
            <TouchableOpacity style={styles.circleBlack} activeOpacity={0.8}>
              <View style={styles.playTriangle} />
            </TouchableOpacity>
            <Text style={styles.bottomLabelWhite}>START</Text>
          </View>

          {/* Right: Camera Flip */}
          <View style={styles.sideColumn}>
            <Text style={styles.topLabel}>Camera</Text>
            <TouchableOpacity style={styles.circleWhite} onPress={toggleCameraFacing} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={30} color="#000" />
            </TouchableOpacity>
            <Text style={styles.bottomLabelGreen}>{cameraFacing === 'back' ? 'Front' : 'Back'}</Text>
          </View>
        </View>

        {/* Weight — always mounted, animated in/out */}
        <Animated.View
          style={[
            styles.weightContainer,
            {
              opacity: weightOpacity,
              transform: [{ translateY: weightTranslateY }],
            },
          ]}
        >
          <View style={styles.zeroBackdrop}>
            <Text style={styles.zeroText}>0</Text>
          </View>
          <Text style={styles.weightText}>Weight (kg)</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'flex-end',
  },
  bottomOverlay: {
    backgroundColor: 'rgba(34,34,29,0.85)',
    width: '100%',
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,

    position: 'absolute',
    bottom: 0,
    paddingBottom: 52,
  },
  grabberTarget: {
    width: '100%',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  grabber: {
    width: 55,
    height: 5,
    backgroundColor: '#9d9d9d',
    borderRadius: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  sideColumn: {
    alignItems: 'center',
    width: 100,
    marginTop: 8,
  },
  centerColumn: {
    alignItems: 'center',
    width: 100,
    marginTop: 5,
  },
  topLabel: {
    fontSize: 9,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  circleWhite: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteBtnIcon: {
    width: 30,
    height: 30,
    tintColor: '#000000',
    resizeMode: 'contain',
  },
  circleBlack: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 18,
    borderRightWidth: 0,
    borderBottomWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: '#CCFF00',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 6,
  },
  bottomLabelGreen: {
    fontSize: 10,
    fontFamily: 'Barlow-SemiBold',
    color: '#CCFF00',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  bottomLabelWhite: {
    fontSize: 10,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  weightContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 3,
  },
  zeroBackdrop: {
    backgroundColor: 'rgba(217,217,217,0.12)',
    width: 113,
    height: 33,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    lineHeight: 32,
  },
  weightText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Barlow-SemiBold',
    marginTop: 3,
  },
});