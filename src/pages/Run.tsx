import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { snapRouteToRoads } from '../services/runUpload';
import { useHealth } from '../context/HealthContext';
import { getHeartRateHistory, HeartRateSample } from '../../modules/wobby-health';

// Import the newly created Component (Adjust path as needed)
import PostRunScreen from './PostRunScreen'; 

// ─── Set your Mapbox public token here ───────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// ─── Helper: Convert file URI to base64 (Kept for map capturing) ─────────────
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
const RunScreen = ({ navigation, route }: any) => {
  const { heartRate: contextHR } = useHealth();
  const [activeHR, setActiveHR] = useState<number | null>(null);
  const [sessionHRData, setSessionHRData] = useState<number[]>([]);

  // Edit mode state
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostData, setEditingPostData] = useState<any>(null);

  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [workoutType, setWorkoutType] = useState('Run');
  const [elevationMetrics, setElevationMetrics] = useState({ gain: 0, loss: 0, min: 0, max: 0 });
  const [snappedRoute, setSnappedRoute] = useState<any>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null); 
  
  const mapViewRef = useRef<MapboxGL.MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // ── Check for edit mode from navigation params ──
 useEffect(() => {
  if (route?.params?.isEditing && route?.params?.runDataToEdit) {
    const data = route.params.runDataToEdit;
    
    // 1. Fill the stats so the "Distance" and "Pace" labels show the old data
    setDistance(data.distance || 0);
    setElapsed(data.duration || 0);
    setWorkoutType(data.workout_type || 'Run');
    setRouteCoords(data.route_coordinates || []);
    
    // 2. Set the ID and Text data
    setIsEditingMode(true);
    setEditingPostId(data.id);
    setEditingPostData({
      title: data.title,
      description: data.description,
      media_urls: data.media_urls || [],
      route_map_url: data.route_map_url || null,
      pace: data.pace || null,  // ← add this
    });

    // 3. Trigger the modal
    setRunState('finished');
  }
}, [route?.params]);

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

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  const handleDiscardOrReset = () => {
  setRunState('idle');
  setElapsed(0);
  setDistance(0);
  setRouteCoords([]);
  setSessionHRData([]); 
  setElevationMetrics({ gain: 0, loss: 0, min: 0, max: 0 });
  setMapSnapshot(null);
  setSnappedRoute(null);
  
  // ADD THESE:
  setIsEditingMode(false);
  setEditingPostId(null);
  setEditingPostData(null);
};
  const pace = calcPace(distance, elapsed);
  const distanceDisplay = distance.toFixed(2);

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

      <PostRunScreen 
        visible={runState === 'finished'}
        onDiscard={handleDiscardOrReset}
        onBackToPaused={() => {
          if (isEditingMode) {
            navigation.goBack();
          } else {
            setRunState('paused');
          }
        }}
        onSaveSuccess={() => {
          if (isEditingMode) {
            navigation.goBack();
          } else {
            handleDiscardOrReset();
            navigation.goBack();
          }
        }}
        mapSnapshot={mapSnapshot ?? (isEditingMode ? editingPostData?.route_map_url ?? null : null)}
        runData={{
          distance,
          elapsed,
          routeCoords,
          elevationMetrics,
          sessionStats,
          sessionHRData,
          workoutType
        }}
        isEditing={isEditingMode}
        editingPostId={editingPostId || undefined}
        editingPostData={editingPostData}
      />

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
});

export default RunScreen;