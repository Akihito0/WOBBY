import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mediaDevices, RTCPeerConnection, RTCView, RTCSessionDescription } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Line, Circle } from 'react-native-svg';
import Modal from 'react-native-modal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// List of potential server IPs to try
// 192.168.44.13: Your current Wi-Fi IP
// 192.168.137.1: Standard Windows Hotspot/Shared connection IP
const SERVER_IPS = ['192.168.44.13', '192.168.137.1', '10.124.14.51', '10.26.208.51', '192.168.1.58', 'localhost']; 
const PORT = '8765';

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
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [localStream, setLocalStream] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [time, setTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(route.params?.currentSetNumber || 1);
  const [pose, setPose] = useState<Pose | null>(null);
  const [formFeedback, setFormFeedback] = useState<string>('');
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);

  const exercisePhaseRef = useRef<'up' | 'down'>('down');
  const lastRepTimeRef = useRef<number>(0);
  const consecutiveGoodFormFrames = useRef<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    startWebRTC(cameraFacing);
    return () => stopWebRTC();
  }, [cameraFacing]);

  const stopWebRTC = () => {
    if (ws.current) ws.current.close();
    if (pc.current) pc.current.close();
    if (localStream) {
      localStream.getTracks().forEach((t: any) => t.stop());
      setLocalStream(null);
    }
    setIsConnected(false);
  };

  const startWebRTC = async (facing: 'front' | 'back') => {
    stopWebRTC();
    try {
      const isFront = facing === 'front';
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: { 
          facingMode: isFront ? 'user' : 'environment', 
          frameRate: 20, // Lowered from 30 to reduce bandwidth on hotspot
          width: 480,    // Lowered from 640 for less data processing
          height: 360    // Lowered from 480
        }
      });
      setLocalStream(stream);

      // Attempt to connect to potential server IPs
      let connected = false;
      for (const ip of SERVER_IPS) {
        if (connected) break;
        
        console.log(`Connecting to ${ip}...`);
        const socket = new WebSocket(`ws://${ip}:${PORT}`);
        
        const connectionTimeout = setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            socket.close();
          }
        }, 3000);

        await new Promise<void>((resolve) => {
          socket.onopen = async () => {
            clearTimeout(connectionTimeout);
            ws.current = socket;
            connected = true;
            setIsConnected(true);
            
            pc.current = new RTCPeerConnection({ iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              ]
            }) as any; 
            
            if (!pc.current) return;
            
            (pc.current as any).onicecandidate = (event: any) => {
              if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                  type: 'ice-candidate',
                  candidate: event.candidate,
                }));
              }
            };

            stream.getTracks().forEach((track: any) => pc.current?.addTrack(track, stream));

            const offer = await pc.current.createOffer({});
            await pc.current.setLocalDescription(offer);
            
            const sendSDP = () => {
                if(ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: 'offer', sdp: pc.current?.localDescription?.sdp }));
                }
            };

            if (pc.current.iceGatheringState === 'complete') {
                sendSDP();
            } else {
                // @ts-ignore: React Native WebRTC types are missing onicegatheringstatechange
                pc.current.onicegatheringstatechange = () => {
                    if (pc.current?.iceGatheringState === 'complete') sendSDP();
                };
            }
            resolve();
          };

          socket.onerror = () => {
            clearTimeout(connectionTimeout);
            resolve();
          };
          
          socket.onclose = () => {
            clearTimeout(connectionTimeout);
            resolve();
          };
        });
      }

      if (!ws.current) {
        console.error("Failed to connect to any server IP");
        return;
      }

      ws.current.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'answer') {
          await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'pose') {
          if (!data.landmarks || data.landmarks.length < 33) return;
          
          const lm = data.landmarks;
          
          // Using MediaPipe landmark format mapping
          const parsePoint = (i: number) => {
              // Note: Mediapipe WebRTC stream coordinates are normalized [0, 1]
              let x = isFront ? (1 - lm[i].x) : lm[i].x;
              return { x: x * SCREEN_WIDTH, y: lm[i].y * SCREEN_HEIGHT, conf: lm[i].visibility };
          };

          const parsedPose: Pose = {
            leftShoulder: parsePoint(11),
            rightShoulder: parsePoint(12),
            leftElbow: parsePoint(13),
            rightElbow: parsePoint(14),
            leftWrist: parsePoint(15),
            rightWrist: parsePoint(16),
            leftHip: parsePoint(23),
            rightHip: parsePoint(24),
            leftKnee: parsePoint(25),
            rightKnee: parsePoint(26),
          };
          
          // Exponential moving average for smoothness
          setPose((prevPose) => {
            if (!prevPose) return parsedPose;
            const ALPHA = 0.5;
            const smooth = (curr: Point, prev: Point): Point => {
                if (curr.conf < 0.15) return { ...prev, conf: prev.conf * 0.85 };
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
            };
          });
        }
      };

      ws.current.onclose = () => setIsConnected(false);
    } catch (err) {
      console.log('WebRTC Error:', err);
    }
  };

  const exerciseId = route.params?.exerciseId;
  const setId = route.params?.setId;
  const exerciseName = route.params?.exerciseName || 'STANDING BICEP CURL';
  const targetReps = route.params?.targetReps || 0;

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      // If the workout has started and we haven't reached target reps, and we aren't already showing a modal
      if (isWorkoutStarted && reps < targetReps && !showIncompleteModal && !showFinishedModal) {
        // Only block if it's a back action
        if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
            e.preventDefault();
            setShowIncompleteModal(true);
        }
      }
    });
    return unsub;
  }, [navigation, isWorkoutStarted, reps, targetReps, showIncompleteModal, showFinishedModal]);

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

  const isLegVisible = (pose: any) => {
    // Check if at least one leg set (hip to knee) is visible enough
    if (!pose) return false;
    const leftLeg = pose.leftHip?.conf > 0.3 && pose.leftKnee?.conf > 0.3;
    const rightLeg = pose.rightHip?.conf > 0.3 && pose.rightKnee?.conf > 0.3;
    return leftLeg || rightLeg;
  };

  useEffect(() => {
    if (!isWorkoutStarted || isResting || !pose) return;

    const leftElbowAngle = calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
    const rightElbowAngle = calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist);

    // If we can't see the specific parts for the exercise, warn the user
    if (leftElbowAngle === null && rightElbowAngle === null) {
      setFormFeedback(prev => prev !== 'Arms not visible' ? 'Arms not visible' : prev);
      return;
    }

    // Use whichever arm is visible, or the average if both are
    let avgElbowAngle = 0;
    if (leftElbowAngle !== null && rightElbowAngle !== null) {
      avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
    } else {
      avgElbowAngle = leftElbowAngle ?? rightElbowAngle ?? 0;
    }

    const currentPhase = exercisePhaseRef.current;
    
    // CONFIGURATION BASED ON EXERCISE
    let upThreshold = 145;    
    let downThreshold = 100;   
    let isPushExercise = false;

    const name = exerciseName.toUpperCase();
    if (name.includes('PUSH') || name.includes('BENCH') || name.includes('DIP') || name.includes('PRESS')) {
      isPushExercise = true;
      upThreshold = 145; 
      downThreshold = 100; 
    } else {
      upThreshold = 60; 
      downThreshold = 150;
    }

    const updateFeedback = (msg: string) => {
      setFormFeedback(prev => prev !== msg ? msg : prev);
    };

    // LEG VISIBILITY WARNING (Critical for horizontal exercises like Pushups)
    if (isPushExercise && name.includes('PUSH') && !isLegVisible(pose)) {
       updateFeedback('Move back - show legs');
       // We still try to count if arms are visible, but warn user
    }

    // Relaxed symmetry check: if one arm is missing, we still count based on the other
    const elbowSymmetry = (leftElbowAngle !== null && rightElbowAngle !== null) 
      ? Math.abs(leftElbowAngle - rightElbowAngle) 
      : 0;
    
    const goodForm = elbowSymmetry < 45; // Increased tolerance

    if (goodForm) {
      consecutiveGoodFormFrames.current += 1;
    } else {
      consecutiveGoodFormFrames.current = 0;
      updateFeedback('Uneven arms');
    }

    if (consecutiveGoodFormFrames.current < 2) return;

    if (isPushExercise) {
      // PUSH LOGIC (Bench/Pushup/Dips)
      if (currentPhase === 'up' && avgElbowAngle < downThreshold) {
        exercisePhaseRef.current = 'down';
        updateFeedback('Go lower! ✓');
      } else if (currentPhase === 'down' && avgElbowAngle > upThreshold) {
        const newReps = reps + 1;
        setReps(newReps);
        exercisePhaseRef.current = 'up';
        updateFeedback('Rep counted! ✓');
        
        // Check if target is reached
        if (targetReps > 0 && newReps >= targetReps) {
          setShowFinishedModal(true);
        }
      }
    } else {
      // PULL LOGIC (Curls)
      if (currentPhase === 'down' && avgElbowAngle < upThreshold) {
        exercisePhaseRef.current = 'up';
        updateFeedback('Up position! ✓');
      } else if (currentPhase === 'up' && avgElbowAngle > downThreshold) {
        const newReps = reps + 1;
        setReps(newReps);
        exercisePhaseRef.current = 'down';
        updateFeedback('Rep counted! ✓');

        // Check if target is reached
        if (targetReps > 0 && newReps >= targetReps) {
          setShowFinishedModal(true);
        }
      }
    }
  }, [pose, isWorkoutStarted, isResting, exerciseName, reps, targetReps]);

  const toggleCameraFacing = () => {
    setCameraFacing(c => c === 'back' ? 'front' : 'back');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleFinish = () => {
    const navigateBack = (isIncomplete: boolean) => {
      navigation.navigate({
        name: 'RoutineSelected',
        params: { finished: true, incomplete: isIncomplete, exerciseId, setId },
        merge: true,
      });
    };

    if (reps < targetReps) {
      setShowIncompleteModal(true);
    } else {
      navigateBack(false);
    }
  };

  const handleRestToggle = () => {
    if (isResting) {
      setReps(0);
      exercisePhaseRef.current = 'down';
      consecutiveGoodFormFrames.current = 0;
    }
    setIsResting(prev => !prev);
  };

  const leftElbowAngle = pose ? calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist) : null;
  const rightElbowAngle = pose ? calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist) : null;
  
  const drawLine = (p1: Point, p2: Point) => {
    if (p1.conf < 0.2 || p2.conf < 0.2) return null;
    return <Line key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="2" />;
  };

  return (
    <View style={styles.container}>
      {localStream ? (
        <RTCView 
          streamURL={localStream.toURL()} 
          style={StyleSheet.absoluteFillObject} 
          objectFit="cover" 
          mirror={cameraFacing === 'front'} 
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={{color: 'white'}}>Connecting to Camera...</Text>
        </View>
      )}

      {pose && (
        <Svg
          height={SCREEN_HEIGHT}
          width={SCREEN_WIDTH}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {drawLine(pose.leftShoulder, pose.rightShoulder)}
          {drawLine(pose.leftShoulder, pose.leftElbow)}
          {drawLine(pose.leftElbow, pose.leftWrist)}
          {drawLine(pose.rightShoulder, pose.rightElbow)}
          {drawLine(pose.rightElbow, pose.rightWrist)}
          {drawLine(pose.leftHip, pose.rightHip)}
          {drawLine(pose.leftShoulder, pose.leftHip)}
          {drawLine(pose.rightShoulder, pose.rightHip)}
          {drawLine(pose.leftHip, pose.leftKnee)}
          {drawLine(pose.rightHip, pose.rightKnee)}
          
          {Object.entries(pose).map(([key, pt], index) => {
            if(pt && pt.conf > 0.15) {
               return (
                <Circle 
                  key={key} 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="5" 
                  fill="#CCFF00" 
                />
              )
            }
            return null;
          })}
        </Svg>
      )}

      {/* Incomplete Set Modal */}
      <Modal 
        isVisible={showIncompleteModal} 
        onBackdropPress={() => setShowIncompleteModal(false)}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.8}
        style={{ margin: 20 }}
      >
        <View style={styles.modalGradientContainer}>
          <LinearGradient
            colors={['#000000', '#666666']}
            start={{ x: 0.5, y: 0.16 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.modalBackground}
          >
            <View style={styles.modalBorderOverlay} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>Set Incomplete</Text>
            </View>

            <View style={styles.modalContent}>
              <Image 
                source={require('../assets/wobby.png')} 
                style={styles.modalIllustration}
              />
              
              <Text style={styles.modalDescription}>
                You’ve only done <Text style={{ color: '#65FC0D' }}>{reps}</Text> of <Text style={{ color: '#65FC0D' }}>{targetReps}</Text>. Are you sure you’re finished?
              </Text>

              <TouchableOpacity 
                style={styles.keepGoingButton} 
                onPress={() => setShowIncompleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.keepGoingButtonText}>KEEP GOING!</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.finishAnywayButton} 
                onPress={() => {
                  setShowIncompleteModal(false);
                  const navigateBack = (isIncomplete: boolean) => {
                    navigation.navigate({
                      name: 'RoutineSelected',
                      params: { finished: true, incomplete: isIncomplete, exerciseId, setId },
                      merge: true,
                    });
                  };
                  navigateBack(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.finishAnywayButtonText}>Finish Anyway</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Set Finished Modal */}
      <Modal 
        isVisible={showFinishedModal} 
        onBackdropPress={() => setShowFinishedModal(false)}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.8}
        style={{ margin: 20 }}
      >
        <View style={styles.modalGradientContainer}>
          <LinearGradient
            colors={['#000000', '#666666']}
            start={{ x: 0.5, y: 0.16 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.modalBackground}
          >
            <View style={styles.modalBorderOverlaySuccess} />
            
            <View style={styles.modalHeaderSuccess}>
              <Text style={styles.modalHeaderText}>Set Complete!</Text>
            </View>

            <View style={styles.modalContent}>
              <Image 
                source={require('../assets/wobby.png')} 
                style={styles.modalIllustration}
              />
              
              <Text style={styles.modalDescriptionLarge}>
                CONGRATS!
              </Text>
              <Text style={styles.modalDescription}>
                You reached your goal of <Text style={{ color: '#65FC0D' }}>{targetReps}</Text> reps. Ready to wrap it up?
              </Text>

              <TouchableOpacity 
                style={styles.keepGoingButton} 
                onPress={() => setShowFinishedModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.keepGoingButtonText}>Keep Pushing</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.finishSetButton} 
                onPress={() => {
                  setShowFinishedModal(false);
                  const navigateBack = (isIncomplete: boolean) => {
                    navigation.navigate({
                      name: 'RoutineSelected',
                      params: { finished: true, incomplete: isIncomplete, exerciseId, setId },
                      merge: true,
                    });
                  };
                  navigateBack(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.finishSetButtonText}>Finish Set</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* BEFORE WORKOUT STARTS: Dark Setup Menu */}
      {!isWorkoutStarted && (
        <View
          style={[styles.bottomOverlay, { height: COLLAPSED_HEIGHT }]}
        >
          <View style={styles.controlsRow}>
            <View style={styles.sideColumn}>
              <Text style={styles.topLabel}>WORKOUT</Text>
              <View style={styles.circleWhite}>
                <Image source={require('../assets/workout.png')} style={styles.whiteBtnIcon} />
              </View>
              <Text style={styles.bottomLabelWhite}>{exerciseName}</Text>
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
                <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.bottomLabelWhite}>{cameraFacing === 'back' ? 'Front' : 'Back'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ACTIVE WORKOUT: Dark Bottom Card and Pill Button */}
      {isWorkoutStarted && (
        <View style={styles.activeWorkoutContainer}>
          <View style={styles.darkStatsCard}>
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15}}>
              <Text style={styles.darkStatsExerciseName}>{exerciseName}</Text>
              <Text style={{ position: 'absolute', right: 0, top: 0, color: isConnected ? '#CCFF00' : 'red', fontSize: 10, fontFamily: 'Barlow-Medium' }}>
                {isConnected ? '● Connected' : '○ Offline'}
              </Text>
            </View>
            
            <View style={styles.darkStatsRow}>
              <View style={styles.statCol}>
                <Text style={styles.darkStatValueSmall}>{formatTime(time)}</Text>
                <Text style={styles.darkStatLabel}>Time</Text>
              </View>
              <View style={styles.statColCenter}>
                <Text style={styles.darkStatValueLarge}>{reps}</Text>
                <Text style={styles.darkStatLabel}>Reps</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.darkStatValueSmall}>{sets}</Text>
                <Text style={styles.darkStatLabel}>Set</Text>
              </View>
            </View>
            
            {pose && (
              <View style={{ flexDirection: 'column', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={[styles.darkFormFeedbackText, { fontSize: 22, color: '#CCFF00', marginBottom: 6, textAlign: 'center' }]}>
                  {formFeedback}
                </Text>
                <Text style={styles.darkAngleText}>
                  L: {leftElbowAngle !== null ? leftElbowAngle + '°' : '--'} | R: {rightElbowAngle !== null ? rightElbowAngle + '°' : '--'}
                </Text>
              </View>
            )}
          </View>

          {isResting ? (
            <View style={styles.darkButtonsRow}>
              <TouchableOpacity style={styles.darkPillButton} onPress={handleRestToggle} activeOpacity={0.85}>
                <View style={styles.playTriangleGreen} />
                <Text style={styles.darkPillButtonText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.darkPillButton} onPress={handleFinish} activeOpacity={0.85}>
                <View style={styles.stopSquareRed} />
                <Text style={styles.darkPillButtonText}>FINISH</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.darkPillButton} onPress={handleRestToggle} activeOpacity={0.85}>
              <View style={styles.pauseIconRow}>
                <View style={styles.pauseBarGreen} />
                <View style={styles.pauseBarGreen} />
              </View>
              <Text style={styles.darkPillButtonText}>REST</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  cameraPlaceholder: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  
  // ACTIVE WORKOUT STYLES
  activeWorkoutContainer: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  darkStatsCard: { backgroundColor: 'rgba(30, 30, 30, 0.95)', borderRadius: 16, padding: 24, width: '100%', marginBottom: 20 },
  darkStatsExerciseName: { fontFamily: 'Barlow-Bold', fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase' },
  darkStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  statCol: { alignItems: 'center', width: 60 },
  statColCenter: { alignItems: 'center', width: 80 },
  darkStatValueLarge: { fontFamily: 'Barlow-ExtraBold', fontSize: 48, color: '#FFFFFF', lineHeight: 54 },
  darkStatValueSmall: { fontFamily: 'Barlow-Bold', fontSize: 18, color: '#FFFFFF' },
  darkStatLabel: { fontFamily: 'Barlow-Medium', fontSize: 12, color: '#888888', marginTop: 2 },
  darkFormFeedbackText: { fontFamily: 'Barlow-SemiBold', fontSize: 12, color: '#FFFFFF' },
  darkAngleText: { fontFamily: 'Barlow-Medium', fontSize: 11, color: '#888888' },
  
  darkButtonsRow: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  darkPillButton: { backgroundColor: '#000000', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  pauseIconRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  pauseBarGreen: { width: 4, height: 16, backgroundColor: '#CCFF00', borderRadius: 2, marginHorizontal: 2 },
  darkPillButtonText: { fontFamily: 'Barlow-Bold', fontSize: 12, color: '#FFFFFF', marginLeft: 10 },
  playTriangleGreen: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 12, borderRightWidth: 0, borderBottomWidth: 7, borderTopWidth: 7, borderLeftColor: '#CCFF00', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  stopSquareRed: { width: 14, height: 14, backgroundColor: '#FF3333', borderRadius: 2 },
  
  // PRE-WORKOUT SETUP MENU
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26, 26, 26, 0.90)', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 30, paddingTop: 10 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  sideColumn: { alignItems: 'center', width: 70 },
  centerColumn: { alignItems: 'center' },
  topLabel: { fontFamily: 'Montserrat-Regular', fontSize: 10, color: '#AAAAAA', marginBottom: 8, textTransform: 'uppercase' },
  bottomLabelWhite: { fontFamily: 'Montserrat-Bold', fontSize: 12, color: '#FFFFFF', marginTop: 8 },
  circleWhite: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  circleBlack: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(204,255,0,0.5)', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  whiteBtnIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' },
  playTriangleBtn: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 18, borderRightWidth: 0, borderBottomWidth: 10, borderTopWidth: 10, borderLeftColor: '#CCFF00', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 6 },

  // MODAL STYLES
  modalGradientContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    height: 560, // Increased from 541 to give more room at the bottom
    width: '100%',
  },
  modalBackground: {
    flex: 1,
    borderRadius: 15,
    padding: 3,
  },
  modalBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#6E8900',
    pointerEvents: 'none',
  },
  modalHeader: {
    backgroundColor: '#232323',
    height: 53,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalIllustration: {
    width: 198,
    height: 198,
    resizeMode: 'contain',
    marginTop: 10,
    marginBottom: 30,
  },
  modalDescription: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  keepGoingButton: {
    backgroundColor: '#37C60D',
    width: 162,
    height: 60,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 20,
  },
  keepGoingButtonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  finishAnywayButton: {
    backgroundColor: '#C60000',
    width: 140,
    height: 37,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  finishAnywayButtonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalBorderOverlaySuccess: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#37C60D',
    pointerEvents: 'none',
  },
  modalHeaderSuccess: {
    backgroundColor: '#37C60D',
    height: 53,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalDescriptionLarge: {
    fontFamily: 'Montserrat-Black',
    fontSize: 32,
    color: '#65FC0D',
    textAlign: 'center',
    marginBottom: 10,
  },
  finishSetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 140,
    height: 37,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#65FC0D',
    marginBottom: 20, // Added margin to pull it away from the bottom border
  },
  finishSetButtonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#65FC0D',
  },
});