import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  StatusBar,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ACHIEVEMENT_DATA } from './Achievements';

const { width } = Dimensions.get('window');

const PerformanceScreen = () => {
  const navigation = useNavigation();

  // XP data (replace with real data)
  const xpPoints = 1000;

  // States
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [showDailyGains, setShowDailyGains] = useState(false);
  const [showLifetimeArchive, setShowLifetimeArchive] = useState(false);

  // Achievements data - show 5-6 achievements, but only 3 visible initially
  const achievements = ACHIEVEMENT_DATA.slice(0, 6);

  // Animated flowing bar
  const flowAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(flowAnim, {
        toValue: width,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} bounces={false}>

        {/* ── HEADER ── */}
        <ImageBackground
          source={require('../assets/perfBG.png')}
          style={[styles.header, showInfoDropdown && styles.headerExpanded]}
          resizeMode="cover"
        >
          {/* Username */}
          {/*<View style={styles.usernameRow}>*/}
          {/*<Image source={require('../assets/1.png')} style={styles.avatar} />*/}
          {/*<Text style={styles.username}>cashew_12345</Text>*/}
          {/*</View>*/}

          {/* XP Card */}
          <View style={[styles.xpCard, showInfoDropdown && styles.xpCardExpanded]}>
            {/* Label row */}
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>   YOUR CUMULATIVE XP</Text>
              <TouchableOpacity
                onPress={() => setShowInfoDropdown(!showInfoDropdown)}
                activeOpacity={0.7}
              >
                <Image source={require('../assets/info.png')} style={styles.infoIcon} />
              </TouchableOpacity>
            </View>

            {/* Info tooltip */}
            {showInfoDropdown && (
              <View>
                <Text style={styles.infoTooltipText}>
                  Your XP grows with every move. Earn points for every successful rep and
                  completed session to climb the leaderboards!
                </Text>
              </View>
            )}

            {/* XP Number */}
            <Text style={styles.xpNumber}>{xpPoints} XP</Text>

            {/* Flowing animated bar */}
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFlow,
                  { transform: [{ translateX: flowAnim }] },
                ]}
              />
            </View>
          </View>
        </ImageBackground>

        {/* ── BODY ── */}
        <View style={styles.body}>

          {/* Daily Gains + Lifetime Archive row */}
          <View style={styles.topButtonsRow}>
            {/* Daily Gains dropdown trigger */}
            <TouchableOpacity
              style={styles.dailyGainsBtn}
              onPress={() => setShowDailyGains(!showDailyGains)}
              activeOpacity={0.8}
            >
              <Text style={styles.dailyGainsTxt}>Daily Gains</Text>
              <Image source={showDailyGains ? require('../assets/dropup.png') : require('../assets/droppp.png')} style={styles.dropIcon} />
            </TouchableOpacity>

            {/* Lifetime Archive */}
            <TouchableOpacity
              style={styles.lifetimeBtn}
              onPress={() => setShowLifetimeArchive(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.lifetimeTxt}>Lifetime Archive</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Gains dropdown panel */}
          {showDailyGains && (
            <View style={styles.dailyGainsPanel}>
              <Text style={styles.noRecordText}>No XP collected today yet. Start a session to earn points!</Text>
            </View>
          )}

          {/* Leaderboards button */}
<TouchableOpacity
  style={styles.leaderboardsBtnWrapper}
  onPress={() => navigation.navigate('LeaderboardsScreen' as never)}
  activeOpacity={0.85}
>
  <LinearGradient
    colors={['#161300', '#534600']}
    // 269deg starts from the right (6.98%) and moves to the left (95.76%)
    start={{ x: 1, y: 0.5 }} 
    end={{ x: 0, y: 0.5 }}
    style={styles.leaderboardsGradient}
  >
    <Text style={styles.leaderboardsTxt}>LEADERBOARDS</Text>
    <Image source={require('../assets/star0.png')} style={styles.starIcon} />
  </LinearGradient>
