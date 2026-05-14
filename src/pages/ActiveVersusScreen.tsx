import React, { useState, useEffect, useRef } from 'react';
import { checkAndNotifyRank } from '../utils/leaderboardUtils';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mediaDevices, RTCPeerConnection, RTCView, RTCSessionDescription } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import ChallengeModal from '../components/ChallengeModal';
import { useHealth } from '../context/HealthContext';
import { getHeartRateHistory, HeartRateSample } from '../../modules/wobby-health';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number; conf: number };
export type Pose = {
  leftShoulder: Point; rightShoulder: Point;
  leftElbow: Point; rightElbow: Point;
  leftWrist: Point; rightWrist: Point;
  leftHip: Point; rightHip: Point;
  leftKnee: Point; rightKnee: Point;
  leftAnkle: Point; rightAnkle: Point;
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
  const [isServerReady, setIsServerReady] = useState(false); // 🔥 Fix 10-20s Delay 🔥
  const [countdown, setCountdown] = useState(5); // 5-second countdown
  const [showCountdown, setShowCountdown] = useState(true);
  const [time, setTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [opponentReps, setOpponentReps] = useState(0);

  const { heartRate: contextHR } = useHealth();
  const [activeHR, setActiveHR] = useState<number | null>(null);
  const [sessionHRData, setSessionHRData] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [myTime, setMyTime] = useState(0);
  const [opponentTime, setOpponentTime] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);

  // Final match result states for ChallengeModal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeData, setChallengeData] = useState<any>(null);

  // Forfeit system states
  const [opponentForfeited, setOpponentForfeited] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);

  const isNavigatingAway = useRef(false);

  // ─── HEART RATE LOGIC ───
  useEffect(() => {
    let hrIntervalId: ReturnType<typeof setInterval>;

    const fetchLiveHR = async () => {
      try {
        const history: HeartRateSample[] = await getHeartRateHistory(1);
        if (history && history.length > 0) {
          const latest = history[history.length - 1];
          const ageMs = Date.now() - new Date(latest.date).getTime();

          // Only accept readings from the last 30 seconds to avoid stale
          // HealthKit data when no watch is actively connected
          if (ageMs <= 30000) {
            const val = Math.round(latest.value);
            setActiveHR(val);

            if (isWorkoutStarted && !isFinished) {
              setSessionHRData(prev => [...prev, val]);
            }
          } else {
            setActiveHR(null);
          }
        }
      } catch (error) {
        console.log('Error polling HR:', error);
      }
    };

    if (isWorkoutStarted && !isFinished) {
      fetchLiveHR(); 
      hrIntervalId = setInterval(fetchLiveHR, 2000); 
    }

    return () => {
      if (hrIntervalId) clearInterval(hrIntervalId);
    };
  }, [isWorkoutStarted, isFinished]);

  const displayHR = activeHR !== null ? activeHR : contextHR;


  const userIdRef = useRef<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  const [pose, setPose] = useState<Pose | null>(null);
  const [formFeedback, setFormFeedback] = useState<string>('');

  const exercisePhaseRef = useRef<'up' | 'down'>('down');
  const consecutiveGoodFormFrames = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Use a ref to track reps so closures always read the latest value
  const repsRef = useRef<number>(0);
  // Guard to prevent handleSetFinished from being called more than once
  const hasFinishedRef = useRef<boolean>(false);

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

    channel.on('broadcast', { event: 'FINISHED_SET' }, (payload) => {
      console.log("Opponent finished set!", payload);
      setOpponentFinished(true);
      setOpponentTime(payload.payload.time);
    });

    // 🏳️ Listen for opponent forfeit
    channel.on('broadcast', { event: 'FORFEIT' }, (payload) => {
      console.log('🏳️ Opponent has forfeited!', payload);
      setOpponentForfeited(true);
      setShowForfeitModal(true);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('✅ Connected to live battle channel!');
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch my own profile for avatar
  useEffect(() => {
    const fetchMyProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setMyProfile(data);
      }
    };
    fetchMyProfile();
  }, []);

  // Prevent users from leaving the screen while a match is in progress
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: {preventDefault: () => void; data: {action: any}}) => {
      if (isNavigatingAway.current) return;

      // If challengeData is null, the match result hasn't been finalized yet
      if (!challengeData) {
        e.preventDefault();
        
        Alert.alert(
          '⚠️ Versus Match In Progress',
          'You are still in an active versus match. If you leave now, you will forfeit the match. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Forfeit & Exit',
              style: 'destructive',
              onPress: async () => {
                try {
                  stopWebRTC();
                  
                  // Declare opponent as winner
                  const { data } = await supabase.from('versus_battles').select('player1_id, player2_id').eq('id', matchId).single();
                  const opponentId = data ? (isPlayer1 ? data.player2_id : data.player1_id) : null;
                  const myUserId = userIdRef.current;

                  await supabase
                    .from('versus_battles')
                    .update({
                      status: 'forfeited',
                      winner_id: opponentId,
                    })
                    .eq('id', matchId);

                  // 🔴 Broadcast FORFEIT to opponent so they get a real-time popup
                  channelRef.current?.send({
                    type: 'broadcast',
                    event: 'FORFEIT',
                    payload: { forfeitedBy: myUserId },
                  });

                  // Send forfeit notifications
                  if (myUserId && opponentId) {
                    const { data: profiles } = await supabase
                      .from('profiles')
                      .select('id, username')
                      .in('id', [myUserId, opponentId]);
                    
                    const me = profiles?.find(p => p.id === myUserId);
                    const opponent = profiles?.find(p => p.id === opponentId);

                    await supabase.from('notifications').insert([
                      {
                        user_id: myUserId,
                        title: '🏳️ Match Forfeited',
                        message: `You forfeited the ${exerciseName} match against ${opponent?.username || 'Opponent'}.`,
                        metadata: { match_id: matchId, type: 'forfeit' },
                      },
                      {
                        user_id: opponentId,
                        title: '🏆 Match Won (Forfeit)',
                        message: `${me?.username || 'Your opponent'} forfeited the ${exerciseName} match. You win by default!`,
                        metadata: { match_id: matchId, type: 'forfeit' },
                      }
                    ]);
                  }
                  
                  // Navigate back to versus workout screen
                  isNavigatingAway.current = true;
                  navigation.reset({ index: 0, routes: [{ name: 'VersusWorkoutScreen' }] });
                } catch (error) {
                  console.error('Forfeit error:', error);
                  isNavigatingAway.current = true;
                  navigation.reset({ index: 0, routes: [{ name: 'VersusWorkoutScreen' }] });
                }
              }
            }
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, challengeData]);

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

      const serverUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL;
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

        // 🚀 TRICKLE ICE: Send offer IMMEDIATELY, don't wait for ICE gathering.
        // ICE candidates trickle in separately via onicecandidate above.
        if (ws.current?.readyState === WebSocket.OPEN) {
          console.log('Sending SDP offer immediately (trickle ICE)');
          ws.current.send(JSON.stringify({ type: 'offer', sdp: pc.current?.localDescription?.sdp }));
        }
      };

      socket.onclose = () => setIsConnected(false);
      socket.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'answer') {
          await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
          if (!isServerReady) setIsServerReady(true); // Wobby Spotter accepted stream and is ready!
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
            leftAnkle: parsePoint(27), rightAnkle: parsePoint(28),
          });
        }
      };
    } catch (err) {
      console.log('WebRTC Error:', err);
    }
  };

  // ─── 3. COUNTDOWN & TIMER ───
  useEffect(() => {
    let timer: any;
    if (showCountdown && isServerReady) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        setShowCountdown(false);
        setIsWorkoutStarted(true);
      }
    }
    return () => clearTimeout(timer);
  }, [countdown, showCountdown, isServerReady]);

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
    if (!isWorkoutStarted || !pose || isFinished) return;

    const name = exerciseName.toUpperCase();

    // ─── CLASSIFY EXERCISE ───
    const isLegExercise =
      name.includes('SQUAT') || name.includes('LUNGE') || name.includes('LEG') ||
      name.includes('CALF') || name.includes('DEADLIFT') || name.includes('GLUTE') ||
      name.includes('EXTENSION');

    const isPushUp = name.includes('PUSH UP');
    const isBenchPress = name.includes('BENCH');
    const isDip = name.includes('DIP');
    const isPullUp = name.includes('PULL UP') || name.includes('PULLDOWN');
    const isRow = name.includes('ROW');
    const isCurl = name.includes('CURL');

    // Generic fallbacks
    const isPushExercise = isPushUp || isBenchPress || isDip || name.includes('PUSH') || name.includes('PRESS') || name.includes('CHEST');

    if (isLegExercise) {
      // 🦵 LEG LOGIC — Hip-Knee-Ankle angle
      const leftKneeAngle = calculateAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle);
      const rightKneeAngle = calculateAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle);
      if (leftKneeAngle === null && rightKneeAngle === null) { setFormFeedback('Legs not visible'); return; }
      const avgKneeAngle = leftKneeAngle !== null && rightKneeAngle !== null
        ? (leftKneeAngle + rightKneeAngle) / 2
        : (leftKneeAngle ?? rightKneeAngle ?? 0);

      // Phase: start standing (up), bend down (<100°), return up (>160°) = 1 rep
      if (exercisePhaseRef.current === 'up' && avgKneeAngle < 100) {
        exercisePhaseRef.current = 'down';
        setFormFeedback('Good depth! ✓');
      } else if (exercisePhaseRef.current === 'down' && avgKneeAngle > 160) {
        registerRep();
      }

    } else {
      // 💪 ARM LOGIC — Shoulder-Elbow-Wrist angle
      const leftElbowAngle = calculateAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
      const rightElbowAngle = calculateAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist);
      if (leftElbowAngle === null && rightElbowAngle === null) { setFormFeedback('Arms not visible'); return; }
      const avgElbowAngle = leftElbowAngle !== null && rightElbowAngle !== null
        ? (leftElbowAngle + rightElbowAngle) / 2
        : (leftElbowAngle ?? rightElbowAngle ?? 0);

      const lW = pose.leftWrist?.conf > 0.3 ? pose.leftWrist.y : null;
      const rW = pose.rightWrist?.conf > 0.3 ? pose.rightWrist.y : null;
      const avgWristY = lW !== null && rW !== null ? (lW + rW) / 2 : (lW ?? rW ?? 0);

      const lE = pose.leftElbow?.conf > 0.3 ? pose.leftElbow.y : null;
      const rE = pose.rightElbow?.conf > 0.3 ? pose.rightElbow.y : null;
      const avgElbowY = lE !== null && rE !== null ? (lE + rE) / 2 : (lE ?? rE ?? 0);

      const lS = pose.leftShoulder?.conf > 0.3 ? pose.leftShoulder.y : null;
      const rS = pose.rightShoulder?.conf > 0.3 ? pose.rightShoulder.y : null;
      const avgShoulderY = lS !== null && rS !== null ? (lS + rS) / 2 : (lS ?? rS ?? 0);

      // Enforce strict vertical posture heuristics
      if (isPushUp || isDip) {
        if (avgWristY < avgElbowY) { setFormFeedback('Keep hands lower!'); return; }
        if (exercisePhaseRef.current === 'up' && avgElbowAngle < 90) {
          exercisePhaseRef.current = 'down'; setFormFeedback('Go lower! ✓');
        } else if (exercisePhaseRef.current === 'down' && avgElbowAngle > 145) {
          registerRep();
        }
      } else if (isBenchPress) {
        if (avgWristY > avgElbowY) { setFormFeedback('Push upwards!'); return; }
        if (exercisePhaseRef.current === 'up' && avgElbowAngle < 90) {
          exercisePhaseRef.current = 'down'; setFormFeedback('Lower weight! ✓');
        } else if (exercisePhaseRef.current === 'down' && avgElbowAngle > 145) {
          registerRep();
        }
      } else if (isPullUp) {
        if (avgWristY > avgShoulderY) { setFormFeedback('Reach higher!'); return; }
        if (exercisePhaseRef.current === 'down' && avgElbowAngle < 90) {
          exercisePhaseRef.current = 'up'; setFormFeedback('Pull up! ✓');
        } else if (exercisePhaseRef.current === 'up' && avgElbowAngle > 140) {
          registerRep();
        }
      } else if (isRow) {
        if (exercisePhaseRef.current === 'down' && avgElbowAngle < 100) {
          exercisePhaseRef.current = 'up'; setFormFeedback('Pull back! ✓');
        } else if (exercisePhaseRef.current === 'up' && avgElbowAngle > 140) {
          registerRep();
        }
      } else if (isCurl) {
        if (avgElbowY < avgShoulderY) { setFormFeedback('Keep elbows down!'); return; }
        if (exercisePhaseRef.current === 'down' && avgElbowAngle < 60) {
          if (avgWristY > avgElbowY) { setFormFeedback('Curl all the way!'); return; }
          exercisePhaseRef.current = 'up'; setFormFeedback('Full squeeze! ✓');
        } else if (exercisePhaseRef.current === 'up' && avgElbowAngle > 140) {
          registerRep();
        }
      } else {
        // Generic Push/Pull fallback
        if (isPushExercise) {
          if (exercisePhaseRef.current === 'up' && avgElbowAngle < 90) {
            exercisePhaseRef.current = 'down'; setFormFeedback('Go lower! ✓');
          } else if (exercisePhaseRef.current === 'down' && avgElbowAngle > 145) {
            registerRep();
          }
        } else {
          if (exercisePhaseRef.current === 'down' && avgElbowAngle < 60) {
            exercisePhaseRef.current = 'up'; setFormFeedback('Full squeeze! ✓');
          } else if (exercisePhaseRef.current === 'up' && avgElbowAngle > 140) {
            registerRep();
          }
        }
      }
    }
  }, [pose, isWorkoutStarted, isFinished]);

  const registerRep = () => {
    if (hasFinishedRef.current) return; // Guard: don't count reps after set is done

    const newReps = repsRef.current + 1;
    repsRef.current = newReps;
    setReps(newReps);

    const name = exerciseName.toUpperCase();
    const isLeg = name.includes('SQUAT') || name.includes('LUNGE') || name.includes('LEG') || name.includes('CALF') || name.includes('DEADLIFT') || name.includes('GLUTE') || name.includes('EXTENSION');
    const isPushUp = name.includes('PUSH UP');
    const isBenchPress = name.includes('BENCH');
    const isDip = name.includes('DIP');
    const isPush = name.includes('PUSH') || name.includes('BENCH') || name.includes('DIP') || name.includes('PRESS') || name.includes('CHEST');

    // Reset phase for the next rep
    if (isLeg) {
      exercisePhaseRef.current = 'up'; // standing is the start of leg exercises
    } else if (isPushUp || isBenchPress || isDip || isPush) {
      exercisePhaseRef.current = 'up'; // extended arms is the start of push exercises
    } else {
      exercisePhaseRef.current = 'down'; // arms down is the start of curl/pull exercises
    }
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

  const handleSetFinished = async () => {
    if (hasFinishedRef.current) return; // prevent duplicate calls
    hasFinishedRef.current = true;
    setIsWorkoutStarted(false);
    setIsFinished(true);
    setMyTime(time);

    // 🔴 BROADCAST FINISH TO OPPONENT
    channelRef.current?.send({
      type: 'broadcast',
      event: 'FINISHED_SET',
      payload: { time: time }
    });

    const isLastSet = Number(currentSet) >= Number(targetSets);

    // Save to database
    try {
      const fieldReps = isPlayer1 ? 'player1_reps' : 'player2_reps';
      const fieldSets = isPlayer1 ? 'player1_sets' : 'player2_sets';
      const fieldTime = isPlayer1 ? 'player1_time' : 'player2_time';

      await supabase
        .from('versus_battles')
        .update({
          [fieldReps]: targetReps,
          [fieldSets]: Number(currentSet),
          [fieldTime]: time,
          ...(isLastSet ? { status: 'active' } : {}) // Mark as active (not 'waiting') until both done
        })
        .eq('id', matchId);

    } catch (e) {
      console.log('Error saving set data', e);
    }
  };

  const determineAndSaveWinner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // WAIT until both players' set counts are saved to DB (poll with retries)
      let match: any = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase
          .from('versus_battles')
          .select('*')
          .eq('id', matchId)
          .single();

        // Both players must have their final set data written
        if (data && (data.player1_sets > 0 || data.player1_time > 0) && (data.player2_sets > 0 || data.player2_time > 0)) {
          match = data;
          break;
        }

        console.log(`Waiting for both players' data... attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (!match) {
        const { data } = await supabase.from('versus_battles').select('*').eq('id', matchId).single();
        match = data;
      }
      if (!match) return;

      // COMPLETION-BASED WIN LOGIC
      const p1Completed = (match.player1_sets || 0) >= (match.target_sets || 1);
      const p2Completed = (match.player2_sets || 0) >= (match.target_sets || 1);

      let winnerId: string | null = null;
      let matchStatus = 'completed';
      let myXp = 0;

      if (p1Completed && p2Completed) {
        // Both completed all sets — both win!
        winnerId = null;
        matchStatus = 'both_won';
        myXp = 150;
      } else if (!p1Completed && !p2Completed) {
        // Neither completed — both lose
        winnerId = null;
        matchStatus = 'both_lost';
        myXp = 25;
      } else {
        // Only one completed — they win
        winnerId = p1Completed ? match.player1_id : match.player2_id;
        matchStatus = 'completed';
        const iWon = winnerId === user.id;
        myXp = iWon ? 150 : 50;
      }

      const iWon = matchStatus === 'both_won' || winnerId === user.id;

      // Only player1 writes the result to avoid race conditions
      if (isPlayer1) {
        await supabase
          .from('versus_battles')
          .update({
            winner_id: winnerId,
            status: matchStatus,
          })
          .eq('id', matchId);
        console.log('✅ Result saved:', matchStatus);
      } else {
        // Player 2: wait briefly for Player 1 to write the result
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 💰 SAVE XP TO DATABASE
      const xpField = isPlayer1 ? 'player1_xp' : 'player2_xp';
      await supabase
        .from('versus_battles')
        .update({ [xpField]: myXp })
        .eq('id', matchId);

      // Add XP to user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();

      // Fetch opponent username
      const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
      const { data: oppProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', opponentId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp: (profile.xp || 0) + myXp })
          .eq('id', user.id);
        console.log(`💰 Added ${myXp} XP to profile (total: ${(profile.xp || 0) + myXp})`);

        // Send match result notification
        const resultLabel = matchStatus === 'both_won' ? 'Match Tied (Both Won)' : iWon ? 'Victory' : 'Defeat';
        const resultEmoji = iWon ? '🏆' : '💀';
        await supabase.from('notifications').insert([{
          user_id: user.id,
          title: `${resultEmoji} Match Result: ${resultLabel}`,
          message: `Your ${exerciseName} match against ${oppProfile?.username || 'Opponent'} is complete. You earned ${myXp} XP!`,
          metadata: { match_id: matchId, type: 'match_result', status: matchStatus },
        }]);

        // Check for leaderboard rank notification
        await checkAndNotifyRank(user.id);
      }

      const totalSecs = myTime;
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const durStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      let statusText = 'DEFEAT';
      if (matchStatus === 'both_won') statusText = 'BOTH WON';
      else if (matchStatus === 'both_lost') statusText = 'BOTH LOST';
      else if (iWon) statusText = 'VICTORY';

      setChallengeData({
        status: statusText,
        exerciseName: exerciseName,
        reps: targetReps,
        sets: targetSets,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        duration: durStr,
        opponent: oppProfile?.username || 'Opponent',
        xp: myXp,
      });
      setShowResultModal(false);
      setShowChallengeModal(true);

    } catch (err) {
      console.log('Error determining winner:', err);
    }
  };

  const handleNextStep = () => {
    setShowResultModal(false);
    const cSet = Number(currentSet) || 1;
    const tSets = Number(targetSets) || 1;

    if (cSet < tSets) {
      navigation.replace('LiveVersusRoutine', {
        matchId,
        isPlayer1,
        currentSet: cSet + 1
      });
    } else {
      // If opponent forfeited during "Continue", skip normal flow → direct victory
      if (opponentForfeited) {
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const myUserId = user.id;

            const victoryXp = 150;
            const xpField = isPlayer1 ? 'player1_xp' : 'player2_xp';
            await supabase.from('versus_battles').update({ [xpField]: victoryXp }).eq('id', matchId);

            const { data: profile } = await supabase.from('profiles').select('xp').eq('id', myUserId).single();
            if (profile) {
              await supabase.from('profiles').update({ xp: (profile.xp || 0) + victoryXp }).eq('id', myUserId);
            }

            const totalSecs = time;
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;
            const durStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            setChallengeData({
              status: 'VICTORY',
              exerciseName: exerciseName,
              reps: targetReps,
              sets: targetSets,
              date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
              duration: durStr,
              opponent: 'Forfeited',
              xp: victoryXp,
            });
            setShowChallengeModal(true);
          } catch (err) {
            console.error('Victory after continue error:', err);
            navigation.reset({ index: 0, routes: [{ name: 'VersusWorkoutScreen' }] });
          }
        })();
      } else {
        // Last set done — determine winner based on completion!
        determineAndSaveWinner();
      }
    }
  };

  useEffect(() => {
    // Show result modal when both finished OR when user finished and opponent forfeited
    if (isFinished && (opponentFinished || opponentForfeited)) {
      setShowResultModal(true);
    }
  }, [isFinished, opponentFinished, opponentForfeited]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const drawLine = (p1: Point, p2: Point) => {
    if (p1.conf < 0.15 || p2.conf < 0.15) return null;
    return <Line key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="2" />;
  };

  return (
    <View style={styles.container}>
      {/* CAMERA */}
      {localStream ? (
        <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror={cameraFacing === 'front'} />
      ) : (
        <View style={styles.cameraPlaceholder}><Text style={{ color: 'white' }}>Connecting to Camera...</Text></View>
      )}

      {/* SKELETON OVERLAY */}
      {pose && (
        <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {drawLine(pose.leftShoulder, pose.rightShoulder)}
          {drawLine(pose.leftShoulder, pose.leftElbow)}
          {drawLine(pose.leftElbow, pose.leftWrist)}
          {drawLine(pose.rightShoulder, pose.rightElbow)}
          {drawLine(pose.rightElbow, pose.rightWrist)}

          {/* Torso & Legs */}
          {drawLine(pose.leftShoulder, pose.leftHip)}
          {drawLine(pose.rightShoulder, pose.rightHip)}
          {drawLine(pose.leftHip, pose.rightHip)}
          {drawLine(pose.leftHip, pose.leftKnee)}
          {drawLine(pose.leftKnee, pose.leftAnkle)}
          {drawLine(pose.rightHip, pose.rightKnee)}
          {drawLine(pose.rightKnee, pose.rightAnkle)}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 10, marginRight: 4 }}>❤️</Text>
              <Text style={{ color: '#FF4444', fontSize: 12, fontFamily: 'Barlow-Bold' }}>
                {displayHR !== null ? `${displayHR} BPM` : '-- BPM'}
              </Text>
            </View>
            <Text style={styles.timerText}>{formatTime(time)}</Text>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>OPPONENT</Text>
            <Text style={styles.scoreNumberOpponent}>{opponentReps} <Text style={styles.targetText}>/ {targetReps}</Text></Text>
          </View>

        </LinearGradient>
      </View>

      {/* 🔴 AUTOMATIC COUNTDOWN OVERLAY 🔴 */}
      {showCountdown && isServerReady && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>
            {countdown > 0 ? countdown : 'GO!'}
          </Text>
          <Text style={styles.countdownSubText}>Get into position</Text>
        </View>
      )}

      {/* 🔄 SERVER LOADING OVERLAY 🔄 */}
      {!isServerReady && (
        <View style={styles.countdownOverlay}>
          <ActivityIndicator size="large" color="#CCFF00" />
          <Text style={[styles.countdownSubText, { marginTop: 20 }]}>Activating Wobby Spotter...</Text>
          <Text style={{ color: '#888', fontSize: 12, fontFamily: 'Montserrat-Medium', marginTop: 10 }}>Your form tracker is warming up</Text>
        </View>
      )}

      {/* IN-WORKOUT FEEDBACK */}
      {isWorkoutStarted && !showCountdown && (
        <View style={styles.feedbackOverlay}>
          <Text style={styles.feedbackText}>{formFeedback}</Text>
        </View>
      )}

      {/* ⏳ WAITING FOR OPPONENT OVERLAY ⏳ */}
      {isFinished && !opponentFinished && (
        <View style={styles.countdownOverlay}>
          <ActivityIndicator size="large" color="#CCFF00" />
          <Text style={[styles.countdownSubText, { marginTop: 20 }]}>Waiting for Opponent...</Text>
          <Text style={{ color: '#888', marginTop: 10 }}>Your Time: {myTime}s</Text>
        </View>
      )}

      {/* 🏆 SET RESULTS MODAL 🏆 */}
      <Modal visible={showResultModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1A1D12', '#2A2E1A']} style={styles.resultContainer}>
            <Text style={styles.resultTitle}>SET {currentSet} COMPLETE</Text>

            <View style={styles.resultRow}>
              <View style={styles.resultCol}>
                <Text style={styles.resultName}>YOU</Text>
                <Text style={[styles.resultTime, { color: reps >= targetReps ? '#CCFF00' : '#FF4444' }]}>
                  {reps >= targetReps ? 'COMPLETED ✓' : `${reps}/${targetReps}`}
                </Text>
              </View>
              <View style={styles.vsCircle}>
                <Text style={styles.resultVs}>VS</Text>
              </View>
              <View style={styles.resultCol}>
                <Text style={styles.resultName}>OPPONENT</Text>
                <Text style={[styles.resultTime, { color: opponentReps >= targetReps ? '#CCFF00' : '#FF4444' }]}>
                  {opponentReps >= targetReps ? 'COMPLETED ✓' : `${opponentReps}/${targetReps}`}
                </Text>
              </View>
            </View>

            <Text style={[styles.winnerMsg, { color: reps >= targetReps ? '#CCFF00' : '#FF4444' }]}>
              {reps >= targetReps ? 'SET COMPLETED! 🎉' : 'SET INCOMPLETE 📉'}
            </Text>

            <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
              <Text style={styles.nextButtonText}>
                {currentSet < targetSets ? 'START NEXT SET' : 'FINISH WORKOUT'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* 🏳️ OPPONENT FORFEIT MODAL 🏳️ */}
      <Modal visible={showForfeitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1A1D12', '#2A2E1A']} style={styles.resultContainer}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🏳️</Text>
            <Text style={[styles.resultTitle, { color: '#CCFF00' }]}>OPPONENT FORFEITED</Text>
            <Text style={{ color: '#AAAAAA', fontSize: 14, fontFamily: 'Montserrat-Regular', textAlign: 'center', marginBottom: 30, marginTop: 10 }}>
              Your opponent has forfeited the match!{"\n"}What would you like to do?
            </Text>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: '#CCFF00', marginBottom: 12, width: '100%' }]}
              onPress={() => {
                // Continue working out solo
                setShowForfeitModal(false);
                // Opponent score freezes, user continues normally
              }}
            >
              <Text style={[styles.nextButtonText, { textAlign: 'center' }]}>CONTINUE WORKOUT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: '#34D399', width: '100%' }]}
              onPress={async () => {
                // Accept Victory — immediately finish
                setShowForfeitModal(false);
                setIsWorkoutStarted(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                stopWebRTC();

                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const myUserId = user.id;

                  // Save current progress
                  const fieldReps = isPlayer1 ? 'player1_reps' : 'player2_reps';
                  const fieldSets = isPlayer1 ? 'player1_sets' : 'player2_sets';
                  const fieldTime = isPlayer1 ? 'player1_time' : 'player2_time';

                  await supabase
                    .from('versus_battles')
                    .update({
                      [fieldReps]: reps,
                      [fieldSets]: Number(currentSet),
                      [fieldTime]: time,
                      status: 'forfeited',
                      winner_id: myUserId,
                    })
                    .eq('id', matchId);

                  // Award victory XP
                  const victoryXp = 150;
                  const xpField = isPlayer1 ? 'player1_xp' : 'player2_xp';
                  await supabase.from('versus_battles').update({ [xpField]: victoryXp }).eq('id', matchId);

                  const { data: profile } = await supabase.from('profiles').select('xp').eq('id', myUserId).single();
                  if (profile) {
                    await supabase.from('profiles').update({ xp: (profile.xp || 0) + victoryXp }).eq('id', myUserId);
                  }

                  const totalSecs = time;
                  const hrs = Math.floor(totalSecs / 3600);
                  const mins = Math.floor((totalSecs % 3600) / 60);
                  const secs = totalSecs % 60;
                  const durStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                  setChallengeData({
                    status: 'VICTORY',
                    exerciseName: exerciseName,
                    reps: targetReps,
                    sets: targetSets,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
                    duration: durStr,
                    opponent: 'Forfeited',
                    xp: victoryXp,
                  });
                  setShowChallengeModal(true);
                } catch (err) {
                  console.error('Accept victory error:', err);
                  navigation.reset({ index: 0, routes: [{ name: 'VersusWorkoutScreen' }] });
                }
              }}
            >
              <Text style={[styles.nextButtonText, { textAlign: 'center' }]}>🏆 ACCEPT VICTORY</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* 🏆 FINAL MATCH RESULT - Uses teammate's ChallengeModal 🏆 */}
      <ChallengeModal
        visible={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          navigation.reset({ index: 0, routes: [{ name: 'VersusWorkoutScreen' }] });
        }}
        data={challengeData}
      />
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

  countdownOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  countdownText: { color: '#CCFF00', fontSize: 120, fontFamily: 'Montserrat-Black', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
  countdownSubText: { color: '#FFF', fontSize: 24, fontFamily: 'Montserrat-Bold', marginTop: 10 },

  feedbackOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' },
  feedbackText: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#CCFF00', fontSize: 24, fontFamily: 'Montserrat-Bold', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, overflow: 'hidden' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  resultContainer: { width: '90%', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#CCFF00' },
  resultTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Montserrat-Black', marginBottom: 30 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 30 },
  resultCol: { alignItems: 'center' },
  resultName: { color: '#888', fontSize: 14, fontFamily: 'Montserrat-Bold', marginBottom: 10 },
  resultTime: { color: '#FFF', fontSize: 32, fontFamily: 'Montserrat-Black' },
  vsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  resultVs: { color: '#CCFF00', fontSize: 18, fontFamily: 'Montserrat-Black' },
  winnerMsg: { fontSize: 20, fontFamily: 'Montserrat-Bold', textAlign: 'center', marginBottom: 40 },
  nextButton: { backgroundColor: '#CCFF00', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  nextButtonText: { color: '#000', fontSize: 18, fontFamily: 'Montserrat-Black' }
});