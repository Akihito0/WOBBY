import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { uploadMapSnapshot } from '../services/runUpload';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uriToBase64 = async (uri: string): Promise<string | null> => {
  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Failed to read blob as data URL"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  } catch (error) {
    console.error('Error in uriToBase64:', error);
    return null;
  }
};

const getBounds = (coords: Coordinate[]): [[number, number], [number, number]] => {
  const lats = coords.map(c => c.latitude);
  const lngs = coords.map(c => c.longitude);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const MIN_DELTA = 0.005; 
  
  if (maxLat - minLat < MIN_DELTA) {
    const centerLat = (maxLat + minLat) / 2;
    minLat = centerLat - (MIN_DELTA / 2);
    maxLat = centerLat + (MIN_DELTA / 2);
  }
  if (maxLng - minLng < MIN_DELTA) {
    const centerLng = (maxLng + minLng) / 2;
    minLng = centerLng - (MIN_DELTA / 2);
    maxLng = centerLng + (MIN_DELTA / 2);
  }

  return [[maxLng, maxLat], [minLng, minLat]];
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface RunMetrics {
  distance: number; 
  pace: string; 
  elevation: {
    gain: number;
    loss: number;
  };
  time: number; 
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const calcDistance = (coords: Coordinate[]): number => {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const R = 6371;
    const dLat = ((coords[i].latitude - coords[i - 1].latitude) * Math.PI) / 180;
    const dLon = ((coords[i].longitude - coords[i - 1].longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((coords[i - 1].latitude * Math.PI) / 180) *
        Math.cos((coords[i].latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
};

const calcPace = (distanceKm: number, seconds: number): string => {
  if (distanceKm === 0 || seconds === 0) return '--\'--"';
  const paceSeconds = (seconds / 60) / distanceKm;
  const pm = Math.floor(paceSeconds);
  const ps = Math.round((paceSeconds - pm) * 60);
  return `${pm}'${String(ps).padStart(2, '0')}"`;
};

const calcElevationGain = (coords: Coordinate[]): number => {
  if (coords.length < 2) return 0;
  let gain = 0;
  for (let i = 1; i < coords.length; i++) {
    if (coords[i].altitude !== undefined && coords[i - 1].altitude !== undefined) {
      const diff = coords[i].altitude! - coords[i - 1].altitude!;
      if (diff > 0) gain += diff;
    }
  }
  return Math.round(gain);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const VersusRunScreen = ({ navigation, route }: any) => {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [runState, setRunState] = useState<'idle' | 'running' | 'paused' | 'finished'>('running');
  const [time, setTime] = useState(0);
  const [userCoordinates, setUserCoordinates] = useState<Coordinate[]>([]);
  const [opponentCoordinates, setOpponentCoordinates] = useState<Coordinate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [opponentTime, setOpponentTime] = useState(0);
  const [targetDistance] = useState(route.params?.targetDistance || 1);
  const [userReachedTarget, setUserReachedTarget] = useState(false);
  const [opponentReachedTarget, setOpponentReachedTarget] = useState(false);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [raceResult, setRaceResult] = useState<{winner: string; reason: string} | null>(null);

  const locationSubscriptionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const mapViewRef = useRef<MapboxGL.MapView>(null);

  // FIXED: Added timeRef to prevent stale closures in location callbacks
  const timeRef = useRef(0);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    startLocationTracking();
    subscribeToOpponentUpdates();
    return () => {
      stopLocationTracking();
      unsubscribeFromOpponentUpdates();
    };
  }, []);

  useEffect(() => {
    if (runState === 'running') {
      opponentTimerRef.current = setInterval(() => {
        setOpponentTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
    };
  }, [runState]);

  useEffect(() => {
    const currentDistance = calcDistance(userCoordinates);
    if (currentDistance >= targetDistance && !userReachedTarget) {
      setUserReachedTarget(true);
      Alert.alert('🎯 Target Reached!', `You reached ${targetDistance}km!`);
    }
  }, [userCoordinates, targetDistance, userReachedTarget]);

  // Prevent users from leaving the screen while a run is in progress
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: {preventDefault: () => void; data: {action: any}}) => {
      // Only block if the run is still running (not finished)
      if (runState !== 'finished') {
        e.preventDefault();
        
        Alert.alert(
          '⚠️ Versus Run In Progress',
          'You are still in an active versus run. You must finish the run or the match will be forfeit. Continue running?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Forfeit & Exit',
              style: 'destructive',
              onPress: () => {
                setRunState('finished');
                navigation.dispatch(e.data.action);
              }
            }
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, runState]);

  const subscribeToOpponentUpdates = () => {
    if (!route.params?.opponentId || !route.params?.matchId) return;

    const matchId = route.params.matchId;
    const opponentId = route.params.opponentId;
    
    const channel = supabase.channel(`versus_run:${matchId}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          const data = payload.payload;
          if (data.userId === opponentId) {
            const newPoint = {
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.altitude,
            };

            setOpponentCoordinates(prev => {
              const newArr = [...prev, newPoint];
              setOpponentTime(data.elapsed_time || 0);

              const currentDistance = calcDistance(newArr);
              if (currentDistance >= targetDistance && !opponentReachedTarget) {
                setOpponentReachedTarget(true);
              }

              return newArr;
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'run_finished' },
        (payload) => {
          const data = payload.payload;
          if (data.userId === opponentId) {
            setOpponentFinished(true);
            setOpponentReachedTarget(data.reachedTarget || false);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Broadcast channel status: ${status}`);
      });

    realtimeChannelRef.current = channel;
  };

  const unsubscribeFromOpponentUpdates = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
  };

  // FIXED: Uses the persistent realtimeChannelRef.current instead of creating a new instance
  const publishUserLocation = async (coord: Coordinate) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // We must use the ALREADY SUBSCRIBED ref to send messages
      if (!session?.user?.id || !realtimeChannelRef.current) return;

      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: {
          userId: session.user.id,
          latitude: coord.latitude,
          longitude: coord.longitude,
          altitude: coord.altitude,
          elapsed_time: timeRef.current, // Uses ref to avoid stale state
          timestamp: new Date().toISOString(),
        }
      }).catch(err => {
        console.error('Error broadcasting location:', err);
      });
    } catch (error) {
      console.error('Error in publishUserLocation:', error);
    }
  };

  useEffect(() => {
    if (runState === 'running') {
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runState]);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const hasGoodAccuracy = location.coords.accuracy === null || location.coords.accuracy <= 40;
          
          if (!hasGoodAccuracy) return;

          const coord: Coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || undefined,
          };
          
          setUserCoordinates(prev => [...prev, coord]);
          publishUserLocation(coord);
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) locationSubscriptionRef.current.remove();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const userMetrics: RunMetrics = {
    distance: calcDistance(userCoordinates),
    pace: calcPace(calcDistance(userCoordinates), time),
    elevation: { gain: calcElevationGain(userCoordinates), loss: 0 },
    time,
  };

  const opponentMetrics: RunMetrics = {
    distance: calcDistance(opponentCoordinates),
    pace: calcPace(calcDistance(opponentCoordinates), opponentTime),
    elevation: { gain: calcElevationGain(opponentCoordinates), loss: 0 },
    time: opponentTime,
  };

  const userAhead = userMetrics.distance > opponentMetrics.distance;
  const distanceDiff = Math.abs(userMetrics.distance - opponentMetrics.distance);

  const buildRaceNotificationMessage = (isWinner: boolean, reachedTargetDist: boolean) => {
    if (isWinner) {
      return reachedTargetDist
        ? `You won the ${targetDistance}km versus run.`
        : `You won the versus run by distance.`;
    }

    return reachedTargetDist
      ? `You finished the ${targetDistance}km versus run, but your opponent was faster.`
      : `You forfeited the versus run and your opponent won.`;
  };

  const handleFinishRun = async () => {
    const userDistance = calcDistance(userCoordinates);
    const userReachedTargetDist = userDistance >= targetDistance;

    // If user hasn't reached target, ask for confirmation
    if (!userReachedTargetDist) {
      Alert.alert(
        '⚠️ Target Not Reached',
        `You've only covered ${userDistance.toFixed(2)}km of ${targetDistance}km. Do you want to forfeit this match?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Forfeit & Wait for Result',
            style: 'destructive',
            onPress: () => {
              performFinishRun(userReachedTargetDist);
            }
          }
        ]
      );
      return;
    }

    // User reached target, proceed directly
    performFinishRun(userReachedTargetDist);
  };

  const performFinishRun = async (userReachedTargetDist: boolean) => {
    setIsSaving(true);
    setRunState('finished');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        setIsSaving(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();

      let uploadedMapUrl = null;
      if (userCoordinates.length >= 2) {
        const bounds = getBounds(userCoordinates);
        cameraRef.current?.fitBounds(bounds[0], bounds[1], 80, 800);
        
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (mapViewRef.current) {
            const snapshotUri = await mapViewRef.current.takeSnap(true);
            if (snapshotUri && typeof snapshotUri === 'string') {
              const base64Data = await uriToBase64(snapshotUri);
              if (base64Data) {
                uploadedMapUrl = await uploadMapSnapshot(
                  userId,
                  base64Data,
                  `vs-map-${Date.now()}.png`
                );
              }
            }
          }
        } catch (snapErr) {
          console.error('Failed snapshot:', snapErr);
        }
      }

      const userDistance = calcDistance(userCoordinates);
      const opponentDistance = calcDistance(opponentCoordinates);

      let winnerId = null;
      let winnerReason = '';

      if (userReachedTargetDist && !opponentReachedTarget) {
        winnerId = userId;
        winnerReason = `Won by reaching ${targetDistance}km first!`;
      } else if (opponentReachedTarget && !userReachedTargetDist) {
        winnerId = route.params?.opponentId;
        winnerReason = 'Opponent reached target first';
      } else if (userReachedTargetDist && opponentReachedTarget) {
        winnerId = userMetrics.time < opponentTime ? userId : route.params?.opponentId;
        winnerReason = winnerId === userId ? `Won ${targetDistance}km race by time!` : 'Opponent won by time';
      } else {
        winnerId = userDistance > opponentDistance ? userId : route.params?.opponentId;
        winnerReason = winnerId === userId ? 'Won with more distance' : 'Opponent won with more distance';
      }

      let { data: resultRow } = await supabase
        .from('versus_run_results')
        .select('*')
        .eq('match_id', route.params?.matchId)
        .maybeSingle();

      const updatePayload: any = {
        winner_id: winnerId,
        completed_at: now.toISOString(),
      };

      const currentUserIsUser1 = resultRow && resultRow.user_1_id === userId;

      if (currentUserIsUser1) {
        updatePayload.user_1_distance = userDistance;
        updatePayload.user_1_time = userMetrics.time;
        updatePayload.user_1_reached_target = userReachedTargetDist;
        updatePayload.user_1_finished = true;
      } else {
        updatePayload.user_2_distance = userDistance;
        updatePayload.user_2_time = userMetrics.time;
        updatePayload.user_2_reached_target = userReachedTargetDist;
        updatePayload.user_2_finished = true;
      }

      await supabase
        .from('versus_run_results')
        .update(updatePayload)
        .eq('match_id', route.params?.matchId);

      const runData = {
        user_id: userId,
        title: `${targetDistance}km Versus Run`,
        description: `Raced against ${route.params?.opponentUsername || 'Runner_Pro'}`,
        distance: userDistance,
        duration: userMetrics.time,
        pace: userMetrics.pace,
        elevation_gain: userMetrics.elevation.gain,
        route_coordinates: userCoordinates,
        route_map_url: uploadedMapUrl,
        workout_type: 'versus_run',
        started_at: new Date(now.getTime() - userMetrics.time * 1000).toISOString(),
        completed_at: now.toISOString(),
      };

      await supabase.from('runs').insert([runData]);

      const notificationRows = [
        {
          user_id: userId,
          title: 'Versus Run Result',
          message: buildRaceNotificationMessage(winnerId === userId, userReachedTargetDist),
          metadata: {
            match_id: route.params?.matchId,
            opponent_id: route.params?.opponentId,
            winner_id: winnerId,
            reached_target: userReachedTargetDist,
            final_distance: userDistance,
            final_time: userMetrics.time,
          },
          is_read: false,
        },
      ];

      if (route.params?.opponentId) {
        notificationRows.push({
          user_id: route.params.opponentId,
          title: 'Versus Run Result',
          message: buildRaceNotificationMessage(winnerId === route.params.opponentId, opponentReachedTarget),
          metadata: {
            match_id: route.params?.matchId,
            opponent_id: userId,
            winner_id: winnerId,
            reached_target: opponentReachedTarget,
            final_distance: opponentDistance,
            final_time: opponentTime,
          },
          is_read: false,
        });
      }

      await supabase.from('notifications').insert(notificationRows);

      // Broadcast finish event to opponent
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'run_finished',
          payload: {
            userId: userId,
            reachedTarget: userReachedTargetDist,
            finalDistance: userDistance,
            finalTime: userMetrics.time,
            timestamp: new Date().toISOString(),
          }
        });
      }
      
      setRaceResult({
        winner: winnerId === userId ? 'You' : 'Opponent',
        reason: winnerReason,
      });
      
      setIsSaving(false);

      Alert.alert('Run Finished ✅', 'Result will be sent to your notifications');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#432B16', '#000000']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../assets/back0.png')} style={styles.backBtn} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VERSUS RUN</Text>
      </LinearGradient>

      <View style={styles.statusBar}>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, userAhead && styles.leadingText]}>
            {userAhead ? '🔥 LEADING' : 'BEHIND'}
          </Text>
          <Text style={styles.gapText}>
            {distanceDiff.toFixed(2)} km {userAhead ? 'ahead' : 'behind'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.timeDistanceRow}>
          <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={[styles.metricCard, styles.userCard]}>
            <Text style={styles.userLabel}>YOU</Text>
            <Text style={styles.largeValue}>{formatTime(userMetrics.time)}</Text>
            <Text style={styles.distanceValue}>{userMetrics.distance.toFixed(2)} km</Text>
          </LinearGradient>

          <View style={styles.divider} />

          <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={[styles.metricCard, styles.opponentCard]}>
            <Text style={styles.opponentLabel}>OPPONENT</Text>
            <Text style={styles.largeValue}>{formatTime(opponentMetrics.time)}</Text>
            <Text style={styles.distanceValue}>{opponentMetrics.distance.toFixed(2)} km</Text>
          </LinearGradient>
        </View>

        <LinearGradient colors={['#0f1a0a', '#1a2915']} style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>PACING</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Your Pace</Text>
              <Text style={styles.metricValueLarge}>{userMetrics.pace}</Text>
              <Text style={styles.metricUnit}>min/km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Opponent Pace</Text>
              <Text style={styles.metricValueLarge}>{opponentMetrics.pace}</Text>
              <Text style={styles.metricUnit}>min/km</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.progressSection}>
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Distance</Text>
              <Text style={styles.progressValue}>{userMetrics.distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={['#34D399', '#5EE7DF']}
                style={[styles.progressBar, { width: `${Math.min((userMetrics.distance / targetDistance) * 100, 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Opponent Distance</Text>
              <Text style={styles.progressValue}>{opponentMetrics.distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={['#6B7280', '#9CA3AF']}
                style={[styles.progressBar, { width: `${Math.min((opponentMetrics.distance / targetDistance) * 100, 100)}%` }]}
              />
            </View>
          </View>
        </View>

        {userCoordinates.length > 0 && (
          <View style={[styles.mapSection, mapExpanded && styles.mapSectionExpanded]}>
            <View style={styles.mapTitleRow}>
              <Text style={styles.mapTitle}>LIVE ROUTE</Text>
              <TouchableOpacity onPress={() => setMapExpanded(prev => !prev)} style={styles.mapExpandBtn}>
                <Text style={styles.mapExpandIcon}>{mapExpanded ? '⛶' : '⤢'}</Text>
              </TouchableOpacity>
            </View>

            <MapboxGL.MapView
              ref={mapViewRef}
              style={[styles.map, mapExpanded && styles.mapExpanded]}
              styleURL={MapboxGL.StyleURL.Dark}
              compassEnabled={false}
              logoEnabled={false}
              attributionEnabled={false}
            >
              <MapboxGL.Camera
                ref={cameraRef}
                zoomLevel={16}
                centerCoordinate={[
                  userCoordinates[userCoordinates.length - 1].longitude,
                  userCoordinates[userCoordinates.length - 1].latitude,
                ]}
                followUserLocation={runState === 'running'}
                followZoomLevel={16}
              />

              {userCoordinates.length > 1 && (
                <MapboxGL.ShapeSource
                  id="userRoute"
                  shape={{
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: userCoordinates.map(c => [c.longitude, c.latitude]),
                    },
                    properties: {},
                  }}
                >
                  <MapboxGL.LineLayer
                    id="userRouteLine"
                    style={{ lineColor: '#34D399', lineWidth: 4, lineOpacity: 0.8 }}
                  />
                </MapboxGL.ShapeSource>
              )}

              <MapboxGL.PointAnnotation
                id="user-location"
                coordinate={[
                  userCoordinates[userCoordinates.length - 1].longitude,
                  userCoordinates[userCoordinates.length - 1].latitude,
                ]}
              >
                <View style={styles.userLocationDot} />
              </MapboxGL.PointAnnotation>
            </MapboxGL.MapView>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomControls}>
        {runState === 'running' && (
          <>
            <TouchableOpacity
              onPress={() => setRunState('paused')}
              style={styles.pauseButton}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>PAUSE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFinishRun}
              style={[styles.finishButton, isSaving && styles.savingButton]}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#121310" /> : <Text style={styles.finishButtonText}>FINISH RUN</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121310' },
  header: { paddingTop: 65, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  backBtn: { width: 30, height: 30, marginRight: 20 },
  headerTitle: { color: '#d1d1d1', fontSize: 28, fontFamily: 'Montserrat-Black' },
  statusBar: { paddingHorizontal: 20, marginBottom: 15 },
  statusContainer: { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderWidth: 1, borderColor: '#34D399', borderRadius: 12, padding: 12, alignItems: 'center' },
  statusText: { color: '#34D399', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  leadingText: { color: '#34D399' },
  gapText: { color: '#888888', fontSize: 13, fontFamily: 'Barlow-Regular', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 20 },
  contentContainer: { paddingBottom: 100 },
  timeDistanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  metricCard: { borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 15 },
  userCard: { flex: 1, borderLeftWidth: 3, borderLeftColor: '#34D399' },
  opponentCard: { flex: 1, borderRightWidth: 3, borderRightColor: '#2196F3' },
  divider: { width: 1, height: 80, backgroundColor: '#333333', marginHorizontal: 10 },
  userLabel: { color: '#34D399', fontSize: 12, fontFamily: 'Montserrat-Bold', marginBottom: 8 },
  opponentLabel: { color: '#2196F3', fontSize: 12, fontFamily: 'Montserrat-Bold', marginBottom: 8 },
  largeValue: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Barlow-Bold', marginBottom: 8 },
  distanceValue: { color: '#A3CF06', fontSize: 18, fontFamily: 'Barlow-Bold' },
  detailsCard: { borderRadius: 15, padding: 20, marginBottom: 15 },
  detailsTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Montserrat-Bold', marginBottom: 15 },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, height: 60, backgroundColor: '#333333', marginHorizontal: 10 },
  metricLabel: { color: '#888888', fontSize: 12, fontFamily: 'Montserrat-Regular', marginBottom: 8 },
  metricValueLarge: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Barlow-Bold', marginBottom: 4 },
  metricUnit: { color: '#666666', fontSize: 10, fontFamily: 'Barlow-Regular' },
  progressSection: { marginBottom: 20 },
  progressItem: { marginBottom: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#CCCCCC', fontSize: 12, fontFamily: 'Montserrat-Regular' },
  progressValue: { color: '#A3CF06', fontSize: 12, fontFamily: 'Barlow-Bold' },
  progressBarContainer: { backgroundColor: '#1a1a1a', borderRadius: 8, height: 8, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 8 },
  mapSection: { marginBottom: 20 },
  mapTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mapTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  mapExpandBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#333333' },
  mapExpandIcon: { color: '#FFFFFF', fontSize: 16 },
  map: { width: '100%', height: 300, borderRadius: 15, overflow: 'hidden' },
  userLocationDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#34D399', borderWidth: 2, borderColor: 'white' },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'rgba(18, 19, 16, 0.95)', borderTopWidth: 1, borderTopColor: '#333333', flexDirection: 'row', gap: 10 },
  pauseButton: { flex: 1, backgroundColor: '#333333', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  finishButton: { flex: 1, backgroundColor: '#A3CF06', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  savingButton: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  finishButtonText: { color: '#121310', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  mapSectionExpanded: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: '#121310', paddingHorizontal: 20, paddingTop: 10 },
  mapExpanded: { height: SCREEN_HEIGHT - 200 },
});

export default VersusRunScreen;