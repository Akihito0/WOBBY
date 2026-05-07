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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';


const { width } = Dimensions.get('window');

const IMAGE_WIDTH = width * 0.65;
const IMAGE_MARGIN = 12;
const ITEM_SIZE = IMAGE_WIDTH + IMAGE_MARGIN;
// Padding so each item snaps centered
const SIDE_INSET = (width - IMAGE_WIDTH) / 2;

// Helper function to format duration from seconds to HH:MM format
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper function to format date to readable format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('en-US', options);
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
  average_elevation?: number;
  route_map_url?: string;
}

const ActivityFeed = ({ 
  username = 'Guest', 
  avatarUrl, 
  runData,
  onRefresh,
  navigation,
}: { 
  username?: string; 
  avatarUrl?: string | null; 
  runData?: RunData;
  onRefresh?: () => void;
  navigation?: any;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Use real media from run, or fallback to placeholder images
  const workoutGallery = useMemo(() => {
    if (runData?.media_urls && runData.media_urls.length > 0) {
      return runData.media_urls.map(url => ({ uri: url }));
    }
    // Fallback to placeholder images
    return [
      require('../assets/workout_1.png'),
      require('../assets/workout_2.png'),
      require('../assets/workout_3.png'),
    ];
  }, [runData?.media_urls]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_SIZE);
    setCurrentIndex(Math.min(Math.max(index, 0), workoutGallery.length - 1));
  };

  // ── DELETE POST ──
  const handleDeletePost = async () => {
    if (!runData?.id) {
      Alert.alert('Error', 'Post ID not found');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const { error } = await supabase
                .from('runs')
                .delete()
                .eq('id', runData.id);

              if (error) {
                Alert.alert('Error', `Failed to delete post: ${error.message}`);
                return;
              }

              Alert.alert('Success', 'Post deleted successfully');
              setMenuModalVisible(false);
              onRefresh?.();
            } catch (err) {
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Delete error:', err);
            } finally {
              setIsDeleting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // ── UPDATE POST ──
  const handleEditPost = () => {
    if (!navigation) {
      Alert.alert('Error', 'Navigation not available');
      return;
    }

    if (!runData?.id) {
      Alert.alert('Error', 'Post ID not found');
      return;
    }

    // Navigate to Run screen with edit data
    navigation.navigate('Workout', {
  screen: 'RunScreen',
  params: {
    isEditing: true,
    runDataToEdit: runData,
  },
});

    setMenuModalVisible(false);
  };

  // If no run data, show a placeholder or hide the component
  if (!runData) {
    return null;
  }

  const formattedDate = formatDate(runData.completed_at);
  const formattedDuration = formatDuration(runData.duration);
  const runMode = runData.workout_type || 'Solo';

  return (
    <View style={styles.rootWrapper}>
      <Text style={styles.sectionLabel}>Activity Vault</Text>

      <View style={styles.container}>
        {/* ── USER HEADER ── */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Image source={avatarUrl ? { uri: avatarUrl } : require('../assets/user.png')} style={styles.avatar} />
            <View>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.timestamp}>{formattedDate}</Text>
            </View>
          </View>
          <TouchableOpacity 
            hitSlop={10}
            onPress={() => setMenuModalVisible(true)}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#A8A8A8" />
          </TouchableOpacity>
        </View>

        {/* ── WORKOUT TITLE ── */}
        <Text style={styles.workoutTitle}>{runData.title}</Text>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formattedDuration}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{runData.distance.toFixed(2)} km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { textAlign: 'right' }]}>Mode</Text>
            <Text style={[styles.statValue, { textAlign: 'right' }]}>{runMode}</Text>
          </View>
        </View>

        {/* ── CONGRATS BANNER ── */}
        <View style={styles.congratsBanner}>
          <Image source={require('../assets/trophy.png')} style={styles.trophyIconImage} />
          <Text style={styles.congratsText}>
            🎉 Awesome run! You completed {runData.distance.toFixed(1)}km at {runData.pace} /km!
          </Text>
        </View>

        {/* ── SEE MORE BUTTON ── */}
        <TouchableOpacity 
          style={styles.seeMoreBtn}
          onPress={() => setDetailsModalVisible(true)}
        >
          <Text style={styles.seeMoreText}>See More Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#C8FF00" />
        </TouchableOpacity>

        {/* ── GALLERY ── */}
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
                <Image 
                  source={typeof item === 'string' || (item && item.uri) ? item : item}
                  style={styles.galleryImage}
                />
              )}
            />

            {/* ── PAGINATION ── */}
            <View style={styles.paginationRow}>
              {workoutGallery.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === currentIndex && styles.activeDot]}
                />
              ))}
            </View>
          </>
        )}

        {/* ── DETAILS MODAL ── */}
        <Modal 
          visible={detailsModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <LinearGradient
            colors={['#001E20', '#0a0a0a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalGradient}
          >
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* ── MODAL HEADER ── */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>RUN DETAILS</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* ── MAP THUMBNAIL ── */}
              {runData.route_map_url && (
                <Image 
                  source={{ uri: runData.route_map_url }}
                  style={styles.modalMapImage}
                />
              )}

              {/* ── TITLE ── */}
              <Text style={styles.modalRunTitle}>{runData.title}</Text>

              {/* ── MAIN STATS ── */}
              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Distance</Text>
                  <Text style={styles.modalStatValue}>{runData.distance.toFixed(2)}</Text>
                  <Text style={styles.modalStatUnit}>km</Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>{formattedDuration}</Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Pace</Text>
                  <Text style={styles.modalStatValue}>{runData.pace}</Text>
                  <Text style={styles.modalStatUnit}>/km</Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatLabel}>Mode</Text>
                  <Text style={styles.modalStatValue}>{runMode}</Text>
                </View>
              </View>

              {/* ── ELEVATION SECTION ── */}
              {(runData.elevation_gain !== undefined && runData.elevation_gain > 0) && (
                <>
                  <Text style={styles.modalSectionLabel}>Elevation</Text>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Gain</Text>
                      <Text style={styles.modalStatValue}>{runData.elevation_gain || 0}</Text>
                      <Text style={styles.modalStatUnit}>m</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Loss</Text>
                      <Text style={styles.modalStatValue}>{runData.elevation_loss || 0}</Text>
                      <Text style={styles.modalStatUnit}>m</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Min</Text>
                      <Text style={styles.modalStatValue}>{runData.min_elevation || 0}</Text>
                      <Text style={styles.modalStatUnit}>m</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Max</Text>
                      <Text style={styles.modalStatValue}>{runData.max_elevation || 0}</Text>
                      <Text style={styles.modalStatUnit}>m</Text>
                    </View>
                  </View>
                </>
              )}

              {/* ── HEART RATE SECTION ── */}
              {(runData.average_bpm && runData.average_bpm > 0) && (
                <>
                  <Text style={styles.modalSectionLabel}>Heart Rate</Text>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Average</Text>
                      <Text style={styles.modalStatValue}>{runData.average_bpm}</Text>
                      <Text style={styles.modalStatUnit}>BPM</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>Peak</Text>
                      <Text style={[styles.modalStatValue, { color: '#FF4444' }]}>{runData.max_bpm || 0}</Text>
                      <Text style={styles.modalStatUnit}>BPM</Text>
                    </View>
                  </View>
                </>
              )}

              {/* ── DESCRIPTION ── */}
              {runData.description && runData.description.trim() && (
                <>
                  <Text style={styles.modalSectionLabel}>Description</Text>
                  <View style={styles.modalDescriptionBox}>
                    <Text style={styles.modalDescriptionText}>{runData.description}</Text>
                  </View>
                </>
              )}

              {/* ── DATE ── */}
              <Text style={styles.modalDateText}>{formattedDate}</Text>
            </ScrollView>
          </LinearGradient>
        </Modal>

        {/* ── MENU MODAL (Edit/Delete) ── */}
        <Modal
          visible={menuModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setMenuModalVisible(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEditPost}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#C8FF00" />
                <Text style={styles.menuItemText}>Edit Post</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF4444" />
                ) : (
                  <MaterialCommunityIcons name="trash-can" size={20} color="#FF4444" />
                )}
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                  Delete Post
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
};

