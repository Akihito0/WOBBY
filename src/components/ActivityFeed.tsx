import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import { ACHIEVEMENT_DATA } from '../pages/Achievements';

const { width } = Dimensions.get('window');

const IMAGE_WIDTH = width * 0.65;
const IMAGE_MARGIN = 12;
const ITEM_SIZE = IMAGE_WIDTH + IMAGE_MARGIN;
const SIDE_INSET = (width - IMAGE_WIDTH) / 2;

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatSetTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

interface RunData {
  id?: string;
  title: string;
  description?: string;
  distance: number;
  duration: number;
  pace: string;
  workout_type: string;
  completed_at: string;
  media_urls?: string[];
  average_bpm?: number;
  max_bpm?: number;
  elevation_gain?: number;
  elevation_loss?: number;
  min_elevation?: number;
  max_elevation?: number;
  route_map_url?: string;
}

interface RoutineData {
  id: string;
  caption: string;
  notes?: string;
  total_duration: number;
  routine_type: string;
  workout_type?: string;
  created_at: string;
  media_url?: string;
  exercises_data: any[];
  xp_earned?: number;
  xp_breakdown?: { base: number; rep_xp: number; set_xp: number; duration_bonus: number; perfect_bonus: number };
  total_sets_completed?: number;
  total_reps_completed?: number;
  earned_achievements?: string[];
}

interface ActivityFeedProps {
  username?: string;
  avatarUrl?: string | null;
  runData?: RunData;
  routineData?: RoutineData;
  onRefresh?: () => void;
  navigation?: any;
}

