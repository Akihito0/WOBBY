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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Set your Mapbox public token here
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface RunMetrics {
  distance: number; // km
  pace: string; // min'sec"
  elevation: {
    gain: number;
    loss: number;
  };
  time: number; // seconds
}

interface UserRunData {
  userId: string;
  username: string;
  metrics: RunMetrics;
  coordinates: Coordinate[];
}

// Helper functions
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
    if (coords[i].altitude && coords[i - 1].altitude) {
      const diff = coords[i].altitude - coords[i - 1].altitude;
      if (diff > 0) gain += diff;
    }
  }
  return Math.round(gain);
};

const VersusRunScreen = ({ navigation, route }: any) => {
  const [runState, setRunState] = useState<'idle' | 'running' | 'paused' | 'finished'>('running');
  const [time, setTime] = useState(0);
  const [userCoordinates, setUserCoordinates] = useState<Coordinate[]>([]);
  const [opponentCoordinates, setOpponentCoordinates] = useState<Coordinate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [opponentTime, setOpponentTime] = useState(0);

  const locationSubscriptionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Initialize location tracking and realtime subscription
  useEffect(() => {
    startLocationTracking();
    subscribeToOpponentUpdates();
    return () => {
      stopLocationTracking();
      unsubscribeFromOpponentUpdates();
    };
  }, []);

  // Timer for opponent elapsed time
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

  const subscribeToOpponentUpdates = () => {
    if (!route.params?.opponentId) return;

    const opponentId = route.params.opponentId;
    const channel = supabase.channel(`versus_run:${opponentId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'versus_run_tracking',
          filter: `user_id=eq.${opponentId}`,
        },
        (payload) => {
          const data = payload.new as any;
          setOpponentCoordinates(prev => [
            ...prev,
            {
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.altitude,
            }
          ]);
          setOpponentTime(data.elapsed_time || 0);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const unsubscribeFromOpponentUpdates = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
  };

  // Save user location to versus_run_tracking table for opponent to see
  const publishUserLocation = async (coord: Coordinate) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      await supabase
        .from('versus_run_tracking')
        .insert([
          {
            user_id: session.user.id,
            match_id: route.params?.matchId,
            latitude: coord.latitude,
            longitude: coord.longitude,
            altitude: coord.altitude,
            elapsed_time: time,
          }
        ]);
    } catch (error) {
      console.error('Error publishing location:', error);
    }
  };

  // Timer for elapsed time
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
      if (status !== 'granted') {
        console.log('Permission denied');
        return;
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const coord: Coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || undefined,
          };
          setUserCoordinates(prev => [...prev, coord]);
          // Publish location for opponent to see in real-time
          publishUserLocation(coord);
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const userMetrics: RunMetrics = {
    distance: calcDistance(userCoordinates),
    pace: calcPace(calcDistance(userCoordinates), time),
    elevation: {
      gain: calcElevationGain(userCoordinates),
      loss: 0,
    },
    time,
  };

  const opponentMetrics: RunMetrics = {
    distance: calcDistance(opponentCoordinates),
    pace: calcPace(calcDistance(opponentCoordinates), opponentTime),
    elevation: {
      gain: calcElevationGain(opponentCoordinates),
      loss: 0,
    },
    time: opponentTime,
  };

  // Determine who's ahead
  const userAhead = userMetrics.distance > opponentMetrics.distance;
  const distanceDiff = Math.abs(userMetrics.distance - opponentMetrics.distance);



  const handleFinishRun = async () => {
    setIsSaving(true);
    setRunState('finished');
    
    // Save run to Supabase
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user. Please try again.');
        setIsSaving(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();

      const runData = {
        user_id: userId,
        title: 'Versus Run',
        description: `Ran against ${route.params?.opponentUsername || 'Runner_Pro'}`,
        distance: userMetrics.distance,
        duration: userMetrics.time,
        pace: userMetrics.pace,
        elevation_gain: userMetrics.elevation.gain,
        elevation_loss: userMetrics.elevation.loss,
        min_elevation: 0,
        max_elevation: 0,
        average_elevation: 0,
        route_coordinates: userCoordinates,
        route_map_url: null,
        media_urls: [],
        workout_type: 'versus_run',
        started_at: new Date(now.getTime() - userMetrics.time * 1000).toISOString(),
        completed_at: now.toISOString(),
        created_at: now.toISOString(),
      };

      const { data, error } = await supabase
        .from('runs')
        .insert([runData])
        .select();

      if (error) {
        console.error('Error saving versus run:', error);
        Alert.alert('Error', 'Failed to save run. Please try again.');
        setIsSaving(false);
        return;
      }

      console.log('✅ Versus run saved successfully!');
      Alert.alert('Success! 🏃', 'Your versus run has been saved!');

      // Navigate back after a short delay
      setIsSaving(false);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error in handleFinishRun:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Competitive Status Bar */}
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

      {/* Main Metrics Comparison */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Time and Distance - Both Users */}
        <View style={styles.timeDistanceRow}>
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.metricCard, styles.userCard]}
          >
            <Text style={styles.userLabel}>YOU</Text>
            <Text style={styles.largeValue}>{formatTime(userMetrics.time)}</Text>
            <Text style={styles.distanceValue}>{userMetrics.distance.toFixed(2)} km</Text>
          </LinearGradient>

          <View style={styles.divider} />

          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.metricCard, styles.opponentCard]}
          >
            <Text style={styles.opponentLabel}>OPPONENT</Text>
            <Text style={styles.largeValue}>{formatTime(opponentMetrics.time)}</Text>
            <Text style={styles.distanceValue}>{opponentMetrics.distance.toFixed(2)} km</Text>
          </LinearGradient>
        </View>

        {/* Pacing Details */}
        <LinearGradient
          colors={['#0f1a0a', '#1a2915']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailsCard}
        >
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

        {/* Elevation Details */}
        <LinearGradient
          colors={['#1a0f0f', '#2a1515']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailsCard}
        >
          <Text style={styles.detailsTitle}>ELEVATION</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Elevation Gain</Text>
              <Text style={styles.metricValueLarge}>{userMetrics.elevation.gain} m</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Opponent Gain</Text>
              <Text style={styles.metricValueLarge}>{opponentMetrics.elevation.gain} m</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Distance Progress Bars */}
        <View style={styles.progressSection}>
          {/* User Distance Progress */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Distance</Text>
              <Text style={styles.progressValue}>{userMetrics.distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={['#34D399', '#5EE7DF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBar,
                  { width: `${Math.min((userMetrics.distance / 5) * 100, 100)}%` }
                ]}
              />
            </View>
          </View>

          {/* Opponent Distance Progress */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Opponent Distance</Text>
              <Text style={styles.progressValue}>{opponentMetrics.distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={['#6B7280', '#9CA3AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBar,
                  { width: `${Math.min((opponentMetrics.distance / 5) * 100, 100)}%` }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Map Section */}
        {userCoordinates.length > 0 && (
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>LIVE ROUTE</Text>
            <MapboxGL.MapView
              style={styles.map}
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
                animationDuration={1000}
              />

              {/* User Route Line */}
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
                    style={{
                      lineColor: '#34D399',
                      lineWidth: 4,
                      lineOpacity: 0.8,
                    }}
                  />
                </MapboxGL.ShapeSource>
              )}

              {/* User Current Position - Privacy: Only show user's location */}
              {userCoordinates.length > 0 && (
                <MapboxGL.PointAnnotation
                  id="user-location"
                  coordinate={[
                    userCoordinates[userCoordinates.length - 1].longitude,
                    userCoordinates[userCoordinates.length - 1].latitude,
                  ]}
                >
                  <View style={styles.userLocationDot} />
                </MapboxGL.PointAnnotation>
              )}
            </MapboxGL.MapView>
          </View>
        )}
      </ScrollView>

      {/* Bottom Control Buttons */}
      <View style={styles.bottomControls}>
        {runState === 'running' && (
          <>
            <TouchableOpacity
              onPress={() => setRunState(runState === 'running' ? 'paused' : 'running')}
              style={styles.pauseButton}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>
                {runState === 'running' ? 'PAUSE' : 'RESUME'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFinishRun}
              style={[styles.finishButton, isSaving && styles.savingButton]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#121310" size="small" />
              ) : (
                <Text style={styles.finishButtonText}>FINISH RUN</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
  },
  header: {
    paddingTop: 65,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  backBtn: {
    width: 30,
    height: 30,
    marginRight: 20,
  },
  headerTitle: {
    color: '#d1d1d1',
    fontSize: 28,
    fontFamily: 'Montserrat-Black',
  },
  statusBar: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statusContainer: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statusText: {
    color: '#34D399',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  leadingText: {
    color: '#34D399',
  },
  gapText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Barlow-Regular',
    marginTop: 4,
  },
  gapText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Barlow-Regular',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  timeDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricCard: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
  },
  userCard: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
  },
  opponentCard: {
    flex: 1,
    borderRightWidth: 3,
    borderRightColor: '#2196F3',
  },
  divider: {
    width: 1,
    height: 80,
    backgroundColor: '#333333',
    marginHorizontal: 10,
  },
  userLabel: {
    color: '#34D399',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  opponentLabel: {
    color: '#2196F3',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  largeValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Barlow-Bold',
    marginBottom: 8,
  },
  distanceValue: {
    color: '#A3CF06',
    fontSize: 18,
    fontFamily: 'Barlow-Bold',
  },
  detailsCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  singleMetricRow: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#333333',
    marginHorizontal: 10,
  },
  metricLabel: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    marginBottom: 8,
  },
  metricValueLarge: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Barlow-Bold',
    marginBottom: 4,
  },
  metricUnit: {
    color: '#666666',
    fontSize: 10,
    fontFamily: 'Barlow-Regular',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressItem: {
    marginBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
  },
  progressValue: {
    color: '#A3CF06',
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
  },
  progressBarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    height: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
  },
  mapSection: {
    marginBottom: 20,
  },
  mapTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: 'white',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(18, 19, 16, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    gap: 10,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#A3CF06',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  savingButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
  finishButtonText: {
    color: '#121310',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
});

export default VersusRunScreen;
