import React, { useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase';
import LoadLB from '../components/LoadLB';

const { width } = Dimensions.get('window');

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface LeaderboardUser {
  id: string;
  rank: number;
  username: string;
  xp: number;
  avatar_url: string | null;
}

// ─── DEFAULT VALUES ─────────────────────────────────────────────────────────
const CURRENT_USER = { username: '', xp: 0, percentile: '0.00' };

// ─── AVATAR COMPONENT ─────────────────────────────────────────────────────────
const Avatar = ({ avatar_url, size = 40 }: { avatar_url?: string | null; size?: number }) => (
  <View style={[styles.avatarBox, { width: size, height: size, borderRadius: 8 }]}>
    {avatar_url ? (
      <Image
        source={{ uri: avatar_url }}
        style={{ width: size, height: size, borderRadius: 8 }}
      />
    ) : null}
  </View>
);

// ─── LEADERBOARD ROW ──────────────────────────────────────────────────────────
const LeaderboardRow = ({ user }: { user: LeaderboardUser }) => (
  <View style={styles.row}>
    <Text style={styles.rowRank}>{user.rank}</Text>
    <Avatar avatar_url={user.avatar_url} size={40} />
    <Text style={styles.rowUsername}>{user.username}</Text>
    <Text style={styles.rowXP}>{user.xp} XP</Text>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const LeaderboardsScreen = () => {
  const navigation = useNavigation();
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    xp: number;
    rank: number;
    percentile: string;
    avatar_url: string | null;
  }>({
    username: '',
    xp: 0,
    rank: 0,
    percentile: '0.00',
    avatar_url: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch all users from profiles sorted by XP descending
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, username, xp, avatar_url')
        .order('xp', { ascending: false });

      if (error) throw error;

      if (allUsers && allUsers.length > 0) {
        // Add ranks to all users
        const rankedUsers = allUsers.map((user: any, index: number) => ({
          ...user,
          rank: index + 1,
        }));

        setLeaderboardUsers(rankedUsers);

        // Find current user in the leaderboard
        const currentUserData = rankedUsers.find((u: any) => u.id === authUser.id);
        if (currentUserData) {
          const percentile = ((rankedUsers.length - currentUserData.rank + 1) / rankedUsers.length * 100).toFixed(2);
          setCurrentUser({
            username: currentUserData.username,
            xp: currentUserData.xp || 0,
            rank: currentUserData.rank,
            percentile,
            avatar_url: currentUserData.avatar_url || null,
          });
        }
      }
    } catch (error: any) {
      console.log('Error fetching leaderboard:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

  // Get top 3 users for podium
  const podiumUsers = leaderboardUsers.slice(0, 3);

  // Get remaining users for list (rank 4+)
  const listUsers = leaderboardUsers.filter(u => u.rank >= 4);

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
          {podiumUsers.length > 0 && (
            <View style={styles.podiumWrapper}>
              {/* Rank 1 (Center - Highest) */}
              {podiumUsers[0] && (
                <View style={[styles.podiumUser, { alignSelf: 'center', bottom: 110 }]}>
                  <Text style={[styles.podiumUsername, styles.rank1Text]}>{podiumUsers[0].username}</Text>
                  <Avatar avatar_url={podiumUsers[0].avatar_url} size={70} />
                  <Text style={[styles.podiumXPLabel, styles.rank1Text]}>{podiumUsers[0].xp} XP</Text>
                </View>
              )}

              {/* Rank 2 (Left - Medium Height) */}
              {podiumUsers[1] && (
                <View style={[styles.podiumUser, { left: '13%', bottom: 70 }]}>
                  <Text style={styles.podiumUsername}>{podiumUsers[1].username}</Text>
                  <Avatar avatar_url={podiumUsers[1].avatar_url} size={56} />
                  <Text style={styles.podiumXPLabel}>{podiumUsers[1].xp} XP</Text>
                </View>
              )}

              {/* Rank 3 (Right - Lowest) */}
              {podiumUsers[2] && (
                <View style={[styles.podiumUser, { right: '13%', bottom: 40 }]}>
                  <Text style={styles.podiumUsername}>{podiumUsers[2].username}</Text>
                  <Avatar avatar_url={podiumUsers[2].avatar_url} size={56} />
                  <Text style={styles.podiumXPLabel}>{podiumUsers[2].xp} XP</Text>
                </View>
              )}
            </View>
          )}

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
              <React.Fragment key={user.id}>
                <LeaderboardRow user={user} />
                {index < listUsers.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

        </ScrollView>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerAvatar}>
            {currentUser.avatar_url ? (
              <Image
                source={{ uri: currentUser.avatar_url }}
                style={{ width: 30, height: 30, borderRadius: 5 }}
              />
            ) : (
              <View style={{ width: 30, height: 30, borderRadius: 5, backgroundColor: '#A3CF06' }} />
            )}
          </View>
          <Text style={styles.footerText}>
            {currentUser.username || 'Loading...'}                          TOP {currentUser.percentile}%
          </Text>
        </View>
      </LinearGradient>

      <LoadLB visible={loading} />
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