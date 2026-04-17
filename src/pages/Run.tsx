import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../supabase';
import { uploadRunMedia, uploadMapSnapshot } from '../services/runUpload';

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
  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [workoutType, setWorkoutType] = useState('Run');
  const [elevationMetrics, setElevationMetrics] = useState({ gain: 0, loss: 0, min: 0, max: 0 });
  const [isSaving, setIsSaving] = useState(false);
  
  // Finish Modal States
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // ── Location Permissions and Updates ────────────────────────────────────────
  useEffect(() => {
    const startLocationUpdates = async () => {
      // Request foreground location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        Alert.alert('Permission Required', 'Location access is needed to track your run.');
        return;
      }

      // Request background location permissions (for screen-off tracking)
      if (Platform.OS === 'ios') {
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status === 'granted') {
          console.log('✅ Background location permissions granted');
        }
      }

      // Get initial location to center the map
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

      // Start watching for location changes with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
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
            setRouteCoords(prev => {
              const updated = [...prev, coord];
              setDistance(calcDistance(updated));
              // Update elevation metrics
              const metrics = calcElevationMetrics(updated);
              setElevationMetrics(metrics);
              return updated;
            });
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

  // ── Location update handler ─────────────────────────────────────────────────
  // This is now handled by the useEffect with watchPositionAsync
  /*
  const handleUserLocationUpdate = (location: MapboxGL.Location) => {
    const coord: Coordinate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCurrentLocation(coord);
    if (!gpsReady) setGpsReady(true);

    if (runState === 'running') {
      setRouteCoords(prev => {
        const updated = [...prev, coord];
        setDistance(calcDistance(updated));
        return updated;
      });
      cameraRef.current?.setCamera({
        centerCoordinate: [coord.longitude, coord.latitude],
        animationDuration: 500,
      });
    }
  };
  */
  
  
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

  // ── Save Run to Database ─────────────────────────────────────────────────────
  const saveRunToDatabase = async () => {
    if (!workoutTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your workout.');
      return;
    }

    if (distance === 0) {
      Alert.alert('Invalid Run', 'No distance recorded. Please complete a run first.');
      return;
    }

    setIsSaving(true);
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        Alert.alert('Error', 'Could not authenticate user. Please try again.');
        setIsSaving(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();

      // Optional: Upload map snapshot (requires custom implementation)
      // For now, we'll skip automatic map capture and let users add photos manually
      let mapUrl = '';
      let otherUrls: string[] = [];
      
      // To add map snapshot capture later, you can:
      // 1. Use MapboxGL.snapshotManager().takeSnapshot() for the entire map view
      // 2. Or let users manually upload photos/maps via image picker

      // Prepare run data
      const runData = {
        user_id: userId,
        title: workoutTitle,
        description: workoutDesc,
        distance: distance, // in km
        duration: elapsed, // in seconds
        pace: calcPace(distance, elapsed),
        elevation_gain: elevationMetrics.gain,
        elevation_loss: elevationMetrics.loss,
        min_elevation: elevationMetrics.min,
        max_elevation: elevationMetrics.max,
        average_elevation: elevationMetrics.min && elevationMetrics.max 
          ? Math.round((elevationMetrics.min + elevationMetrics.max) / 2)
          : 0,
        route_coordinates: routeCoords, // Store as JSONB array
        route_map_url: mapUrl || null,
        media_urls: otherUrls,
        workout_type: workoutType,
        started_at: new Date(now.getTime() - elapsed * 1000).toISOString(),
        completed_at: now.toISOString(),
        created_at: now.toISOString(),
      };

      // Insert into 'runs' table
      const { data, error } = await supabase
        .from('runs')
        .insert([runData])
        .select();

      if (error) {
        console.error('Error saving run:', error);
        Alert.alert('Error', `Failed to save run: ${error.message}`);
        setIsSaving(false);
        return;
      }

      console.log('✅ Run saved successfully:', data);
      Alert.alert('Success! 🏃', 'Your workout has been saved to your profile.');

      // Reset and go back
      handleDiscardOrSave();
      navigation.goBack();
    } catch (error) {
      console.error('Error in saveRunToDatabase:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsSaving(false);
    }
  };

  // ── Controls ────────────────────────────────────────────────────────────────
  const handleStart = () => {
    setRunState('running');
    if (elapsed === 0) {
      setDistance(0);
      setRouteCoords([]);
      setElevationMetrics({ gain: 0, loss: 0, min: 0, max: 0 });
    }
  };

  const handlePause = () => setRunState('paused');
  
  const handleTriggerFinish = () => setRunState('finished');

  const handleDiscardOrSave = () => {
    setRunState('idle');
    setElapsed(0);
    setDistance(0);
    setRouteCoords([]);
    setElevationMetrics({ gain: 0, loss: 0, min: 0, max: 0 });
    setWorkoutTitle('');
    setWorkoutDesc('');
  };

  const pace = calcPace(distance, elapsed);
  const distanceDisplay = distance.toFixed(2);

  return (
    <View style={styles.container}>
      {/* ── Map (Now Full Screen) ────────────────────────────────────────── */}
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
          centerCoordinate={
            currentLocation
              ? [currentLocation.longitude, currentLocation.latitude]
              : undefined // Let mapbox handle initial center if no location yet
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

        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#34D399', // A nice green color
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* ── Floating Top Header ────────────────────────────────────────── */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.backBtnWrap} onPress={() => navigation.goBack()}>
          {/* Fallback back arrow if image fails */}
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recenter button (Moved up slightly to clear the taller panels) */}
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

      {/* ── Bottom Interface Overlay ────────────────────────────────────── */}
      <View style={styles.bottomOverlayContainer}>
        
        {/* Floating Stats Panel */}
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
          
          {/* Elevation Row (shown when running or has data) */}
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

        {/* Dynamic Controls Bar */}
        <View style={styles.bottomControlsBg}>
          
          {/* IDLE STATE */}
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
                <View style={styles.sideIconWrap}><Text style={styles.sideIconText}>💓</Text></View>
                <Text style={styles.sideLabel}>Heart Rate</Text>
                <Text style={[styles.sideSubLabel, { color: '#C8FF00' }]}>Add Sensor</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* RUNNING STATE */}
          {runState === 'running' && (
            <View style={styles.activeControlsRow}>
              <TouchableOpacity style={styles.restBtn} onPress={handlePause} activeOpacity={0.85}>
                <Text style={styles.restIcon}>⏸</Text>
                <Text style={styles.restLabel}>REST</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PAUSED STATE */}
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

      {/* ── FINISH WORKOUT MODAL ────────────────────────────────────────── */}
      <Modal visible={runState === 'finished'} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRunState('paused')}>
                <Text style={styles.modalBackIcon}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>FINISH WORKOUT</Text>
              <View style={{ width: 24 }} /> {/* Balance spacer */}
            </View>

            {/* Inputs */}
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

            {/* Media Grid */}
            <View style={styles.mediaGrid}>
              <View style={styles.mapSnapshotPlaceholder}>
                <Text style={{color: '#666', fontSize: 12}}>Map Snapshot</Text>
              </View>
              <TouchableOpacity style={styles.addPhotosBtn}>
                <Text style={styles.addPhotosIcon}>📷</Text>
                <Text style={styles.addPhotosText}>Add Photos / Videos</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Modal Bottom Buttons */}
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

  // Floating Header
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

  recenterBtn: {
    position: 'absolute', right: 20, bottom: 280, // High enough to clear the panels
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

  // Bottom Interface Overlay
  bottomOverlayContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  
  // Floating Stats Box
  statsPanel: {
    backgroundColor: 'rgba(30, 30, 30, 0.75)', // Glassy effect
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

  // Bottom Controls Background
  bottomControlsBg: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },

  // Idle Row
  idleControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideControl: { flex: 1, alignItems: 'center' },
  sideIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sideIconText: { fontSize: 22 },
  sideLabel: { color: '#AAAAAA', fontSize: 10, fontFamily: 'Montserrat-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  sideSubLabel: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Montserrat-Medium', marginTop: 2 },
  
  startBtn: { alignItems: 'center', justifyContent: 'center' },
  startIcon: { color: '#C8FF00', fontSize: 40, marginBottom: 4 },
  startLabel: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Montserrat-Bold', letterSpacing: 1 },

  // Running Row
  activeControlsRow: { alignItems: 'center', justifyContent: 'center' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000', borderWidth: 2, borderColor: '#C8FF00',
    borderRadius: 30, paddingVertical: 14, paddingHorizontal: 40, width: '70%',
  },
  restIcon: { color: '#C8FF00', fontSize: 20, marginRight: 10 },
  restLabel: { color: '#C8FF00', fontSize: 16, fontFamily: 'Montserrat-Bold', letterSpacing: 2 },

  // Paused Row
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

  // Finish Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalScroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  modalBackIcon: { color: '#C8FF00', fontSize: 28, fontWeight: 'bold' },
  modalTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Montserrat-Black', letterSpacing: 1 },
  
  inputField: {
    backgroundColor: '#1A1A1A', color: '#FFF',
    borderWidth: 1, borderColor: '#C8FF00', borderRadius: 8,
    padding: 16, fontSize: 16, marginBottom: 16, fontFamily: 'Montserrat-Medium'
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  mediaGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  mapSnapshotPlaceholder: {
    flex: 1, height: 120, backgroundColor: '#222', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#444'
  },
  addPhotosBtn: {
    flex: 1, height: 120, borderRadius: 8,
    borderWidth: 1, borderColor: '#1F78FF', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A'
  },
  addPhotosIcon: { fontSize: 24, marginBottom: 8 },
  addPhotosText: { color: '#1F78FF', fontSize: 12, fontFamily: 'Montserrat-SemiBold' },

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