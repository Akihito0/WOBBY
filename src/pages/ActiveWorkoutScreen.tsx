import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveWorkoutScreen({ navigation, route }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const exerciseName = route.params?.exerciseName || 'PUSH-UP';

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      {/* Background Camera Layer */}
      {hasPermission ? (
        <CameraView style={StyleSheet.absoluteFillObject} facing={cameraFacing} />
      ) : (
        <LinearGradient
          colors={['#1a1d1b', '#000000']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <View style={styles.bottomOverlay}>
        {/* Grabber indicator acting as a back button */}
        <TouchableOpacity 
          style={styles.grabberTarget} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View style={styles.grabber} />
        </TouchableOpacity>

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

        {/* Bottom Counters */}
        <View style={styles.weightContainer}>
          <View style={styles.zeroBackdrop}>
             <Text style={styles.zeroText}>0</Text>
          </View>
          <Text style={styles.weightText}>Weight (kg)</Text>
        </View>
      </View>
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
    backgroundColor: 'rgba(34,34,29,0.7)',
    height: 285,
    width: '100%',
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
  },
  grabberTarget: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 25, // Increased slightly to pull buttons down
    paddingHorizontal: 20,
  },
  sideColumn: {
    alignItems: 'center',
    width: 100,
    marginTop: 15, // Pushes the side elements down slightly compared to the center
  },
  centerColumn: {
    alignItems: 'center',
    width: 100,
    marginTop: 5,
  },
  topLabel: {
    fontSize: 10,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 4,
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
    marginLeft: 6, // centers the triangle visually inside the circle
  },
  bottomLabelGreen: {
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
    color: '#CCFF00',
    textTransform: 'uppercase',
    marginTop: 5,
  },
  bottomLabelWhite: {
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginTop: 5,
  },
  weightContainer: {
    alignItems: 'center',
    marginTop: 15,
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
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    lineHeight: 36,
  },
  weightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
    marginTop: 6,
  },
});