export default function ActivityFeed({
  username = 'Guest',
  avatarUrl,
  runData,
  routineData,
  onRefresh,
  navigation,
}: ActivityFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Routine edit state ──────────────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // ───────────────────────────────────────────────────────────────────────────

  const flatListRef = useRef<FlatList>(null);

  const isRoutine = !!routineData;
  const isRun = !!runData;

  // Determine active data variables
  const activeId = isRoutine ? routineData?.id : runData?.id;
  const title = isRoutine ? routineData?.caption || `${routineData?.routine_type} Routine` : runData?.title;
  const description = isRoutine ? routineData?.notes : runData?.description;
  const dateStr = isRoutine ? routineData?.created_at : runData?.completed_at;
  const duration = isRoutine ? routineData?.total_duration || 0 : runData?.duration || 0;

  // Calculate routine specific stats
  let totalSets = 0;
  let totalReps = 0;
  if (isRoutine && routineData?.exercises_data) {
    routineData.exercises_data.forEach(ex => {
      totalSets += ex.sets?.length || 0;
      ex.sets?.forEach((set: any) => totalReps += (Number(set.reps) || 0));
    });
  }

  const workoutGallery = useMemo(() => {
    if (isRoutine) {
      return routineData?.media_url ? [{ uri: routineData.media_url }] : [];
    } else if (isRun && runData?.media_urls && runData.media_urls.length > 0) {
      return runData.media_urls.map(url => ({ uri: url }));
    }
    return [
      require('../assets/workout_1.png'),
      require('../assets/workout_2.png'),
      require('../assets/workout_3.png'),
    ];
  }, [runData, routineData, isRoutine, isRun]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_SIZE);
    setCurrentIndex(Math.min(Math.max(index, 0), workoutGallery.length - 1));
  };

  const handleDeletePost = async () => {
    if (!activeId) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const table = isRoutine ? 'completed_routines' : 'runs';
              const { error } = await supabase.from(table).delete().eq('id', activeId);

              if (error) throw error;

              Alert.alert('Success', 'Post deleted successfully');
              setMenuModalVisible(false);
              onRefresh?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete post');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Opens the appropriate edit flow for runs or routines
  const handleEditPost = () => {
    setMenuModalVisible(false);

    if (isRoutine && routineData) {
      // Pre-fill fields with current values
      setEditCaption(routineData.caption || '');
      setEditNotes(routineData.notes || '');
      setEditModalVisible(true);
      return;
    }

    if (isRun && runData && navigation) {
      navigation.navigate('Workout', {
        screen: 'RunScreen',
        params: { isEditing: true, runDataToEdit: runData },
      });
    }
  };

  // Persist routine edits to Supabase
  const handleSaveRoutineEdit = async () => {
    if (!routineData?.id) return;

    const trimmedCaption = editCaption.trim();
    if (!trimmedCaption) {
      Alert.alert('Validation', 'Caption cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('completed_routines')
        .update({ caption: trimmedCaption, notes: editNotes.trim() || null })
        .eq('id', routineData.id);

      if (error) throw error;

      Alert.alert('Success', 'Workout post updated successfully.');
      setEditModalVisible(false);
      onRefresh?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isRoutine && !isRun) return null;

  return (
    <View style={styles.rootWrapper}>
      <View style={styles.container}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Image source={avatarUrl ? { uri: avatarUrl } : require('../assets/user.png')} style={styles.avatar} />
            <View>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.timestamp}>{formatDate(dateStr || '')}</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={10} onPress={() => setMenuModalVisible(true)}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#A8A8A8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.workoutTitle}>{title}</Text>
        {description ? <Text style={styles.workoutDescription}>{description}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>

          {isRoutine ? (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Sets</Text>
                <Text style={styles.statValue}>{totalSets}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { textAlign: 'right' }]}>Total Reps</Text>
                <Text style={[styles.statValue, { textAlign: 'right', color: '#CCFF00' }]}>{totalReps}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{runData?.distance?.toFixed(2)} km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { textAlign: 'right' }]}>Pace</Text>
                <Text style={[styles.statValue, { textAlign: 'right', color: '#CCFF00' }]}>{runData?.pace}</Text>
              </View>
            </>
          )}
        </View>

        {/* XP Badge for routines */}
        {isRoutine && routineData?.xp_earned != null && routineData.xp_earned > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,255,0,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)' }}>
              <Text style={{ color: '#CCFF00', fontSize: 13, fontFamily: 'Montserrat_800ExtraBold' }}>+{routineData.xp_earned} XP</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.seeMoreBtn} onPress={() => setDetailsModalVisible(true)}>
          <Text style={styles.seeMoreText}>See Details & Stats</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#C8FF00" />
        </TouchableOpacity>

        {/* Achievements Earned */}
        {isRoutine && routineData?.earned_achievements && routineData.earned_achievements.length > 0 && (
          <View style={styles.achievementsRow}>
            <Text style={styles.achievementsLabel}>EARNED BADGES</Text>
            <View style={styles.badgesContainer}>
              {routineData.earned_achievements.map((id) => {
                const badge = ACHIEVEMENT_DATA.find((a) => a.id === id);
                if (!badge) return null;
                return (
                  <View key={id} style={styles.badgeWrapper}>
                    <Image source={badge.image} style={styles.postBadgeIcon} resizeMode="contain" />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {workoutGallery.length > 0 && (
          <>
            <FlatList
              ref={flatListRef}
              data={workoutGallery}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              snapToInterval={ITEM_SIZE}
              snapToAlignment="start"
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              {...(Platform.OS === 'ios'
                ? {
                    contentInset: { left: SIDE_INSET, right: SIDE_INSET },
                    contentOffset: { x: -SIDE_INSET, y: 0 },
                  }
                : {
                    contentContainerStyle: { paddingHorizontal: SIDE_INSET },
                  })}
              renderItem={({ item }: any) => (
                <Image source={typeof item === 'string' || item.uri ? item : item} style={styles.galleryImage} />
              )}
            />
            {workoutGallery.length > 1 && (
              <View style={styles.paginationRow}>
                {workoutGallery.map((_, index) => (
                  <View key={index} style={[styles.dot, index === currentIndex && styles.activeDot]} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── DETAILS MODAL ─────────────────────────────────────────────────── */}
        <Modal visible={detailsModalVisible} animationType="slide" transparent={false} onRequestClose={() => setDetailsModalVisible(false)}>
          <LinearGradient colors={['#001E20', '#0a0a0a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailsModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{isRoutine ? `${routineData?.routine_type} ROUTINE` : 'RUN DETAILS'}</Text>
                <View style={{ width: 28 }} />
              </View>

              <Text style={styles.modalRunTitle}>{title}</Text>

              {isRoutine && routineData ? (
                <>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Total Duration</Text>
                      <Text style={styles.modalStatValue}>{formatDuration(duration)}</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Completed Sets</Text>
                      <Text style={styles.modalStatValue}>{totalSets}</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Total Reps</Text>
                      <Text style={styles.modalStatValue}>{totalReps}</Text>
                    </View>
                    {routineData.xp_earned != null && routineData.xp_earned > 0 && (
                      <View style={[styles.modalStatBox, { borderColor: 'rgba(204,255,0,0.3)' }]}>
                        <Text style={styles.modalStatLabel}>XP Earned</Text>
                        <Text style={styles.modalStatValue}>+{routineData.xp_earned}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.modalSectionLabel}>Exercises Breakdown</Text>
                  {routineData.exercises_data.map((ex: any, i: number) => (
                    <View key={i} style={styles.exerciseBreakdownCard}>
                      <Text style={styles.exerciseBreakdownTitle}>{ex.name}</Text>
                      <Text style={styles.exerciseBreakdownStats}>
                        {ex.sets.length} Sets  |  {ex.sets.reduce((r: number, s: any) => r + s.reps, 0)} Total Reps
                      </Text>

                      <View style={styles.setRowHeader}>
                        <Text style={[styles.setRowHeaderText, { flex: 0.4 }]}>Set</Text>
                        <Text style={[styles.setRowHeaderText, { flex: 1 }]}>Weight</Text>
                        <Text style={[styles.setRowHeaderText, { flex: 0.5 }]}>Reps</Text>
                        <Text style={[styles.setRowHeaderText, { flex: 0.7 }]}>Time</Text>
                        <Text style={[styles.setRowHeaderText, { flex: 0.6 }]}>Status</Text>
                      </View>

                      {ex.sets.map((set: any, j: number) => (
                        <View key={j} style={styles.setRow}>
                          <Text style={[styles.setRowText, { flex: 0.4 }]}>{set.set}</Text>
                          <Text style={[styles.setRowText, { flex: 1 }]}>{set.weight}</Text>
                          <Text style={[styles.setRowText, { flex: 0.5 }]}>{set.reps}</Text>
                          <Text style={[styles.setRowText, { flex: 0.7 }]}>{formatSetTime(set.duration)}</Text>
                          <Text style={[styles.setRowText, { flex: 0.6, color: set.status === 'FINISHED' ? '#CCFF00' : (set.status === 'INCOMPLETE' ? '#FF8800' : '#888') }]}>
                            {set.status === 'FINISHED' ? '✓' : (set.status === 'INCOMPLETE' ? '◐' : '-')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}

                  {/* XP Breakdown Transparency */}
                  {routineData.xp_breakdown && routineData.xp_earned != null && routineData.xp_earned > 0 && (
                    <>
                      <Text style={styles.modalSectionLabel}>XP Calculation</Text>
                      <View style={[styles.exerciseBreakdownCard, { borderColor: 'rgba(204,255,0,0.15)' }]}>
                        <Text style={{ color: '#CCFF00', fontSize: 24, fontFamily: 'Montserrat_900Black', marginBottom: 12 }}>+{routineData.xp_earned} XP</Text>
                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: '#AAA', fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Base XP</Text>
                          <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>{routineData.xp_breakdown.base}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: '#AAA', fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Rep XP</Text>
                          <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>{routineData.xp_breakdown.rep_xp}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: '#AAA', fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Set XP</Text>
                          <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>{routineData.xp_breakdown.set_xp}</Text>
                        </View>
                        {routineData.xp_breakdown.duration_bonus > 0 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ color: '#AAA', fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Duration Bonus</Text>
                            <Text style={{ color: '#34D399', fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>+{routineData.xp_breakdown.duration_bonus}</Text>
                          </View>
                        )}
                        {routineData.xp_breakdown.perfect_bonus > 0 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ color: '#AAA', fontSize: 11, fontFamily: 'Montserrat_500Medium' }}>Perfect Bonus</Text>
                            <Text style={{ color: '#FFD700', fontSize: 11, fontFamily: 'Montserrat_700Bold' }}>+{routineData.xp_breakdown.perfect_bonus}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}
                </>
              ) : runData ? (
                <>
                  {runData.route_map_url && <Image source={{ uri: runData.route_map_url }} style={styles.modalMapImage} />}

                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Distance</Text>
                      <Text style={styles.modalStatValue}>{runData.distance.toFixed(2)}</Text>
                      <Text style={styles.modalStatUnit}>km</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Duration</Text>
                      <Text style={styles.modalStatValue}>{formatDuration(duration)}</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Pace</Text>
                      <Text style={styles.modalStatValue}>{runData.pace}</Text>
                      <Text style={styles.modalStatUnit}>/km</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Mode</Text>
                      <Text style={styles.modalStatValue}>{runData.workout_type || 'Solo'}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              {description && (
                <>
                  <Text style={styles.modalSectionLabel}>Notes</Text>
                  <View style={styles.modalDescriptionBox}>
                    <Text style={styles.modalDescriptionText}>{description}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </Modal>

        {/* ── ROUTINE EDIT MODAL ────────────────────────────────────────────── */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => !isSaving && setEditModalVisible(false)}
        >
          <LinearGradient colors={['#001E20', '#0a0a0a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => !isSaving && setEditModalVisible(false)}
                    disabled={isSaving}
                  >
                    <MaterialCommunityIcons name="close" size={28} color={isSaving ? '#555' : '#FFF'} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>EDIT WORKOUT</Text>
                  {/* Save button in header */}
                  <TouchableOpacity
                    style={[styles.editSaveHeaderBtn, isSaving && { opacity: 0.5 }]}
                    onPress={handleSaveRoutineEdit}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={styles.editSaveHeaderBtnText}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* Routine type badge */}
                <View style={styles.editBadgeRow}>
                  <View style={styles.editBadge}>
                    <MaterialCommunityIcons name="dumbbell" size={13} color="#CCFF00" />
                    <Text style={styles.editBadgeText}>{routineData?.routine_type} Routine</Text>
                  </View>
                </View>

                {/* Caption field */}
                <Text style={styles.editFieldLabel}>Caption *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editCaption}
                  onChangeText={setEditCaption}
                  placeholder="Give your workout a title…"
                  placeholderTextColor="#555"
                  maxLength={100}
                  returnKeyType="done"
                  editable={!isSaving}
                />
                <Text style={styles.editCharCount}>{editCaption.length}/100</Text>

                {/* Notes field */}
                <Text style={[styles.editFieldLabel, { marginTop: 20 }]}>Notes</Text>
                <TextInput
                  style={[styles.editInput, styles.editInputMultiline]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add notes, how you felt, PRs…"
                  placeholderTextColor="#555"
                  maxLength={500}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={!isSaving}
                />
                <Text style={styles.editCharCount}>{editNotes.length}/500</Text>

                {/* Divider + read-only stats reminder */}
                <View style={styles.editDivider} />
                <Text style={styles.editHint}>
                  <MaterialCommunityIcons name="information-outline" size={12} color="#555" />
                  {' '}Exercise data, sets, reps and XP are read-only and cannot be changed.
                </Text>

                {/* Full-width save button */}
                <TouchableOpacity
                  style={[styles.editSaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveRoutineEdit}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="#000" />
                    : (
                      <>
                        <MaterialCommunityIcons name="content-save-outline" size={18} color="#000" />
                        <Text style={styles.editSaveBtnText}>Save Changes</Text>
                      </>
                    )
                  }
                </TouchableOpacity>

              </ScrollView>
            </KeyboardAvoidingView>
          </LinearGradient>
        </Modal>

        {/* ── MENU MODAL ────────────────────────────────────────────────────── */}
        <Modal visible={menuModalVisible} transparent animationType="fade" onRequestClose={() => setMenuModalVisible(false)}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuModalVisible(false)}>
            <View style={styles.menuContainer}>

              <TouchableOpacity style={styles.menuItem} onPress={handleEditPost}>
                <MaterialCommunityIcons name="pencil" size={20} color="#C8FF00" />
                <Text style={styles.menuItemText}>Edit Post</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />

              <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDeletePost} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator size="small" color="#FF4444" /> : <MaterialCommunityIcons name="trash-can" size={20} color="#FF4444" />}
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: { marginBottom: 20 },
  sectionLabel: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 16, color: '#fff', textTransform: 'uppercase', marginLeft: 20, marginBottom: 15 },
  container: { backgroundColor: '#191916', paddingVertical: 18, borderRadius: 2 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 10 },
  username: { color: '#FFFFFF', fontFamily: 'Montserrat_800ExtraBold', fontSize: 12 },
  timestamp: { color: '#666', fontSize: 10, marginTop: 1 },
  workoutTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Montserrat_900Black', paddingHorizontal: 20, marginTop: 7 },
  workoutDescription: { color: '#AAAAAA', fontSize: 12, fontFamily: 'Montserrat_500Medium', paddingHorizontal: 20, marginTop: 4, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 15 },
  statItem: { flex: 1 },
  statLabel: { color: '#888', fontSize: 11, fontFamily: 'Montserrat_600SemiBold', marginBottom: 4 },
  statValue: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Montserrat_800ExtraBold' },
  galleryImage: { width: IMAGE_WIDTH, height: 290, borderRadius: 10, marginRight: IMAGE_MARGIN },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  activeDot: { backgroundColor: '#EEE', width: 12 },
  seeMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#C8FF00', borderRadius: 8, backgroundColor: 'rgba(200, 255, 0, 0.05)' },
  seeMoreText: { color: '#C8FF00', fontSize: 13, fontFamily: 'Montserrat_700Bold', marginRight: 8 },

  achievementsRow: { marginHorizontal: 20, marginBottom: 20 },
  achievementsLabel: { color: '#888', fontSize: 11, fontFamily: 'Montserrat_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeWrapper: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  postBadgeIcon: { width: 35, height: 35 },

  // MODAL (shared)
  modalGradient: { flex: 1 },
  modalContent: { paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalCloseBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Montserrat_800ExtraBold', letterSpacing: 1 },
  modalRunTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Montserrat_900Black', paddingHorizontal: 20, marginTop: 20, marginBottom: 25 },
  modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  modalStatBox: { flex: 1, minWidth: '48%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  modalStatLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat_600SemiBold', marginBottom: 4 },
  modalStatValue: { color: '#C8FF00', fontSize: 18, fontFamily: 'Montserrat_900Black' },
  modalStatUnit: { color: '#666', fontSize: 9, fontFamily: 'Montserrat_500Medium', marginTop: 2 },
  modalSectionLabel: { color: '#888', fontSize: 11, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginTop: 25, marginBottom: 12 },
  modalDescriptionBox: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 16, marginHorizontal: 20, borderWidth: 1, borderColor: '#333' },
  modalDescriptionText: { color: '#DDD', fontSize: 13, lineHeight: 20, fontFamily: 'Montserrat_400Regular' },
  modalMapImage: { width: '100%', height: 200, marginBottom: 20 },

  // Exercise Breakdown (Routines)
  exerciseBreakdownCard: { backgroundColor: '#1A1A1A', marginHorizontal: 20, borderRadius: 10, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  exerciseBreakdownTitle: { color: '#FFF', fontFamily: 'Montserrat_800ExtraBold', fontSize: 16, marginBottom: 4 },
  exerciseBreakdownStats: { color: '#CCFF00', fontFamily: 'Montserrat_600SemiBold', fontSize: 11, marginBottom: 15 },
  setRowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 6, marginBottom: 8 },
  setRowHeaderText: { flex: 1, color: '#888', fontFamily: 'Montserrat_600SemiBold', fontSize: 10, textAlign: 'center' },
  setRow: { flexDirection: 'row', paddingVertical: 6 },
  setRowText: { flex: 1, color: '#DDD', fontFamily: 'Montserrat_500Medium', fontSize: 12, textAlign: 'center' },

  // EDIT MODAL
  editBadgeRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 24 },
  editBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(204,255,0,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)' },
  editBadgeText: { color: '#CCFF00', fontSize: 11, fontFamily: 'Montserrat_700Bold' },
  editFieldLabel: { color: '#888', fontSize: 11, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
  editInput: { backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#333', color: '#FFF', fontSize: 14, fontFamily: 'Montserrat_500Medium', paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 20 },
  editInputMultiline: { minHeight: 120, paddingTop: 14 },
  editCharCount: { color: '#444', fontSize: 10, fontFamily: 'Montserrat_500Medium', textAlign: 'right', paddingHorizontal: 20, marginTop: 5 },
  editDivider: { height: 1, backgroundColor: '#222', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  editHint: { color: '#555', fontSize: 11, fontFamily: 'Montserrat_400Regular', paddingHorizontal: 20, lineHeight: 16, marginBottom: 24 },
  editSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C8FF00', borderRadius: 10, paddingVertical: 15, marginHorizontal: 20 },
  editSaveBtnText: { color: '#000', fontSize: 15, fontFamily: 'Montserrat_800ExtraBold' },
  editSaveHeaderBtn: { backgroundColor: '#C8FF00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  editSaveHeaderBtnText: { color: '#000', fontSize: 13, fontFamily: 'Montserrat_800ExtraBold' },

  // MENU
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  menuContainer: { backgroundColor: '#191916', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 20, paddingTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  menuItemDanger: { opacity: 0.9 },
  menuItemText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
  menuItemTextDanger: { color: '#FF4444' },
  menuDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 20 },
});