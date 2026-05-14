import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { supabase } from '../supabase';
import { uploadRunMedia, uploadMapSnapshot } from '../services/runUpload';
import MapboxGL from '@rnmapbox/maps';
import { checkAndNotifyRank } from '../utils/leaderboardUtils';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Set your Mapbox public token here ───────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const calcPace = (distanceKm: number, seconds: number): string => {
  if (distanceKm === 0 || seconds === 0) return '--:--';
  const paceSeconds = seconds / distanceKm;
  const pm = Math.floor(paceSeconds / 60);
  const ps = Math.round(paceSeconds % 60);
  return `${pm}:${String(ps).padStart(2, '0')}`;
};

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
            reject(new Error('Failed to read blob as data URL'));
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

  const MIN_DELTA = 0.002;
  
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
  return [[minLng, minLat], [maxLng, maxLat]];
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface RunData {
  distance: number;
  elapsed: number;
  routeCoords: Coordinate[];
  elevationMetrics: { gain: number; loss: number; min: number; max: number };
  sessionStats: { avg: number; max: number };
  sessionHRData: number[];
  workoutType: string;
  isWinner?: boolean;
}

interface PostRunModalProps {
  visible: boolean;
  onDiscard: () => void;
  onSaveSuccess: () => void;
  onBackToPaused: () => void;
  runData: RunData;
  mapSnapshot: string | null;
  isEditing?: boolean;
  editingPostId?: string;
  editingPostData?: {
    title?: string;
    description?: string;
    media_urls?: string[];
    route_map_url?: string | null;
    pace?: string | null;
  };
  initialTitle?: string;
  initialDescription?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PostRunModal({
  visible,
  onDiscard,
  onSaveSuccess,
  onBackToPaused,
  runData,
  mapSnapshot,
  isEditing = false,
  editingPostId,
  editingPostData,
  initialTitle,
  initialDescription,
}: PostRunModalProps) {
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHRChart, setShowHRChart] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isEditing && editingPostData) {
        // We are editing: Fill with existing data
        setWorkoutTitle(editingPostData.title || '');
        setWorkoutDesc(editingPostData.description || '');

        if (editingPostData.media_urls && editingPostData.media_urls.length > 0) {
          setSelectedMedia(editingPostData.media_urls.map((url: string) => ({ uri: url })));
        }
      } else if (!isEditing) {
        // We are starting a fresh save: set initial title/description or clear
        setWorkoutTitle(initialTitle || '');
        setWorkoutDesc(initialDescription || '');
        setSelectedMedia([]);
      }
    }
  }, [visible, isEditing, editingPostData, initialTitle, initialDescription]);
  const { distance, elapsed, routeCoords, elevationMetrics, sessionStats, sessionHRData, workoutType } = runData;

  const [mapLoading, setMapLoading] = useState(true);

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null = useMemo(() => {
    if (routeCoords && routeCoords.length >= 2) {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeCoords.map(c => [c.longitude, c.latitude]),
        },
        properties: {},
      };
    }
    return null;
  }, [routeCoords]);

  const mapBounds = useMemo(() => {
    if (routeCoords && routeCoords.length >= 2) {
      return getBounds(routeCoords);
    }
    return null;
  }, [routeCoords]);

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
        setSelectedMedia((prev) => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeMediaItem = (index: number) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const saveRunToDatabase = async () => {
    if (!workoutTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your workout.');
      return;
    }

    // For new runs, validate route data. For editing, just update the data
    if (!isEditing && distance < 0.3) {
      Alert.alert('Invalid Run', 'Runs must be at least 300 meters (0.3 km) to be saved.');
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

      // If editing, only update title and description
if (isEditing && editingPostId) {
  try {
    // Split into existing (already on Supabase) vs new local picks
    const existingUrls = selectedMedia
      .filter(m => m.uri.startsWith('http'))
      .map(m => m.uri);

    const newMedia = selectedMedia.filter(m => !m.uri.startsWith('http'));

    // Upload only the newly added photos
    const newUrls: string[] = [];
    for (const media of newMedia) {
      try {
        const base64Data = await uriToBase64(media.uri);
        if (!base64Data || base64Data.length === 0) continue;

        const mimeType = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const ext = media.type === 'video' ? 'mp4' : 'jpg';
        const fileName = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const mediaUrl = await uploadRunMedia(userId, base64Data, fileName, mimeType);
        newUrls.push(mediaUrl);
      } catch {
        continue;
      }
    }

    const updatePayload = {
      title: workoutTitle.trim(),
      description: workoutDesc.trim(),
      media_urls: [...existingUrls, ...newUrls], // merge kept + newly uploaded
    };

    const { error } = await supabase
      .from('runs')
      .update(updatePayload)
      .eq('id', editingPostId);

    if (error) {
      Alert.alert('Error', `Failed to update run: ${error.message}`);
      setIsSaving(false);
      return;
    }

    Alert.alert('Success! 🏃', 'Your workout has been updated.');
    setWorkoutTitle('');
    setWorkoutDesc('');
    setSelectedMedia([]);
    setIsSaving(false);
    setShowHRChart(false);
    onSaveSuccess();
    return;
  } catch (error) {
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    setIsSaving(false);
    return;
  }
}

      // For new runs, upload media and create the full run record
      let mapUrl = '';
      let otherUrls: string[] = [];

      try {
        if (mapSnapshot && mapSnapshot.length > 0) {
          try {
            mapUrl = await uploadMapSnapshot(userId, mapSnapshot, `map-${Date.now()}.png`);
          } catch (uploadError) {
            mapUrl = '';
          }
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

      // ─── XP & ACHIEVEMENTS LOGIC ───
      let earnedXp = 0;
      let xpBreakdown = {
        base: 0,
        long_distance_bonus: 0,
        elevation_bonus: 0,
        pace_bonus: 0,
      };
      let earnedAchievements: string[] = [];

      try {
        // Calculate XP
        const baseDist = Math.min(distance, 5);
        const longDist = Math.max(distance - 5, 0);
        
        xpBreakdown.base = Math.floor(baseDist * 100);
        xpBreakdown.long_distance_bonus = Math.floor(longDist * 150);
        xpBreakdown.elevation_bonus = Math.floor(elevationMetrics.gain / 100) * 10;
        
        const paceSecsPerKm = distance > 0 ? elapsed / distance : 0;
        if (paceSecsPerKm > 0 && paceSecsPerKm < 360) { // under 6:00/km
          xpBreakdown.pace_bonus = 50;
        }

        earnedXp = xpBreakdown.base + xpBreakdown.long_distance_bonus + xpBreakdown.elevation_bonus + xpBreakdown.pace_bonus;
        
        if (workoutType === 'versus_run' && runData.isWinner && distance >= 1) {
          earnedXp += 100;
          // You might add a 'versus_bonus' field if you want it to show up
        }

        // Calculate Achievements
        const { data: existingAchievements } = await supabase.from('user_achievements').select('achievement_name').eq('user_id', userId);
        const unlockedSet = new Set(existingAchievements?.map(a => a.achievement_name) || []);
        
        const { data: allRuns } = await supabase.from('runs').select('distance, elevation_gain').eq('user_id', userId);
        const pastDist = allRuns?.reduce((sum, r) => sum + (r.distance || 0), 0) || 0;
        const pastElev = allRuns?.reduce((sum, r) => sum + (r.elevation_gain || 0), 0) || 0;
        
        const totalDist = pastDist + distance;
        const totalElev = pastElev + elevationMetrics.gain;

        if (!unlockedSet.has('7') && totalDist >= 5) earnedAchievements.push('7');
        if (!unlockedSet.has('10') && totalDist >= 10) earnedAchievements.push('10');
        if (!unlockedSet.has('13') && totalDist >= 21) earnedAchievements.push('13');
        if (!unlockedSet.has('16') && totalDist >= 42) earnedAchievements.push('16');
        
        if (!unlockedSet.has('8') && totalElev >= 50) earnedAchievements.push('8');
        if (!unlockedSet.has('11') && totalElev >= 250) earnedAchievements.push('11');
        if (!unlockedSet.has('14') && totalElev >= 500) earnedAchievements.push('14');
        
        // PACER: Pace-based (seconds per km) — lower is faster
        const paceSecsPerKmForAch = distance > 0 ? elapsed / distance : Infinity;
        if (!unlockedSet.has('9') && paceSecsPerKmForAch <= 600) earnedAchievements.push('9');    // ≤ 10:00/km
        if (!unlockedSet.has('12') && paceSecsPerKmForAch <= 360) earnedAchievements.push('12');  // ≤ 6:00/km
        if (!unlockedSet.has('15') && paceSecsPerKmForAch <= 180) earnedAchievements.push('15');  // ≤ 3:00/km

        // Add 1000 XP per achievement earned
        const achievementXp = earnedAchievements.length * 1000;
        earnedXp += achievementXp;

        // Update profile XP
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', userId)
          .single();
        
        const currentXp = profile?.xp || 0;
        await supabase
          .from('profiles')
          .update({ xp: currentXp + earnedXp })
          .eq('id', userId);

        // Insert new achievements
        if (earnedAchievements.length > 0) {
          const achievementInserts = earnedAchievements.map(id => ({
            user_id: userId,
            achievement_name: id,
            unlocked_at: new Date().toISOString(),
          }));
          await supabase.from('user_achievements').insert(achievementInserts);
        }

        // ── Notifications ────────────────────────────────────────────────────
        // 1. XP earned notification
        if (earnedXp > 0) {
          await supabase.from('notifications').insert([{
            user_id: userId,
            title: `+${earnedXp} XP Earned`,
            message: `You earned ${earnedXp} XP for completing your run!${earnedAchievements.length > 0 ? ` (includes ${earnedAchievements.length * 1000} XP from achievements)` : ''}`,
            metadata: { xp_earned: earnedXp, workout_type: workoutType },
            is_read: false,
          }]);
        }

        // 2. Achievement notification (one per unlock)
        for (const achId of earnedAchievements) {
          const achNames: Record<string, string> = {
            '3': 'Pushup Prodigy', '4': 'Dips Dynamo', '5': 'Squat Scholar',
            '6': 'Lunge Legend', '7': 'The Strider I', '8': 'The Climber I',
            '9': 'The Pacer I', '10': 'The Strider II', '11': 'The Climber II',
            '12': 'The Pacer II', '13': 'The Strider III', '14': 'The Climber III',
            '15': 'The Pacer III', '16': 'The Strider IV',
          };
          await supabase.from('notifications').insert([{
            user_id: userId,
            title: '🏆 Achievement Unlocked!',
            message: `You unlocked "${achNames[achId] ?? `Achievement #${achId}`}" — +1000 XP bonus!`,
            metadata: { achievement_id: achId },
            is_read: false,
          }]);
        }
        // ──────────────────────────────────────import { checkAndNotifyRank } from '../utils/leaderboardUtils';
// ───────────────────────────────
      } catch (err) {
        console.warn('Failed to process XP / Achievements:', err);
      }
      
      // Check for leaderboard rank notification
      await checkAndNotifyRank(userId);
      // ───────────────────────────────

      const runPayload: any = {
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
        average_elevation:
          elevationMetrics.min && elevationMetrics.max
            ? Math.round((elevationMetrics.min + elevationMetrics.max) / 2)
            : 0,
        route_coordinates: routeCoords,
        route_map_url: mapUrl || null,
        media_urls: otherUrls,
        workout_type: workoutType,
        started_at: new Date(now.getTime() - elapsed * 1000).toISOString(),
        completed_at: now.toISOString(),
        created_at: now.toISOString(),
        xp_earned: earnedXp,
        xp_breakdown: xpBreakdown,
        earned_achievements: earnedAchievements.length > 0 ? earnedAchievements : null,
      };

      if (sessionStats.avg > 0) {
        runPayload.average_bpm = sessionStats.avg;
        runPayload.max_bpm = sessionStats.max;
      }

      const { error } = await supabase.from('runs').insert([runPayload]).select();

      if (error) {
        Alert.alert('Error', `Failed to save run: ${error.message}`);
        setIsSaving(false);
        return;
      }

      Alert.alert('Success! 🏃', 'Your workout has been saved to your profile.');
      
      // Clear local state before firing success callback
      setWorkoutTitle('');
      setWorkoutDesc('');
      setSelectedMedia([]);
      setIsSaving(false);
      setShowHRChart(false);
      
      onSaveSuccess();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsSaving(false);
    }
  };

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
          { value: height, color: '#FF4444', borderRadius: 4, marginBottom: 2 },
        ],
      });
    }
    return processed;
  }, [sessionHRData]);

  const numBars = stackedData.length || 1;
  const availableWidth = chartWidth - 30;
  const safeSpacing = numBars > 1 ? (availableWidth - numBars * barWidth) / (numBars - 1) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#5C2C2C', '#000000']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onBackToPaused}>
                <Image
                  source={require('../assets/back0.png')}
                  style={styles.backIcon}
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{isEditing ? 'EDIT WORKOUT' : 'FINISH WORKOUT'}</Text>
              <View style={{ width: 24 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.modalScroll}>
          {sessionStats.avg > 0 ? (
            <>
              <TouchableOpacity
                style={[
                  styles.hrSummaryBox,
                  showHRChart && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
                ]}
                activeOpacity={0.8}
                onPress={() => setShowHRChart(!showHRChart)}
              >
                <View style={styles.hrSummaryContent}>
                  <View style={styles.hrSummaryItem}>
                    <Text style={styles.hrSummaryLabel}>AVERAGE HR</Text>
                    <Text style={styles.hrSummaryValue}>
                      {sessionStats.avg} <Text style={{ fontSize: 12 }}>BPM</Text>
                    </Text>
                  </View>
                  <View style={styles.hrSummaryDivider} />
                  <View style={styles.hrSummaryItem}>
                    <Text style={styles.hrSummaryLabel}>PEAK HR</Text>
                    <Text style={[styles.hrSummaryValue, { color: '#FF4444' }]}>
                      {sessionStats.max} <Text style={{ fontSize: 12 }}>BPM</Text>
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showHRChart ? 'chevron-up' : 'chevron-down'}
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
                      {Math.min(...sessionHRData)}–{Math.max(...sessionHRData)}{' '}
                      <Text style={styles.hrChartBpm}>BPM</Text>
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
            </>
          ) : (
            <View style={styles.hrSummaryBox}>
              <View style={[styles.hrSummaryContent, { justifyContent: 'center' }]}>
                <Text style={{ color: '#555', fontSize: 12, fontFamily: 'Montserrat_600SemiBold', textAlign: 'center' }}>No device attached</Text>
              </View>
            </View>
          )}

          <View style={styles.runStatsSummaryBox}>
            <View style={styles.runStatsContent}>
              <View style={styles.runStatsItem}>
                <Text style={styles.runStatsLabel}>DISTANCE</Text>
                <Text style={styles.runStatsValue}>
                  {distance.toFixed(2)} <Text style={{ fontSize: 12 }}>km</Text>
                </Text>
              </View>
              <View style={styles.runStatsDivider} />
              <View style={styles.runStatsItem}>
                <Text style={styles.runStatsLabel}>AVG PACE</Text>
                <Text style={styles.runStatsValue}>
                {isEditing && editingPostData?.pace
                 ? editingPostData.pace
                 : calcPace(distance, elapsed)}
                </Text>
                <Text style={styles.runStatsSubLabel}>/km</Text>
              </View>
              <View style={styles.runStatsDivider} />
              <View style={styles.runStatsItem}>
                <Text style={styles.runStatsLabel}>TIME</Text>
                <Text style={styles.runStatsValue}>{formatTime(elapsed)}</Text>
              </View>
            </View>
          </View>

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
              {routeGeoJSON && mapBounds ? (
                <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }}>
                  <MapboxGL.MapView
                    style={{ flex: 1 }}
                    styleURL={MapboxGL.StyleURL.Dark}
                    compassEnabled={false}
                    logoEnabled={false}
                    attributionEnabled={false}
                    scrollEnabled={true}
                    pitchEnabled={false}
                    onDidFinishLoadingMap={() => setMapLoading(false)}
                  >
                    <MapboxGL.Camera
                      bounds={{
                        ne: mapBounds[1],
                        sw: mapBounds[0],
                        paddingLeft: 40,
                        paddingRight: 40,
                        paddingTop: 40,
                        paddingBottom: 40,
                      }}
                      animationDuration={0}
                    />
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
                  </MapboxGL.MapView>
                  {mapLoading && (
                    <View style={styles.mapLoadingOverlay}>
                      <ActivityIndicator size="large" color="#CCFF00" />
                    </View>
                  )}
                </View>
              ) : mapSnapshot ? (
                <Image
                  source={{
                    uri: mapSnapshot.startsWith('http')
                      ? mapSnapshot
                      : `data:image/png;base64,${mapSnapshot}`
                  }}
                  style={styles.mapSnapshotImage}
                />
              ) : (
                <View style={styles.mapSnapshotPlaceholder}>
                  <Text style={{ fontSize: 32 }}>🗺️</Text>
                  <Text style={styles.mapSnapshotPlaceholderLabel}>No Route Found</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.addPhotosBtn} onPress={handleAddPhotos}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>📷</Text>
              <Text style={{ color: '#1F78FF', fontSize: 12, fontFamily: 'Montserrat-SemiBold' }}>
                Add Photos / Videos
              </Text>
            </TouchableOpacity>

            {selectedMedia.map((media, index) => (
              <View key={index} style={styles.mediaPreviewContainer}>
                <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMediaItem(index)}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.modalBottomBar}>
          <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} disabled={isSaving}>
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
              <Text style={styles.saveWorkoutText}>{isEditing ? 'Save Changes' : 'Save Workout'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalScroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  headerGradient: {
      width: '100%',
      paddingBottom: 20,
      paddingTop: StatusBar.currentHeight || 0,
    },
  modalHeader: { 
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backIcon: {
    width: 30,
    height: 30,
    position: 'absolute',
    left: 12,
    marginTop: -40,
  }, 
  modalTitle: { color: '#d1d1d1',
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    right: -45,
    bottom: -20,},
  hrSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  hrSummaryContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
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
  hrChartHeader: { alignSelf: 'flex-start', marginBottom: 20 },
  hrChartRangeLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hrChartRangeValue: { color: '#FFF', fontSize: 28, fontFamily: 'Montserrat-Bold' },
  hrChartBpm: { fontSize: 14, color: '#888', fontFamily: 'Montserrat-Medium' },
  runStatsSummaryBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  runStatsContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  runStatsItem: { flex: 1, alignItems: 'center' },
  runStatsLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat-Bold', marginBottom: 4 },
  runStatsValue: { color: '#C8FF00', fontSize: 20, fontFamily: 'Montserrat-Black' },
  runStatsSubLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat-Medium', marginTop: 2 },
  runStatsDivider: { width: 1, backgroundColor: '#333', height: 40, marginHorizontal: 10 },
  inputField: {
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#C8FF00',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Montserrat-Medium',
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
  mapSnapshotImage: { width: '100%', height: '100%', borderRadius: 8 },
  mapSnapshotPlaceholder: {
    flex: 1,
    height: 120,
    backgroundColor: '#222',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  mapSnapshotPlaceholderLabel: { color: '#666', fontSize: 10, marginTop: 4, fontFamily: 'Montserrat-SemiBold' },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  mediaPreviewContainer: { position: 'relative', width: 120, height: 120, borderRadius: 8, overflow: 'hidden' },
  mediaPreview: { width: '100%', height: '100%', borderRadius: 8 },
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
  modalBottomBar: {
    flexDirection: 'row',
    gap: 15,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: { color: '#FF4444', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  saveWorkoutBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#C8FF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingBtn: { opacity: 0.7 },
  saveWorkoutText: { color: '#000', fontSize: 14, fontFamily: 'Montserrat-Bold' },
});