</TouchableOpacity>

          {/* Achievements section */}
          <View style={styles.achievementsHeader}>
            <Text style={styles.achievementsTitle}>ACHIEVEMENTS</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AchievementsScreen' as never)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Achievements expandable area */}
          <ScrollView
            style={styles.achievementsBody}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.achievementsContent}
          >
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <View 
                  key={achievement.id} 
                  style={styles.achievementItem}
                >
                  <Image source={achievement.image} style={styles.medalIcon} />
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.awaitingText}>Awaiting your first breakthrough</Text>
            )}
          </ScrollView>

          {/* Challenge History */}
          <Text style={styles.challengeLogsTitle}>Challenge History</Text>

        <View style={styles.challengeLogsContainer}>
          {[
            { id: '1', status: 'VICTORY', name: 'PUSH UPS', r: 8, s: 10 },
            { id: '2', status: 'DEFEAT', name: 'SQUATS', r: 8, s: 10 },
          ].map((item) => {
            const isVictory = item.status === 'VICTORY';
            
    return (
      <TouchableOpacity 
        key={item.id} 
        activeOpacity={0.85} 
        style={styles.logWrapper}
      >
        <LinearGradient
          colors={isVictory ? ['#000000', '#324727'] : ['#000000', '#3F1C1C']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.logCard}
        >
          {/* Profile Image - B&W/Tinted if Lose */}
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/5.png')} 
              style={[
                styles.logProfile, 
                !isVictory && { tintColor: 'gray', opacity: 0.7 } 
              ]} 
            />
          </View>

          {/* Dynamic Info */}
          <View style={styles.logInfo}>
            <Text style={styles.logExerciseText}>{item.name}</Text>
            <Text style={styles.logStatsText}>{item.r} reps</Text>
            <Text style={styles.logStatsText}>{item.s} sets</Text>
          </View>

          {/* Slanted Result Banner */}
          <View style={[
            styles.slantedBanner, 
            { backgroundColor: isVictory ? '#416F00' : '#740000' }
          ]}>
            <Text style={styles.resultText}>{item.status}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  })}
</View>

        </View>
      </ScrollView>

      {/* ── LIFETIME ARCHIVE MODAL ── */}
      <Modal
        visible={showLifetimeArchive}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLifetimeArchive(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLifetimeArchive(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Lifetime Archive</Text>
            <Text style={styles.modalPlaceholder}>XP history will appear here.</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowLifetimeArchive(false)}
            >
              <Text style={styles.modalCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default PerformanceScreen;

const styles = StyleSheet.create({
  safeArea: {
    //marginTop: StatusBar.currentHeight || 0,
    flex: 1,
    backgroundColor: '#121310',
    marginBottom: -10, // To counteract extra space from ScrollView
  },
  container: {
    flex: 1,
    backgroundColor: '#121310',
  },

  // ── HEADER ──
  header: {
    width: '106%',
    height: 242,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerExpanded: {
    height: 312,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  //avatar: {
  //  //width: 20,
  //  //height: 20,
  // // borderRadius: 16,
  //},
  username: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    fontWeight: '600',
    marginBottom: -2,
  },

  // XP Card
  xpCard: {
    borderRadius: 16,
    backgroundColor: '#081007',
    width: 322,
    height: 130,
    padding: 20,
    // iOS shadow
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 1,
    // Android shadow
    elevation: 20,
   right: -80, // To compensate for header's 106% width and align with edges
   marginTop: 40, // To pull the card up closer to the username row
  },
  xpCardExpanded: {
    height: 200,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  xpLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
  },
  infoIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
    right: 20,
  },
  infoTooltipText: {
    color: '#71E948',
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 18,
    textAlign: 'right',
    width: 255,
    marginTop: 10,
  },
  xpNumber: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-Black',
    fontSize: 40,
    marginVertical: 5,
    alignSelf: 'center',
  },

  // Flowing bar
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E2E1C',
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: -10
  },
  barFlow: {
    width: 120,
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#64C343',
    opacity: 0.9,
    // subtle soft glow effect via shadow on the animated view
    shadowColor: '#64C343',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // ── BODY ──
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Top buttons row
  topButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    height: 40,
  },
  dailyGainsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#9FAE64',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
  },
  dailyGainsTxt: {
    color: '#000',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 14,
  },
  dropIcon: {
    width: 14,
    height: 14,
    tintColor: '#000',
  },
  lifetimeBtn: {
    borderRadius: 15,
    borderWidth: 0.3,
    borderColor: '#EEFFAB',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifetimeTxt: {
    color: '#EEFFAB',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '600',
    fontSize: 13,
  },

  // Daily Gains panel
  dailyGainsPanel: {
    backgroundColor: '#111A0F',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#9FAE64',
    padding: 16,
    marginBottom: 16,
  },
  noRecordText: {
    color: '#9FAE64',
    fontFamily: 'Montserrat',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Leaderboards button
  leaderboardsBtnWrapper: {
    marginTop: 10,
    width: 353,
    height: 45,
    borderRadius: 12,
    overflow: 'hidden', // Ensures gradient doesn't bleed past corners
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FFF5BC',
    marginBottom: 40,
    // iOS shadow
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 25,
    shadowOpacity: 0.8,
    // Android elevation
    elevation: 10,
  },
  leaderboardsGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  leaderboardsTxt: {
    fontFamily: 'Montserrat-ExtraBold',
    color: '#FFF5BC', 
    fontSize: 18,
    marginRight: 10,
  },
  starIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },

  // Achievements
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 12,
  },
  achievementsTitle: {
    color: '#e4f4a6',
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
  },
  seeAll: {
    color: '#ccff00',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
  },
  achievementsBody: {
    backgroundColor: '#1F2118',
    width: '120%',
    marginLeft: -20,
    marginRight: -20,
    marginBottom: 40,
    borderRadius: 0,
  },
  achievementsContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    width: 100,
    flexShrink: 0,
  },
  medalIcon: {
    width: 81,
    height: 94,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  achievementName: {
    color: '#f0d158',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  awaitingText: {
    color: '#666',
    fontFamily: 'Montserrat-Bold',
    fontStyle: 'italic',
    fontSize: 13,
  },
  // ── MODAL ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: width * 0.85,
    backgroundColor: '#000',
    borderRadius: 10,
    borderWidth: 0.3,
    borderColor: '#EEFFAB',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#EEFFAB',
    fontFamily: 'Montserrat',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
  },
  modalPlaceholder: {
    color: '#666',
    fontFamily: 'Montserrat',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalCloseBtn: {
    backgroundColor: '#9FAE64',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  modalCloseTxt: {
    color: '#000',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 14,
  },
challengeLogsTitle: {
     color: '#e4f4a6',
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  challengeLogsContainer: {
    paddingBottom: 20,
  },
  logWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 105,
    marginBottom: 15,
  },
  logCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  imageContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  logProfile: {
    width: 75,
    height: 75,
    resizeMode: 'cover',
  },
  logInfo: {
    marginLeft: 15,
    flex: 1,
  },
  logExerciseText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Montserrat-Bold', // Montserrat for title
    textTransform: 'uppercase',
  },
  logStatsText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'Barlow-Medium', // Barlow for stats
    marginTop: -2,
  },
  slantedBanner: {
    position: 'absolute',
    right: -17, // Overhang to hide the skew edge
    top: 0,
    bottom: 0,
    width: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Barlow-SemiBold', // Barlow for the status
    transform: [{ skewX: '20deg' }], // Counter-skew to keep text upright
    textAlign: 'center',
    marginRight: 15,
  },
});