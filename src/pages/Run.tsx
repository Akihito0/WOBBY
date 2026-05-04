import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Easing,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; // 👇 ADDED: For the expand/collapse arrow
import { supabase } from '../supabase';
import { uploadRunMedia, uploadMapSnapshot, snapRouteToRoads } from '../services/runUpload';

import { useHealth } from '../context/HealthContext';
import { getHeartRateHistory, HeartRateSample } from '../../modules/wobby-health';

import { BarChart } from 'react-native-gifted-charts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helper: Convert file URI to base64 ───────────────────────────────────────
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

// ─── Set your Mapbox public token here ───────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// ─── Types ───────────────────────────────────────────────────────────────────
type RunState = 'idle' | 'running' | 'paused' | 'finished';

interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  const paceSeconds = seconds / distanceKm;
  const pm = Math.floor(paceSeconds / 60);
  const ps = Math.round(paceSeconds % 60);
  return `${pm}'${String(ps).padStart(2, '0')}"`;
};

// Calculate elevation metrics
const calcElevationMetrics = (coords: Coordinate[]): { gain: number; loss: number; min: number; max: number } => {
  if (coords.length < 2) return { gain: 0, loss: 0, min: 0, max: 0 };

  let elevationGain = 0;
  let elevationLoss = 0;
  const validElevations = coords.filter(c => c.altitude !== undefined).map(c => c.altitude!);
  
  if (validElevations.length === 0) {
    return { gain: 0, loss: 0, min: 0, max: 0 };
  }

  for (let i = 1; i < validElevations.length; i++) {
    const diff = validElevations[i] - validElevations[i - 1];
    if (diff > 0) {
      elevationGain += diff;
    } else {
      elevationLoss += Math.abs(diff);
    }
  }

  return {
    gain: Math.round(elevationGain),
    loss: Math.round(elevationLoss),
    min: Math.round(Math.min(...validElevations)),
    max: Math.round(Math.max(...validElevations)),
  };
};

