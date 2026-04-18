import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const workoutGallery = [
  require('../assets/workout_1.png'),
  require('../assets/workout_2.png'),
  require('../assets/workout_3.png'),
];

const IMAGE_WIDTH = width * 0.65;
const IMAGE_MARGIN = 12;
const ITEM_SIZE = IMAGE_WIDTH + IMAGE_MARGIN;
// Padding so each item snaps centered
const SIDE_INSET = (width - IMAGE_WIDTH) / 2;

const ActivityFeed = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_SIZE);
    setCurrentIndex(Math.min(Math.max(index, 0), workoutGallery.length - 1));
  };

  return (
    <View style={styles.rootWrapper}>
      <Text style={styles.sectionLabel}>Activity Vault</Text>

      <View style={styles.container}>
        {/* ── USER HEADER ── */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Image source={require('../assets/cashew.png')} style={styles.avatar} />
            <View>
              <Text style={styles.username}>cashew_123</Text>
              <Text style={styles.timestamp}>January 1, 2026 at 12:00 AM • Cebu City</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={10}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#A8A8A8" />
          </TouchableOpacity>
        </View>

        {/* ── WORKOUT TITLE ── */}
        <Text style={styles.workoutTitle}>Chest Day!</Text>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>5 hrs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mode</Text>
            <Text style={styles.statValue}>Solo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { textAlign: 'right' }]}>Achievements</Text>
            <View style={styles.xpContainer}>
              <Text style={styles.statValue}>10XP </Text>
              <Image source={require('../assets/xp_gem.png')} style={styles.gemIcon} />
            </View>
          </View>
        </View>

        {/* ── CONGRATS BANNER ── */}
        <View style={styles.congratsBanner}>
          <Image source={require('../assets/trophy.png')} style={styles.trophyIconImage} />
          <Text style={styles.congratsText}>
            Congrats! You have completed your upper body workout!
          </Text>
        </View>

        {/* ── GALLERY ── */}
        <FlatList
          ref={flatListRef}
          data={workoutGallery}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          snapToInterval={ITEM_SIZE}
          snapToAlignment="start"       // Keep "start" — the inset shifts the visual center
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // ── iOS: use contentInset to pad both sides so first/last items center ──
          {...(Platform.OS === 'ios'
            ? {
                contentInset: { left: SIDE_INSET, right: SIDE_INSET },
                contentOffset: { x: -SIDE_INSET, y: 0 },
              }
            : {
                // ── Android: contentInset not supported, use contentContainerStyle padding ──
                contentContainerStyle: { paddingHorizontal: SIDE_INSET },
              })}
          renderItem={({ item }) => (
            <Image source={item} style={styles.galleryImage} />
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
      </View>
    </View>
  );
};

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
});

export default ActivityFeed;