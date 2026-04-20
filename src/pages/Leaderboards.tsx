import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface LeaderboardUser {
  rank: number;
  username: string;
  xp: number;
  avatar: any; // Using require() for local assets or {uri} for remote
}

// ─── MOCK DATA (Matches the Rank 4-10 in your image) ─────────────────────────
const MOCK_USERS: LeaderboardUser[] = [
  { rank: 1, username: 'cashew_123', xp: 1001, avatar: null },
  { rank: 2, username: '6CLARK7',    xp: 1000, avatar: null },
  { rank: 3, username: 'NoWaHG',     xp: 999,  avatar: null },
  { rank: 4, username: 'Ness_XX',    xp: 900,  avatar: null },
  { rank: 5, username: 'Rain',       xp: 800,  avatar: null },
  { rank: 6, username: 'TwT23',      xp: 700,  avatar: null },
  { rank: 7, username: 'Jonard',     xp: 600,  avatar: null },
  { rank: 8, username: 'Ald_MF_rich',xp: 500,  avatar: null },
  { rank: 9, username: 'Laurence143',xp: 400,  avatar: null },
  { rank: 10, username: 'GabGab_suan',xp: 300, avatar: null },
];

const CURRENT_USER = { username: 'cashew_123', percentile: '12.07' };

// ─── AVATAR COMPONENT ─────────────────────────────────────────────────────────
const Avatar = ({ size = 40 }: { size?: number }) => (
  <View style={[styles.avatarBox, { width: size, height: size, borderRadius: 8 }]}>
  </View>
);

// ─── LEADERBOARD ROW ──────────────────────────────────────────────────────────
const LeaderboardRow = ({ user }: { user: LeaderboardUser }) => (
  <View style={styles.row}>
    <Text style={styles.rowRank}>{user.rank}</Text>
    <Avatar size={40} />
    <Text style={styles.rowUsername}>{user.username}</Text>
    <Text style={styles.rowXP}>{user.xp} XP</Text>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const LeaderboardsScreen = () => {
  const navigation = useNavigation();

  // Filter out the top 3 since they are displayed in your static podium image
  const listUsers = MOCK_USERS.filter(u => u.rank >= 4);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── HEADER (262deg Gradient) ── */}
      <LinearGradient
        colors={['#534600', '#000000']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/back0.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LEADERBOARDS</Text>
        <View style={{ width: 36 }} /> 
      </LinearGradient>

      {/* ── BODY (Multi-stop Gradient) ── */}
      <LinearGradient
        colors={['#001316', '#192516', '#373406', '#683D00']}
        locations={[0.1, 0.3, 0.5, 0.8]}
        style={styles.body}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── PODIUM USERS SECTION ── */}
          <View style={styles.podiumWrapper}>
            {/* Rank 1 (Center - Highest) */}
            <View style={[styles.podiumUser, { alignSelf: 'center', bottom: 110 }]}>
              <Text style={[styles.podiumUsername, styles.rank1Text]}>cashew_123</Text>
              <View style={[styles.podiumAvatarBox, styles.rank1Avatar]} />
              <Text style={[styles.podiumXPLabel, styles.rank1Text]}>1001 XP</Text>
            </View>

            {/* Rank 2 (Left - Medium Height) */}
            <View style={[styles.podiumUser, { left: '13%', bottom: 70 }]}>
              <Text style={styles.podiumUsername}>6CLARK7</Text>
              <View style={styles.podiumAvatarBox} />
              <Text style={styles.podiumXPLabel}>1000 XP</Text>
            </View>

            {/* Rank 3 (Right - Lowest) */}
            <View style={[styles.podiumUser, { right: '13%', bottom: 40 }]}>
              <Text style={styles.podiumUsername}>NoWaHG</Text>
              <View style={styles.podiumAvatarBox} />
              <Text style={styles.podiumXPLabel}>999 XP</Text>
            </View>
          </View>

          {/* ── PODIUM IMAGE ── */}
          <View style={styles.podiumImageContainer}>
            <Image 
              source={require('../assets/podiummm.png')} 
              style={styles.podiumImage} 
            />
          </View>

          {/* ── RANK LIST (Light Grey Overlay) ── */}
          <View style={styles.listCard}>
            {listUsers.map((user, index) => (
              <React.Fragment key={user.rank}>
                <LeaderboardRow user={user} />
                {index < listUsers.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

        </ScrollView>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerAvatar}>
             {/* Placeholder for current user avatar */}
          </View>
          <Text style={styles.footerText}>
              {CURRENT_USER.username}                          TOP {CURRENT_USER.percentile}%
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default LeaderboardsScreen;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backIcon: {
   width: 30, 
    height: 30, 
    position: 'absolute', 
    left: 12,
    marginTop: -65,
  },
  headerTitle: { 
    color: '#d1d1d1', 
    fontSize: 32, 
    fontFamily: 'Montserrat-Black', 
    right: -45,
    bottom: -10,
},
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
 podiumWrapper: {
  alignItems: 'center',
    marginTop: -100,
    marginBottom: -80,
    height: 380,         // 💡 CRITICAL: This gives the floating users a "box" to stay in
    width: width,
    zIndex: 1,
},
podiumImage: {
  width: 300,
  height: 300,
  resizeMode: 'contain',
},
podiumImageContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: -60,
  marginBottom: 1,
},
  podiumUser: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
    zIndex: 2,
},
  podiumUsername: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 12,
    marginBottom: 4,
},
  rank1Text: {
    color: '#CCFF00',
    // Mocking the .2 stroke via shadow as React Native doesn't support text-stroke natively
    textShadowColor: '#CCFF00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.2, 
  },
  podiumAvatarBox: {
    width: 56,
    height: 56,
    backgroundColor: '#333', // Placeholder color
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rank1Avatar: {
    width: 70, // Rank 1 is slightly larger
    height: 70,
    borderColor: '#CCFF00',
    borderWidth: 2,
  },
  podiumXPLabel: {
    color: '#ABABAB',
    fontFamily: 'Barlow-Bold',
    fontSize: 11,
    marginTop: 4,
  },
listCard: {
    // 40% opacity white = rgba(255, 255, 255, 0.4)
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // 70% opacity grey,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
    minHeight: 500,
    width: 360,
    alignSelf: 'center',
    marginTop: -60, 
    marginBottom: 0,      // Ensure no margin at the bottom
    flex: 1,              // Allows it to fill the remaining space
},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  rowRank: {
    color: '#FFEA81',
    fontFamily: 'Barlow-Bold',
    fontSize: 18,
    width: 35,
  },
  avatarBox: {
    marginRight: 15,
    backgroundColor: '#FFF',
    elevation: 2,
  },
  rowUsername: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 17,
  },
  rowXP: {
    color: '#E5FF7B',
    fontFamily: 'Barlow-Bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  footerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: '#A3CF06',
    marginRight: 10,
  },
  footerText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});