export default ActivityFeed;

const styles = StyleSheet.create({
  rootWrapper: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    color: '#fff',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 15,
  },
  container: {
    backgroundColor: '#191916',
    paddingVertical: 18,
    borderRadius: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  username: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 12,
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    marginTop: 1,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_900Black',
    paddingHorizontal: 20,
    marginBottom: 18,
    marginTop: 7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gemIcon: {
    width: 16,
    height: 16,
    marginLeft: 2,
  },
  congratsBanner: {
    backgroundColor: '#797979',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 25,
  },
  trophyIconImage: {
    width: 30,
    height: 30,
    marginRight: 15,
    resizeMode: 'contain',
  },
  congratsText: {
    color: '#EAEAEA',
    fontSize: 12,
    flex: 1,
    fontFamily: 'Montserrat_200Regular',
    lineHeight: 18,
  },
  galleryImage: {
    width: IMAGE_WIDTH,
    height: 290,
    borderRadius: 10,
    marginRight: IMAGE_MARGIN,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
  },
  activeDot: {
    backgroundColor: '#EEE',
    width: 12,
  },
  
  // ── SEE MORE BUTTON ──
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#C8FF00',
    borderRadius: 8,
    backgroundColor: 'rgba(200, 255, 0, 0.05)',
  },
  seeMoreText: {
    color: '#C8FF00',
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    marginRight: 8,
  },

  // ── MODAL STYLES ──
  modalGradient: {
    flex: 1,
  },
  modalContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalMapImage: {
    width: '100%',
    height: 200,
    marginTop: 20,
  },
  modalRunTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Montserrat_900Black',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
  },
  modalSectionLabel: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  modalStatBox: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  modalStatLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  modalStatValue: {
    color: '#C8FF00',
    fontSize: 18,
    fontFamily: 'Montserrat_900Black',
  },
  modalStatUnit: {
    color: '#666',
    fontSize: 9,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
  modalDescriptionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalDescriptionText: {
    color: '#DDD',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  modalDateText: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
  },

  // ── MENU MODAL STYLES ──
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#191916',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemDanger: {
    opacity: 0.9,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  menuItemTextDanger: {
    color: '#FF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 20,
  },
});