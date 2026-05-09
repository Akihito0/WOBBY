import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mediaDevices, RTCPeerConnection, RTCView, RTCSessionDescription } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number; conf: number };
export type Pose = {
  leftShoulder: Point; rightShoulder: Point;
  leftElbow: Point; rightElbow: Point;
  leftWrist: Point; rightWrist: Point;
  leftHip: Point; rightHip: Point;
  leftKnee: Point; rightKnee: Point;
};

const calculateAngle = (A: Point | undefined, B: Point | undefined, C: Point | undefined) => {
  if (!A || !B || !C || A.conf < 0.3 || B.conf < 0.3 || C.conf < 0.3) return null;
  const angle = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let degree = Math.abs((angle * 180.0) / Math.PI);
  if (degree > 180) degree = 360 - degree;
  return Math.round(degree);
};

export default function ActiveVersusScreen({ navigation, route }: any) {
  const { matchId, isPlayer1, exerciseName, targetReps, targetSets, currentSet } = route.params;

  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [localStream, setLocalStream] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [opponentReps, setOpponentReps] = useState(0); // 🔴 OPPONENT'S LIVE REPS
  
  const [pose, setPose] = useState<Pose | null>(null);
  const [formFeedback, setFormFeedback] = useState<string>('');

  const exercisePhaseRef = useRef<'up' | 'down'>('down');
  const consecutiveGoodFormFrames = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ─── 1. SUPABASE BROADCAST SETUP ───
  useEffect(() => {
    // Join a temporary in-memory room specifically for this match
    const channel = supabase.channel(`battle_${matchId}`, {
      config: { broadcast: { self: false } }
    });

    // Listen for the opponent's rep updates
    channel.on('broadcast', { event: 'REP_UPDATE' }, (payload) => {
      console.log("Opponent rep update received!", payload);
      setOpponentReps(payload.payload.reps);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('✅ Connected to live battle channel!');
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── 2. WEBRTC & AI CAMERA SETUP ───
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
        video: { facingMode: isFront ? 'user' : 'environment', frameRate: 20, width: 480, height: 360 }
      });
      setLocalStream(stream);

      const serverUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8765';
      const socket = new WebSocket(serverUrl);
      ws.current = socket;

      socket.onopen = async () => {
        setIsConnected(true);
        pc.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }) as any; 
        
        if (!pc.current) return;
        (pc.current as any).onicecandidate = (event: any) => {
          if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
          }
        };

        stream.getTracks().forEach((track: any) => pc.current?.addTrack(track, stream));

        const offer = await pc.current.createOffer({});
        await pc.current.setLocalDescription(offer);
        
        if (pc.current.iceGatheringState === 'complete') {
            ws.current.send(JSON.stringify({ type: 'offer', sdp: pc.current?.localDescription?.sdp }));
        } else {
            // @ts-ignore
            pc.current.onicegatheringstatechange = () => {
                if (pc.current?.iceGatheringState === 'complete') {
                    ws.current?.send(JSON.stringify({ type: 'offer', sdp: pc.current?.localDescription?.sdp }));
                }
            };
        }
      };

      socket.onclose = () => setIsConnected(false);
      socket.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'answer') {
          await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'pose' && data.landmarks?.length >= 33) {
          const lm = data.landmarks;
          const parsePoint = (i: number) => ({
              x: (isFront ? (1 - lm[i].x) : lm[i].x) * SCREEN_WIDTH, 
              y: lm[i].y * SCREEN_HEIGHT, 
              conf: lm[i].visibility 
          });

          setPose({
            leftShoulder: parsePoint(11), rightShoulder: parsePoint(12),
            leftElbow: parsePoint(13), rightElbow: parsePoint(14),
            leftWrist: parsePoint(15), rightWrist: parsePoint(16),
            leftHip: parsePoint(23), rightHip: parsePoint(24),
            leftKnee: parsePoint(25), rightKnee: parsePoint(26),
          });
        }
      };
    } catch (err) {
      console.log('WebRTC Error:', err);
    }
  };

  // ─── 3. TIMER ───
  useEffect(() => {
    if (isWorkoutStarted) {
      intervalRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isWorkoutStarted]);

  // ─── 4. REP COUNTING & BROADCASTING ───
  useEffect(() => {
    if (!isWorkoutStarted || !pose) return;

    const leftElbowAngle = calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
    const rightElbowAngle = calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist);

    if (leftElbowAngle === null && rightElbowAngle === null) {
      setFormFeedback('Arms not visible');
      return;
    }

    let avgElbowAngle = (leftElbowAngle ?? rightElbowAngle ?? 0 + (rightElbowAngle ?? leftElbowAngle ?? 0)) / 2;

    const name = exerciseName.toUpperCase();
    const isPushExercise = name.includes('PUSH') || name.includes('BENCH') || name.includes('DIP');
    const upThreshold = isPushExercise ? 145 : 60; 
    const downThreshold = isPushExercise ? 100 : 150; 

    // Symmetry Check
    const elbowSymmetry = (leftElbowAngle !== null && rightElbowAngle !== null) ? Math.abs(leftElbowAngle - rightElbowAngle) : 0;
    if (elbowSymmetry < 45) {
      consecutiveGoodFormFrames.current += 1;
    } else {
      consecutiveGoodFormFrames.current = 0;
      setFormFeedback('Uneven arms');
    }

    if (consecutiveGoodFormFrames.current < 2) return;

    // Rep Registration
    const currentPhase = exercisePhaseRef.current;
    
    if (isPushExercise) {
      if (currentPhase === 'up' && avgElbowAngle < downThreshold) {
        exercisePhaseRef.current = 'down';
        setFormFeedback('Go lower! ✓');
      } else if (currentPhase === 'down' && avgElbowAngle > upThreshold) {
        registerRep();
      }
    } else {
      if (currentPhase === 'down' && avgElbowAngle < upThreshold) {
        exercisePhaseRef.current = 'up';
        setFormFeedback('Up position! ✓');
      } else if (currentPhase === 'up' && avgElbowAngle > downThreshold) {
        registerRep();
      }
    }
  }, [pose, isWorkoutStarted]);

  const registerRep = () => {
    const newReps = reps + 1;
    setReps(newReps);
    exercisePhaseRef.current = isPushExercise(exerciseName) ? 'up' : 'down';
    setFormFeedback('Rep counted! ✓');

    // 🔴 SEND LIVE UPDATE TO OPPONENT
    channelRef.current?.send({
      type: 'broadcast',
      event: 'REP_UPDATE',
      payload: { reps: newReps },
    });

    if (newReps >= targetReps) {
      handleSetFinished();
    }
  };

  const isPushExercise = (name: string) => {
    const n = name.toUpperCase();
    return n.includes('PUSH') || n.includes('BENCH') || n.includes('DIP');
  };

  const handleSetFinished = async () => {
    setIsWorkoutStarted(false);
    
    // Save to database
    try {
      const fieldReps = isPlayer1 ? 'player1_reps' : 'player2_reps';
      const fieldSets = isPlayer1 ? 'player1_sets' : 'player2_sets';
      const fieldTime = isPlayer1 ? 'player1_time' : 'player2_time';
      
      await supabase
        .from('versus_battles')
        .update({
          [fieldReps]: targetReps,
          [fieldSets]: currentSet,
          [fieldTime]: time // Save how fast they finished!
        })
        .eq('id', matchId);

    } catch (e) {
      console.log('Error saving set data', e);
    }

    Alert.alert("Set Complete!", "You finished before your opponent. Returning to Lobby...");
    navigation.goBack(); // Return to LiveVersusRoutine
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const drawLine = (p1: Point, p2: Point) => {
    if (p1.conf < 0.2 || p2.conf < 0.2) return null;
    return <Line key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="2" />;
  };

  return (
    <View style={styles.container}>
      {/* CAMERA */}
      {localStream ? (
        <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror={cameraFacing === 'front'} />
      ) : (
        <View style={styles.cameraPlaceholder}><Text style={{color: 'white'}}>Connecting to Camera...</Text></View>
      )}

      {/* SKELETON OVERLAY */}
      {pose && (
        <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {drawLine(pose.leftShoulder, pose.rightShoulder)}
          {drawLine(pose.leftShoulder, pose.leftElbow)}
          {drawLine(pose.leftElbow, pose.leftWrist)}
          {drawLine(pose.rightShoulder, pose.rightElbow)}
          {drawLine(pose.rightElbow, pose.rightWrist)}
          {Object.entries(pose).map(([key, pt]) => pt.conf > 0.15 ? <Circle key={key} cx={pt.x} cy={pt.y} r="5" fill="#CCFF00" /> : null)}
        </Svg>
      )}

      {/* 🔴 THE LIVE SCOREBOARD 🔴 */}
      <View style={styles.scoreBoard}>
        <LinearGradient colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.4)']} style={styles.scoreGradient}>
          
          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>YOU</Text>
            <Text style={styles.scoreNumberYou}>{reps} <Text style={styles.targetText}>/ {targetReps}</Text></Text>
          </View>

          <View style={styles.vsDivider}>
            <Text style={styles.timerText}>{formatTime(time)}</Text>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>OPPONENT</Text>
            <Text style={styles.scoreNumberOpponent}>{opponentReps} <Text style={styles.targetText}>/ {targetReps}</Text></Text>
          </View>

        </LinearGradient>
      </View>

      {/* PRE-WORKOUT START MENU */}
      {!isWorkoutStarted && (
        <View style={styles.bottomOverlay}>
          <Text style={styles.exerciseTitle}>{exerciseName} - Set {currentSet}</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setIsWorkoutStarted(true)} activeOpacity={0.8}>
            <Text style={styles.startBtnText}>START BATTLE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* IN-WORKOUT FEEDBACK */}
      {isWorkoutStarted && (
        <View style={styles.feedbackOverlay}>
           <Text style={styles.feedbackText}>{formFeedback}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  cameraPlaceholder: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  
  scoreBoard: { position: 'absolute', top: 50, left: 20, right: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  scoreGradient: { flexDirection: 'row', padding: 15, alignItems: 'center', justifyContent: 'space-between' },
  scoreCol: { alignItems: 'center', flex: 1 },
  scoreLabel: { color: '#888', fontSize: 12, fontFamily: 'Montserrat-Bold', marginBottom: 5 },
  scoreNumberYou: { color: '#CCFF00', fontSize: 32, fontFamily: 'Montserrat-Black' },
  scoreNumberOpponent: { color: '#FF4444', fontSize: 32, fontFamily: 'Montserrat-Black' },
  targetText: { fontSize: 16, color: '#666' },
  
  vsDivider: { alignItems: 'center', paddingHorizontal: 10 },
  timerText: { color: '#FFF', fontSize: 18, fontFamily: 'Barlow-Bold', marginBottom: 5 },
  vsText: { color: '#FFF', fontSize: 12, fontFamily: 'Montserrat-Black', fontStyle: 'italic', opacity: 0.5 },

  bottomOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(20,20,20,0.95)', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#CCFF00' },
  exerciseTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Montserrat-Black', marginBottom: 20, textTransform: 'uppercase' },
  startBtn: { backgroundColor: '#CCFF00', width: '100%', paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  startBtnText: { color: '#000', fontSize: 18, fontFamily: 'Montserrat-ExtraBold' },

  feedbackOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' },
  feedbackText: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#CCFF00', fontSize: 24, fontFamily: 'Montserrat-Bold', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, overflow: 'hidden' }
});