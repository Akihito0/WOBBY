import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useRunOnJS } from 'react-native-worklets-core';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Line, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number; conf: number };
export type Pose = {
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftWrist: Point;
  rightWrist: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftAnkle: Point;
  rightAnkle: Point;
};

const calculateAngle = (A: Point | undefined, B: Point | undefined, C: Point | undefined) => {
  if (!A || !B || !C || A.conf < 0.3 || B.conf < 0.3 || C.conf < 0.3) return null;
  const angle = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let degree = Math.abs((angle * 180.0) / Math.PI);
  if (degree > 180) degree = 360 - degree;
  return Math.round(degree);
};

const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 190;

export default function ActiveWorkoutScreen({ navigation, route }: any) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(cameraFacing);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [time, setTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(1);
  const [pose, setPose] = useState<Pose | null>(null);
  const [formFeedback, setFormFeedback] = useState<string>('');

  const exercisePhaseRef = useRef<'up' | 'down'>('up');
  const lastRepTimeRef = useRef<number>(0);
  const consecutiveGoodFormFrames = useRef<number>(0);

  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const weightOpacity = useRef(new Animated.Value(0)).current;
  const weightTranslateY = useRef(new Animated.Value(12)).current;
  const isExpandedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraFacingRef = useRef<'front' | 'back'>('front');

  const plugin = useTensorflowModel(require('../assets/movenet.tflite'), []);
  
  useEffect(() => {
    if (plugin.state === 'error') {
      console.log('TFLite Model Load Error:', plugin.error);
    }
  }, [plugin.state, plugin.error]);

  const model = plugin.state === 'loaded' ? plugin.model : undefined;
  const boxedModel = useMemo(() => (model != null ? NitroModules.box(model) : undefined), [model]);
  const { resize } = useResizePlugin();

  const handlePoseUpdate = useRunOnJS((parsedPose: Pose) => {
    setPose((prevPose) => {
      if (!prevPose) return parsedPose;
      
      // Removed ALPHA dampening. 1.0 means INSTANT snap to body to fix the "slow" tracking.
      const smooth = (curr: Point, prev: Point | undefined): Point => {
        if (!prev) return curr; // <-- guard: first frame has no previous
        if (curr.conf < 0.15) {
          return { ...prev, conf: prev.conf * 0.95 };
        }

         // Blend slightly with previous to reduce jitter on low-conf points
         //const alpha = curr.conf > 0.5 ? 1.0 : 0.75;
          const ALPHA = 0.9;

        return {
          x: prev.x + ALPHA * (curr.x - prev.x),
          y: prev.y + ALPHA * (curr.y - prev.y),
          conf: curr.conf,
        };
      };

      return {
        leftShoulder: smooth(parsedPose.leftShoulder, prevPose.leftShoulder),
        rightShoulder: smooth(parsedPose.rightShoulder, prevPose.rightShoulder),
        leftElbow: smooth(parsedPose.leftElbow, prevPose.leftElbow),
        rightElbow: smooth(parsedPose.rightElbow, prevPose.rightElbow),
        leftWrist: smooth(parsedPose.leftWrist, prevPose.leftWrist),
        rightWrist: smooth(parsedPose.rightWrist, prevPose.rightWrist),
        leftHip: smooth(parsedPose.leftHip, prevPose.leftHip),
        rightHip: smooth(parsedPose.rightHip, prevPose.rightHip),
        leftKnee: smooth(parsedPose.leftKnee, prevPose.leftKnee),
        rightKnee: smooth(parsedPose.rightKnee, prevPose.rightKnee),
        leftAnkle: smooth(parsedPose.leftAnkle, prevPose.leftAnkle),
        rightAnkle: smooth(parsedPose.rightAnkle, prevPose.rightAnkle),
      };
    });
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (boxedModel == null) return;

    try {
      const tflite = boxedModel.unbox();
      const inputType = tflite.inputs[0].dataType;
      const outputType = tflite.outputs[0].dataType;

      let rotationChoice: '0deg' | '90deg' | '180deg' | '270deg' = '0deg';
      if (frame.orientation === 'landscape-left') {
        rotationChoice = frame.isMirrored ? '90deg' : '270deg';
      } else if (frame.orientation === 'landscape-right') {
        rotationChoice = frame.isMirrored ? '270deg' : '90deg';
      } else if (frame.orientation === 'portrait-upside-down') {
        rotationChoice = '180deg';
      }
      
      const isPortrait = frame.orientation === 'portrait' || frame.orientation === 'portrait-upside-down';
      let uprightW = frame.width;
      let uprightH = frame.height;
      if (isPortrait && frame.width > frame.height) {
        uprightW = frame.height;
        uprightH = frame.width;
      } else if (!isPortrait && frame.width < frame.height) {
        uprightW = frame.height;
        uprightH = frame.width;
      }

      // Crop a perfect square so the AI sees proportional humans (no squashing!)
      // Neural networks fail completely and output random dots if given distorted proportions.
      const cropSize = Math.min(frame.width, frame.height);
      const cropX = (frame.width - cropSize) / 2;
      const cropY = (frame.height - cropSize) / 2;

      const resized = resize(frame, {
        crop: { x: cropX, y: cropY, width: cropSize, height: cropSize },
        scale: { width: 192, height: 192 },
        pixelFormat: 'rgb',
        dataType: inputType === 'float32' ? 'float32' : 'uint8',
        rotation: rotationChoice,
      });

      const inputBuffer = resized.buffer.slice(
        resized.byteOffset,
        resized.byteOffset + resized.byteLength
      );

      const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
      if (!outputs || outputs.length === 0) return;

      const outputBuffer = outputs[0] as ArrayBuffer;
      const outputArray = outputType === 'uint8' 
        ? new Uint8Array(outputBuffer) 
        : new Float32Array(outputBuffer);

      const points: Point[] = [];
      const numPoints = 17;

      // Determine resizeMode="cover" actual rendering size on screen
      const scaleX = SCREEN_WIDTH / uprightW;
      const scaleY = SCREEN_HEIGHT / uprightH;
      const scale = Math.max(scaleX, scaleY);
      
      const renderedW = uprightW * scale;
      const renderedH = uprightH * scale;

      const renderOffsetX = (SCREEN_WIDTH - renderedW) / 2;
      const renderOffsetY = (SCREEN_HEIGHT - renderedH) / 2;

      // Determine where the center square sits in the upright frame
      //not the raw frame dimensions, so the square maps correctly to the screen
      const uprightCropSize = Math.min(uprightW, uprightH);
      const cropOffsetXInUpright = (uprightW - uprightCropSize) / 2;
      const cropOffsetYInUpright = (uprightH - uprightCropSize) / 2;

      // Project that square mathematically onto the device screen
      const screenSquareX = renderOffsetX + (cropOffsetXInUpright * scale);
      const screenSquareY = renderOffsetY + (cropOffsetYInUpright * scale);
      const screenSquareSize = uprightCropSize * scale;

      for (let i = 0; i < numPoints; i++) {
        const base = i * 3;
        const yRaw = outputType === 'uint8' ? outputArray[base] / 255.0 : outputArray[base];
        const xRaw = outputType === 'uint8' ? outputArray[base + 1] / 255.0 : outputArray[base + 1];
        const conf = outputType === 'uint8' ? outputArray[base + 2] / 255.0 : outputArray[base + 2];

        // xRaw and yRaw are [0..1] inside the cropped square. Scale them exactly.
        let x = screenSquareX + (xRaw * screenSquareSize);
        let y = screenSquareY + (yRaw * screenSquareSize);

        // Mirror the x-coordinate for front camera so left/right matches user
        if (cameraFacingRef.current === 'front') {
          x = SCREEN_WIDTH - x;
        }

        points.push({ x, y, conf });
      }

      const parsedPose = {
        leftShoulder: points[5],
        rightShoulder: points[6],
        leftElbow: points[7],
        rightElbow: points[8],
        leftWrist: points[9],
        rightWrist: points[10],
        leftHip: points[11],
        rightHip: points[12],
        leftKnee: points[13],
        rightKnee: points[14],
        leftAnkle: points[15],
        rightAnkle: points[16],
      };

      handlePoseUpdate(parsedPose);
      
    } catch (e: any) {
      console.log("FRAME PROCESSOR ERROR:", e);
    }
  }, [boxedModel, resize, handlePoseUpdate]);

  const exerciseId = route.params?.exerciseId;
  const setId = route.params?.setId;
  const exerciseName = route.params?.exerciseName || 'PUSH-UP';

  useEffect(() => {
  cameraFacingRef.current = cameraFacing;
}, [cameraFacing]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (isWorkoutStarted && !isResting) {
      intervalRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isWorkoutStarted, isResting]);

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { opacity: 0, pointerEvents: 'none' } });
      return () => {
        parent?.setOptions({ tabBarStyle: { opacity: 1, pointerEvents: 'auto' } });
      };
    }, [navigation])
  );

  useEffect(() => {
    if (!isWorkoutStarted || isResting || !pose) return;

    const leftElbowAngle = calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
    const rightElbowAngle = calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist);

    if (leftElbowAngle === null || rightElbowAngle === null) {
      setFormFeedback('Move into camera view');
      return;
    }

    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
    const currentPhase = exercisePhaseRef.current;
    const now = Date.now();

    const elbowSymmetry = Math.abs(leftElbowAngle - rightElbowAngle);
    const goodForm = elbowSymmetry < 30;

    if (goodForm) {
      consecutiveGoodFormFrames.current += 1;
    } else {
      consecutiveGoodFormFrames.current = 0;
      setFormFeedback(`Uneven form (${Math.round(elbowSymmetry)}° diff)`);
    }

    if (consecutiveGoodFormFrames.current < 3) return;

    if (currentPhase === 'up' && avgElbowAngle < 100) {
      exercisePhaseRef.current = 'down';
      setFormFeedback('Down position ✓');
    } else if (currentPhase === 'down' && avgElbowAngle > 155) {
      const timeSinceLastRep = now - lastRepTimeRef.current;
      
      if (timeSinceLastRep > 600) {
        setReps(prev => prev + 1);
        lastRepTimeRef.current = now;
        exercisePhaseRef.current = 'up';
        setFormFeedback('Rep counted! ✓');
      }
    } else if (currentPhase === 'up' && avgElbowAngle > 155) {
      setFormFeedback('Ready - bend elbows');
    } else if (currentPhase === 'down' && avgElbowAngle < 100) {
      setFormFeedback('Hold down - push up');
    }
  }, [pose, isWorkoutStarted, isResting]);

  const expandContainer = () => {
    if (isExpandedRef.current) return;
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.parallel([
      Animated.spring(animatedHeight, { toValue: EXPANDED_HEIGHT, useNativeDriver: false, damping: 18, stiffness: 180 }),
      Animated.timing(weightOpacity, { toValue: 1, duration: 200, delay: 80, useNativeDriver: true }),
      Animated.spring(weightTranslateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 200 }),
    ]).start();
  };

  const collapseContainer = () => {
    if (!isExpandedRef.current) return;
    isExpandedRef.current = false;
    Animated.parallel([
      Animated.spring(animatedHeight, { toValue: COLLAPSED_HEIGHT, useNativeDriver: false, damping: 18, stiffness: 180 }),
      Animated.timing(weightOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(weightTranslateY, { toValue: 12, duration: 120, useNativeDriver: true }),
    ]).start(() => setIsExpanded(false));
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy < -30) expandContainer();
        else if (gs.dy > 30) collapseContainer();
      },
    })
  );

  const toggleCameraFacing = () => {
    setCameraFacing(c => {
      const next = c === 'back' ? 'front' : 'back';
      cameraFacingRef.current = next;
      return next;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    navigation.navigate('RoutineSelected', {
      exerciseId,
      setId,
      finished: true,
    });
  };

  const handleRestToggle = () => {
    if (isResting) {
      setSets(prev => prev + 1);
      setReps(0);
      exercisePhaseRef.current = 'up';
      consecutiveGoodFormFrames.current = 0;
    }
    setIsResting(prev => !prev);
  };

  const leftElbowAngle = pose ? calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist) : null;
  const rightElbowAngle = pose ? calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist) : null;
  
  const drawLine = (p1: Point, p2: Point, color = "#00FF00") => {
    if (p1.conf < 0.2 || p2.conf < 0.2) return null;
    return <Line key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth="4" />;
  };

  return (
    <View style={styles.container}>
      {hasPermission && device ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={true}
          resizeMode="cover"
          pixelFormat="rgb"
          frameProcessor={frameProcessor}
        />
      ) : (
        <LinearGradient colors={['#1a1d1b', '#000000']} style={StyleSheet.absoluteFillObject} />
      )}

      {pose && (
        <Svg
          height={SCREEN_HEIGHT}
          width={SCREEN_WIDTH}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {drawLine(pose.leftShoulder, pose.rightShoulder, "#CCFF00")}
          {drawLine(pose.leftShoulder, pose.leftElbow)}
          {drawLine(pose.leftElbow, pose.leftWrist)}
          {drawLine(pose.rightShoulder, pose.rightElbow)}
          {drawLine(pose.rightElbow, pose.rightWrist)}
          {drawLine(pose.leftHip, pose.rightHip, "#CCFF00")}
          {drawLine(pose.leftShoulder, pose.leftHip)}
          {drawLine(pose.rightShoulder, pose.rightHip)}
          {drawLine(pose.leftHip, pose.leftKnee)}
          {drawLine(pose.rightHip, pose.rightKnee)}
          
          {Object.entries(pose).map(([key, pt], index) => {
              // Skip ankle joints — not relevant for push-up tracking
              if (key === 'leftAnkle' || key === 'rightAnkle') return null;
            pt.conf > 0.2 && (
              <Circle 
                key={index} 
                cx={pt.x} 
                cy={pt.y} 
                r="8" 
                fill={pt.conf > 0.6 ? "#00FF00" : "#FFAA00"} 
                opacity="0.9"
              />
            );
          })}

        </Svg>
      )}

      {isWorkoutStarted ? (
        <>
          <View style={styles.statsCard}>
            <Text style={styles.statsExerciseName}>{exerciseName}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statValueSmall}>{formatTime(time)}</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
              <View style={styles.statColCenter}>
                <Text style={styles.statValueLarge}>{reps}</Text>
                <Text style={styles.statLabel}>Reps</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statValueSmall}>{sets}</Text>
                <Text style={styles.statLabel}>Set</Text>
              </View>
            </View>
            
            {pose && (
              <View style={styles.formFeedbackRow}>
                <Text style={styles.formFeedbackText}>{formFeedback}</Text>
                <Text style={styles.angleText}>
                  L: {leftElbowAngle !== null ? `${leftElbowAngle}°` : '--'} | R: {rightElbowAngle !== null ? `${rightElbowAngle}°` : '--'}
                </Text>
              </View>
            )}
          </View>

          {isResting ? (
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.resumeButton} onPress={handleRestToggle} activeOpacity={0.85}>
                <View style={styles.playTriangle} />
                <Text style={styles.resumeButtonText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.85}>
                <View style={styles.stopSquare} />
                <Text style={styles.finishButtonText}>FINISH</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.restButton} onPress={handleRestToggle} activeOpacity={0.85}>
              <View style={styles.pauseIconRow}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
              <Text style={styles.restButtonText}>REST</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Animated.View
          style={[styles.bottomOverlay, { height: animatedHeight }]}
          {...panResponderRef.current.panHandlers}
        >
          <View style={styles.grabberTarget}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.sideColumn}>
              <Text style={styles.topLabel}>WORKOUT</Text>
              <View style={styles.circleWhite}>
                <Image source={require('../assets/workout.png')} style={styles.whiteBtnIcon} />
              </View>
              <Text style={styles.bottomLabelGreen}>{exerciseName}</Text>
            </View>

            <View style={styles.centerColumn}>
              <TouchableOpacity
                style={styles.circleBlack}
                activeOpacity={0.8}
                onPress={() => setIsWorkoutStarted(true)}
              >
                <View style={styles.playTriangleBtn} />
              </TouchableOpacity>
              <Text style={styles.bottomLabelWhite}>START</Text>
            </View>

            <View style={styles.sideColumn}>
              <Text style={styles.topLabel}>Camera</Text>
              <TouchableOpacity style={styles.circleWhite} onPress={toggleCameraFacing} activeOpacity={0.8}>
                <Ionicons name="camera-reverse-outline" size={30} color="#000" />
              </TouchableOpacity>
              <Text style={styles.bottomLabelGreen}>{cameraFacing === 'back' ? 'Front' : 'Back'}</Text>
            </View>
          </View>

          <Animated.View
            style={[styles.weightContainer, { opacity: weightOpacity, transform: [{ translateY: weightTranslateY }] }]}
          >
            <View style={styles.zeroBackdrop}>
              <Text style={styles.zeroText}>0</Text>
            </View>
            <Text style={styles.weightText}>Weight (kg)</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  statsCard: {
    position: 'absolute',
    bottom: 118,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(34,34,29,0.92)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  statsExerciseName: {
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  formFeedbackRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  formFeedbackText: {
    fontSize: 11,
    fontFamily: 'Barlow-SemiBold',
    color: '#CCFF00',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  angleText: {
    fontSize: 9,
    fontFamily: 'Barlow-SemiBold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statColCenter: {
    alignItems: 'center',
    flex: 1,
  },
  statValueSmall: {
    fontSize: 13,
    fontFamily: 'Montserrat-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statValueLarge: {
    fontSize: 52,
    fontFamily: 'Montserrat-Bold',
    color: '#FFFFFF',
    lineHeight: 56,
  },
  statLabel: {
    fontSize: 8,
    fontFamily: 'Barlow-SemiBold',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  restButton: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    height: 44,
    backgroundColor: '#000000',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pauseIconRow: {
    flexDirection: 'row',
    gap: 5,
  },
  pauseBar: {
    width: 4,
    height: 18,
    backgroundColor: '#CCFF00',
    borderRadius: 2,
  },
  restButtonText: {
    fontSize: 13,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonsRow: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  resumeButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#000000',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderBottomWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: '#CCFF00',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 3,
  },
  resumeButtonText: {
    fontSize: 13,
    fontFamily: 'Barlow-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  finishButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopSquare: {
    width: 14,
    height: 14,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  finishButtonText: {
    fontSize: 13,
    fontFamily: 'Barlow-SemiBold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  playTriangleBtn: {
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