// ─── Helper: Get bounds of a route from its coordinates ─────────────────────
const getBounds = (coords: Coordinate[]): [[number, number], [number, number]] => {
  const lats = coords.map(c => c.latitude);
  const lngs = coords.map(c => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return [[maxLng, maxLat], [minLng, minLat]];
};

// ─── GpsDot animated component ───────────────────────────────────────────────
const GpsDot = ({ gpsReady, runState }: { gpsReady: boolean, runState: RunState }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (gpsReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [gpsReady]);

  let statusText = 'Acquiring GPS…';
  if (gpsReady) {
    if (runState === 'running') statusText = 'Run';
    else if (runState === 'paused') statusText = 'Paused';
    else statusText = 'GPS Acquired';
  }

  return (
    <View style={styles.gpsRow}>
      <Animated.View style={[styles.gpsDot, gpsReady ? styles.gpsDotActive : styles.gpsDotInactive, { transform: [{ scale: pulse }] }]} />
      <Text style={[styles.gpsLabel, gpsReady ? styles.gpsLabelActive : styles.gpsLabelInactive]}>
        {statusText}
      </Text>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RunScreen = ({ navigation }: any) => {
  const { heartRate: contextHR } = useHealth();
  const [activeHR, setActiveHR] = useState<number | null>(null);
  const [sessionHRData, setSessionHRData] = useState<number[]>([]);

  // State to toggle the graph visibility
  const [showHRChart, setShowHRChart] = useState(false);

  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [workoutType, setWorkoutType] = useState('Run');
  const [elevationMetrics, setElevationMetrics] = useState({ gain: 0, loss: 0, min: 0, max: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [snappedRoute, setSnappedRoute] = useState<any>(null);
  
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null); 
  const mapViewRef = useRef<MapboxGL.MapView>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let hrIntervalId: ReturnType<typeof setInterval>;

    const fetchLiveHR = async () => {
      try {
        const history: HeartRateSample[] = await getHeartRateHistory(1);
        if (history && history.length > 0) {
          const val = Math.round(history[history.length - 1].value);
          setActiveHR(val);

          if (runState === 'running') {
            setSessionHRData(prev => [...prev, val]);
          }
        }
      } catch (error) {
        console.log('Error polling HR:', error);
      }
    };

    if (runState === 'running') {
      fetchLiveHR(); 
      hrIntervalId = setInterval(fetchLiveHR, 2000); 
    }

    return () => {
      if (hrIntervalId) clearInterval(hrIntervalId);
    };
  }, [runState]);

  const displayHR = activeHR !== null ? activeHR : contextHR;

  const sessionStats = {
    avg: sessionHRData.length > 0 ? Math.round(sessionHRData.reduce((a, b) => a + b, 0) / sessionHRData.length) : 0,
    max: sessionHRData.length > 0 ? Math.max(...sessionHRData) : 0,
  };

  // ── Location Permissions and Updates ────────────────────────────────────────
  useEffect(() => {
    const startLocationUpdates = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        Alert.alert('Permission Required', 'Location access is needed to track your run.');
        return;
      }

      if (Platform.OS === 'ios') {
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status === 'granted') {
          console.log('✅ Background location permissions granted');
        }
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const coord: Coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? undefined,
        };
        setCurrentLocation(coord);
        if (!gpsReady) setGpsReady(true);
        cameraRef.current?.setCamera({
          centerCoordinate: [coord.longitude, coord.latitude],
          animationDuration: 500,
        });
      } catch (error) {
        console.error("Could not get initial position", error);
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5, 
        },
        (location) => {
          const coord: Coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? undefined,
          };
          setCurrentLocation(coord);
          if (!gpsReady) setGpsReady(true);

          if (runState === 'running') {
            const hasGoodAccuracy = location.coords.accuracy === null || location.coords.accuracy < 20;
            
            if (hasGoodAccuracy) {
              setRouteCoords(prev => {
                const updated = [...prev, coord];
                setDistance(calcDistance(updated));
                const metrics = calcElevationMetrics(updated);
                setElevationMetrics(metrics);
                return updated;
              });
            } else {
              console.warn('⚠️ GPS accuracy too low, skipping coordinate:', location.coords.accuracy, 'm');
            }
            cameraRef.current?.setCamera({
              centerCoordinate: [coord.longitude, coord.latitude],
              animationDuration: 500,
            });
          }
        }
      );
    };

    startLocationUpdates();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [runState, gpsReady]);

  // ── Timer logic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (runState === 'running') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runState]);
  
  // ── Route GeoJSON ───────────────────────────────────────────────────────────
  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null =
    routeCoords.length >= 2
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoords.map(c => [c.longitude, c.latitude]),
          },
          properties: {},
        }
      : null;

  // ── Handle Photo Selection ──────────────────────────────────────────────────
  const handleAddPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to add them to your workout.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.7,
      });

      if (!result.canceled) {
        setSelectedMedia(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeMediaItem = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // ── Save Run to Database ─────────────────────────────────────────────────────
  const saveRunToDatabase = async () => {
    if (!workoutTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your workout.');
      return;
    }

    if (distance === 0 || routeCoords.length === 0) {
      Alert.alert('Invalid Run', 'No route recorded. Please complete a run first.');
      console.warn('❌ Run validation failed:', { distance, routeCoordsLength: routeCoords.length });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user. Please try again.');
        setIsSaving(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();

      let mapUrl = '';
      let otherUrls: string[] = [];

      try {
        if (mapSnapshot && mapSnapshot.length > 0) {
          try {
            mapUrl = await uploadMapSnapshot(userId, mapSnapshot, `map-${Date.now()}.png`);
          } catch (uploadError) {
            mapUrl = '';
          }
        } else {
          mapUrl = '';
        }
      } catch (error) {
        mapUrl = '';
      }
      
      try {
        for (let i = 0; i < selectedMedia.length; i++) {
          const media = selectedMedia[i];
          try {
            const base64Data = await uriToBase64(media.uri);
            if (!base64Data || base64Data.length === 0) continue;

            const mimeType = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
            const ext = media.type === 'video' ? 'mp4' : 'jpg';
            const fileName = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            
            const mediaUrl = await uploadRunMedia(userId, base64Data, fileName, mimeType);
            otherUrls.push(mediaUrl);
          } catch (mediaError) {
            continue;
          }
        }
      } catch (error) {}

      const runData = {
        user_id: userId,
        title: workoutTitle,
        description: workoutDesc,
        distance: distance, 
        duration: elapsed, 
        pace: calcPace(distance, elapsed),
        elevation_gain: elevationMetrics.gain,
        elevation_loss: elevationMetrics.loss,
        min_elevation: elevationMetrics.min,
        max_elevation: elevationMetrics.max,
        average_elevation: elevationMetrics.min && elevationMetrics.max 
          ? Math.round((elevationMetrics.min + elevationMetrics.max) / 2)
          : 0,
        average_heart_rate: sessionStats.avg,
        max_heart_rate: sessionStats.max,
        route_coordinates: routeCoords, 
        route_map_url: mapUrl || null,
        media_urls: otherUrls,
        workout_type: workoutType,
        started_at: new Date(now.getTime() - elapsed * 1000).toISOString(),
        completed_at: now.toISOString(),
        created_at: now.toISOString(),
      };

      const { data, error } = await supabase
        .from('runs')
        .insert([runData])
        .select();

      if (error) {
        Alert.alert('Error', `Failed to save run: ${error.message}`);
        setIsSaving(false);
        return;
      }

      Alert.alert('Success! 🏃', 'Your workout has been saved to your profile.');
      handleDiscardOrSave();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsSaving(false);
    }
  };

  const handleStart = () => {
    setRunState('running');
    if (elapsed === 0) {
      setDistance(0);
      setRouteCoords([]);
      setSessionHRData([]); 
      setElevationMetrics({ gain: 0, loss: 0, min: 0, max: 0 });
    }
  };

  const handlePause = () => setRunState('paused');
  
  const handleTriggerFinish = async () => {
    setRunState('finished');
    
    if (routeCoords.length >= 2) {
      const bounds = getBounds(routeCoords);
      cameraRef.current?.fitBounds(bounds[0], bounds[1], 60, 500); 

      try {
        const MAX_WAYPOINTS = 100;
        let coordsToSnap = routeCoords;
        
        if (routeCoords.length > MAX_WAYPOINTS) {
          const step = Math.ceil(routeCoords.length / MAX_WAYPOINTS);
          coordsToSnap = routeCoords.filter((_, i) => i % step === 0);
          if (coordsToSnap[coordsToSnap.length - 1] !== routeCoords[routeCoords.length - 1]) {
            coordsToSnap.push(routeCoords[routeCoords.length - 1]);
          }
        }
  
        const snapped = await snapRouteToRoads(coordsToSnap);
        setSnappedRoute(snapped);
      } catch (error) {
        setSnappedRoute(null);
      }
    }
  
    captureAndStoreMapSnapshot();
  };

  const captureAndStoreMapSnapshot = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      if (!mapViewRef.current) {
        setMapSnapshot(null);
        return;
      }
  
      let snapshotUri: string | null = null;
      
      try {
        snapshotUri = await mapViewRef.current.takeSnap(true); 
      } catch (snapError) {
        setMapSnapshot(null);
        return;
      }
  
      if (!snapshotUri || typeof snapshotUri !== 'string') {
        setMapSnapshot(null);
        return;
      }
  
      const base64Data = await uriToBase64(snapshotUri);
  
      if (base64Data && base64Data.length > 0) {
        setMapSnapshot(base64Data);
      } else {
        setMapSnapshot(null);
      }
    } catch (error) {
      setMapSnapshot(null);
    }
  };

  const handleDiscardOrSave = () => {
    setRunState('idle');
    setElapsed(0);
    setDistance(0);
    setRouteCoords([]);
    setSessionHRData([]); 
    setShowHRChart(false); 
    setElevationMetrics({ gain: 0, loss: 0, min: 0, max: 0 });
    setWorkoutTitle('');
    setWorkoutDesc('');
    setSelectedMedia([]);
    setMapSnapshot(null);
    setSnappedRoute(null);
  };

  const pace = calcPace(distance, elapsed);
  const distanceDisplay = distance.toFixed(2);

  const chartWidth = SCREEN_WIDTH - 80;
  const barWidth = 6;
  const targetBars = 20; 
  
  const stackedData = useMemo(() => {
    if (sessionHRData.length === 0) return [];
    
    const chunkSize = Math.max(1, Math.ceil(sessionHRData.length / targetBars));
    const processed = [];
    
    for (let i = 0; i < sessionHRData.length; i += chunkSize) {
      const chunk = sessionHRData.slice(i, i + chunkSize);
      const min = Math.min(...chunk);
      const max = Math.max(...chunk);
      
      const height = Math.max(8, max - min); 
      const baseValue = Math.max(0, max - height);

      processed.push({
        stacks: [
          { value: baseValue, color: 'transparent' },
          { value: height, color: '#FF4444', borderRadius: 4, marginBottom: 2 }
        ]
      });
    }
    return processed;
  }, [sessionHRData]);

  const numBars = stackedData.length || 1;
  const availableWidth = chartWidth - 30; 
  const safeSpacing = numBars > 1 ? (availableWidth - (numBars * barWidth)) / (numBars - 1) : 0;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapViewRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={16}
          centerCoordinate={
            currentLocation
              ? [currentLocation.longitude, currentLocation.latitude]
              : undefined 
          }
          followUserLocation={runState !== 'idle'}
          followZoomLevel={16}
        />
        
        {currentLocation && (
          <MapboxGL.PointAnnotation
            id="user-location"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
          >
            <View style={styles.userLocationDot} />
          </MapboxGL.PointAnnotation>
        )}

        {routeGeoJSON && !snappedRoute && (
          <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#34D399',
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {snappedRoute && (
          <MapboxGL.ShapeSource id="snappedRouteSource" shape={snappedRoute}>
            <MapboxGL.LineLayer
              id="snappedRouteLine"
              style={{
                lineColor: '#34D399',
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.backBtnWrap} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.floatingRightControls}>
        {runState === 'running' && displayHR !== null && (
          <View style={styles.floatingHRBadge}>
            <Text style={{ fontSize: 12, marginRight: 4 }}>❤️</Text>
            <Text style={styles.floatingHRText}>{displayHR}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={() => {
            if (currentLocation) {
              cameraRef.current?.setCamera({
                centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
                zoomLevel: 16,
                animationDuration: 600,
              });
            }
          }}
        >
          <Text style={styles.recenterIcon}>◎</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomOverlayContainer}>
        
        <View style={styles.statsPanel}>
          <GpsDot gpsReady={gpsReady} runState={runState} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pace}</Text>
              <Text style={styles.statLabel}>Pace (/km)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{distanceDisplay}</Text>
              <Text style={styles.statLabel}>Distance (km)</Text>
            </View>
          </View>
          
          {(runState === 'running' || elevationMetrics.gain > 0) && (
            <>
              <View style={styles.statDivider2} />
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{elevationMetrics.gain}</Text>
                  <Text style={styles.statLabel}>Elev. Gain (m)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{elevationMetrics.min}</Text>
                  <Text style={styles.statLabel}>Min Elev. (m)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{elevationMetrics.max}</Text>
                  <Text style={styles.statLabel}>Max Elev. (m)</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomControlsBg}>
          
          {runState === 'idle' && (
            <View style={styles.idleControlsRow}>
              <TouchableOpacity style={styles.sideControl}>
                <View style={styles.sideIconWrap}><Text style={styles.sideIconText}>🏃</Text></View>
                <Text style={styles.sideLabel}>WORKOUT</Text>
                <Text style={styles.sideSubLabel}>{workoutType}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
                <Text style={styles.startIcon}>▶</Text>
                <Text style={styles.startLabel}>START</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sideControl}>
                <View style={[styles.sideIconWrap, displayHR ? { backgroundColor: 'rgba(255, 68, 68, 0.15)' } : {}]}>
                  <Text style={styles.sideIconText}>{displayHR ? '❤️' : '💓'}</Text>
                </View>
                <Text style={styles.sideLabel}>Heart Rate</Text>
                <Text style={[
                  styles.sideSubLabel,
                  displayHR 
                    ? { color: '#FF4444', fontSize: 16, fontFamily: 'Montserrat-Black', marginTop: 1 } 
                    : { color: '#C8FF00' }
                ]}>
                  {displayHR ? `${displayHR} BPM` : 'Add Sensor'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {runState === 'running' && (
            <View style={styles.activeControlsRow}>
              <TouchableOpacity style={styles.restBtn} onPress={handlePause} activeOpacity={0.85}>
                <Text style={styles.restIcon}>⏸</Text>
                <Text style={styles.restLabel}>REST</Text>
              </TouchableOpacity>
            </View>
          )}

          {runState === 'paused' && (
            <View style={styles.pausedControlsRow}>
              <TouchableOpacity style={styles.resumeBtn} onPress={handleStart} activeOpacity={0.85}>
                <Text style={styles.resumeIcon}>▶</Text>
                <Text style={styles.resumeLabel}>RESUME</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.finishSplitBtn} onPress={handleTriggerFinish} activeOpacity={0.85}>
                <View style={styles.finishSquareIcon} />
                <Text style={styles.finishSplitLabel}>FINISH</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>

      <Modal visible={runState === 'finished'} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRunState('paused')}>
                <Text style={styles.modalBackIcon}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>FINISH WORKOUT</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* 👇 FIX: Added the expanding chevron indicator to the right side */}
            <TouchableOpacity 
              style={[styles.hrSummaryBox, showHRChart && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}
              activeOpacity={0.8}
              onPress={() => setShowHRChart(!showHRChart)}
            >
              <View style={styles.hrSummaryContent}>
                <View style={styles.hrSummaryItem}>
                  <Text style={styles.hrSummaryLabel}>AVERAGE HR</Text>
                  <Text style={styles.hrSummaryValue}>{sessionStats.avg} <Text style={{fontSize: 12}}>BPM</Text></Text>
                </View>
                <View style={styles.hrSummaryDivider} />
                <View style={styles.hrSummaryItem}>
                  <Text style={styles.hrSummaryLabel}>PEAK HR</Text>
                  <Text style={[styles.hrSummaryValue, {color: '#FF4444'}]}>{sessionStats.max} <Text style={{fontSize: 12}}>BPM</Text></Text>
                </View>
              </View>
              <Ionicons 
                name={showHRChart ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#666" 
                style={{ marginLeft: 8 }} 
              />
            </TouchableOpacity>

            {showHRChart && sessionHRData.length > 0 && (
              <View style={styles.hrChartContainer}>
                <View style={styles.hrChartHeader}>
                  <Text style={styles.hrChartRangeLabel}>RANGE</Text>
                  <Text style={styles.hrChartRangeValue}>
                    {Math.min(...sessionHRData)}–{Math.max(...sessionHRData)} <Text style={styles.hrChartBpm}>BPM</Text>
                  </Text>
                </View>
                
                <BarChart
                  stackData={stackedData}
                  height={150}
                  width={chartWidth}
                  barWidth={barWidth}
                  spacing={safeSpacing}
                  initialSpacing={10}
                  hideRules={false}
                  rulesType="solid"
                  rulesColor="rgba(255,255,255,0.05)"
                  yAxisTextStyle={{ color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium' }}
                  hideYAxisText={false}
                  yAxisColor="transparent"
                  xAxisColor="#333333"
                  maxValue={Math.max(...sessionHRData, 120) + 10} 
                  noOfSections={4}
                />
              </View>
            )}
            
            <View style={{ height: showHRChart ? 20 : 0 }} />

            <TextInput
              style={styles.inputField}
              placeholder="Title of your run"
              placeholderTextColor="#888"
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
            />
            <TextInput
              style={[styles.inputField, styles.textArea]}
              placeholder="How did it go? Share more about your workout!"
              placeholderTextColor="#888"
              multiline
              value={workoutDesc}
              onChangeText={setWorkoutDesc}
            />

            <View style={styles.mediaGrid}>
              <View style={styles.mapSnapshotContainer}>
                {mapSnapshot ? (
                  <Image 
                    source={{ uri: `data:image/png;base64,${mapSnapshot}` }} 
                    style={styles.mapSnapshotImage}
                  />
                ) : (
                  <View style={styles.mapSnapshotPlaceholder}>
                    <Text style={{fontSize: 32}}>🗺️</Text>
                    <Text style={styles.mapSnapshotPlaceholderLabel}>Capturing...</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.addPhotosBtn} onPress={handleAddPhotos}>
                <Text style={{fontSize: 24, marginBottom: 8}}>📷</Text>
                <Text style={{color: '#1F78FF', fontSize: 12, fontFamily: 'Montserrat-SemiBold'}}>Add Photos / Videos</Text>
              </TouchableOpacity>
              
              {selectedMedia.map((media, index) => (
                <View key={index} style={styles.mediaPreviewContainer}>
                  <Image 
                    source={{ uri: media.uri }} 
                    style={styles.mediaPreview}
                  />
                  <TouchableOpacity 
                    style={styles.removeMediaBtn}
                    onPress={() => removeMediaItem(index)}
                  >
                    <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalBottomBar}>
            <TouchableOpacity 
              style={styles.discardBtn} 
              onPress={handleDiscardOrSave}
              disabled={isSaving}
            >
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveWorkoutBtn, isSaving && styles.savingBtn]} 
              onPress={saveRunToDatabase}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.saveWorkoutText}>Save Workout</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121310' },
  map: { ...StyleSheet.absoluteFillObject },

  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
  },
  backBtnWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },

  floatingRightControls: {
    position: 'absolute',
    right: 20,
    bottom: 360, 
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 20,
  },
  floatingHRBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  floatingHRText: {
    color: '#FF4444',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
  },
  recenterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(30,30,30,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  recenterIcon: { color: '#ffffff', fontSize: 22 },

  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: 'white',
  },

  bottomOverlayContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  
  statsPanel: {
    backgroundColor: 'rgba(30, 30, 30, 0.75)', 
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  gpsDotActive: { backgroundColor: '#C8FF00' },
  gpsDotInactive: { backgroundColor: '#888888' },
  gpsLabel: { fontSize: 12, fontFamily: 'Montserrat-SemiBold', letterSpacing: 0.5 },
  gpsLabelActive: { color: '#C8FF00' },
  gpsLabelInactive: { color: '#888888' },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  statLabel: { color: '#AAAAAA', fontSize: 10, fontFamily: 'Montserrat-Medium', marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  statDivider2: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },

  bottomControlsBg: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },

  idleControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideControl: { flex: 1, alignItems: 'center' },
  sideIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sideIconText: { fontSize: 22 },
  sideLabel: { color: '#AAAAAA', fontSize: 10, fontFamily: 'Montserrat-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  sideSubLabel: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Montserrat-Medium', marginTop: 2 },
  
  startBtn: { alignItems: 'center', justifyContent: 'center' },
  startIcon: { color: '#C8FF00', fontSize: 40, marginBottom: 4 },
  startLabel: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Montserrat-Bold', letterSpacing: 1 },

  activeControlsRow: { alignItems: 'center', justifyContent: 'center' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderWidth: 2, borderColor: '#C8FF00',
    borderRadius: 30, paddingVertical: 14, paddingHorizontal: 40, width: '70%',
  },
  restIcon: { color: '#C8FF00', fontSize: 20, marginRight: 10 },
  restLabel: { color: '#C8FF00', fontSize: 16, fontFamily: 'Montserrat-Bold', letterSpacing: 2 },

  pausedControlsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  resumeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderWidth: 2, borderColor: '#C8FF00',
    borderRadius: 30, paddingVertical: 14,
  },
  resumeIcon: { color: '#C8FF00', fontSize: 18, marginRight: 8 },
  resumeLabel: { color: '#C8FF00', fontSize: 14, fontFamily: 'Montserrat-Bold', letterSpacing: 1 },
  
  finishSplitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: 30, paddingVertical: 14,
  },
  finishSquareIcon: { width: 14, height: 14, backgroundColor: '#000', borderRadius: 2, marginRight: 8 },
  finishSplitLabel: { color: '#000', fontSize: 14, fontFamily: 'Montserrat-Bold', letterSpacing: 1 },

  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalScroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  modalBackIcon: { color: '#C8FF00', fontSize: 28, fontWeight: 'bold' },
  modalTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Montserrat-Black', letterSpacing: 1 },
  
  // 👇 FIX: Adjusted layout to properly align the new indicator chevron
  hrSummaryBox: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#1A1A1A', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  hrSummaryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hrSummaryItem: { flex: 1, alignItems: 'center' },
  hrSummaryLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat-Bold', marginBottom: 4 },
  hrSummaryValue: { color: '#FFF', fontSize: 24, fontFamily: 'Montserrat-Black' },
  hrSummaryDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 15 },

  hrChartContainer: {
    backgroundColor: '#111111',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#333',
    padding: 20,
    paddingTop: 16,
    overflow: 'hidden',
  },
  hrChartHeader: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  hrChartRangeLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hrChartRangeValue: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
  },
  hrChartBpm: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Montserrat-Medium',
  },

  inputField: {
    backgroundColor: '#1A1A1A', color: '#FFF',
    borderWidth: 1, borderColor: '#C8FF00', borderRadius: 8,
    padding: 16, fontSize: 16, marginBottom: 16, fontFamily: 'Montserrat-Medium'
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  mediaGrid: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  mapSnapshotContainer: {
    flex: 1, 
    height: 120, 
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#34D399',
    minWidth: '45%',
  },
  mapSnapshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mapSnapshotPlaceholder: {
    flex: 1, 
    height: 120, 
    backgroundColor: '#222', 
    borderRadius: 8,
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#444'
  },
  mapSnapshotPlaceholderText: {
    fontSize: 32,
  },
  mapSnapshotPlaceholderLabel: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Montserrat-SemiBold',
  },
  addPhotosBtn: {
    flex: 1, 
    height: 120, 
    borderRadius: 8,
    borderWidth: 1, 
    borderColor: '#1F78FF', 
    borderStyle: 'dashed',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#1A1A1A',
    minWidth: '45%',
  },
  addPhotosIcon: { fontSize: 24, marginBottom: 8 },
  addPhotosText: { color: '#1F78FF', fontSize: 12, fontFamily: 'Montserrat-SemiBold' },

  mediaPreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeMediaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalBottomBar: {
    flexDirection: 'row', gap: 15, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#121212', borderTopWidth: 1, borderTopColor: '#222'
  },
  discardBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#222',
    alignItems: 'center', justifyContent: 'center'
  },
  discardText: { color: '#FF4444', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  saveWorkoutBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: '#C8FF00',
    alignItems: 'center', justifyContent: 'center'
  },
  savingBtn: { opacity: 0.7 },
  saveWorkoutText: { color: '#000', fontSize: 14, fontFamily: 'Montserrat-Bold' },
});

export default RunScreen;