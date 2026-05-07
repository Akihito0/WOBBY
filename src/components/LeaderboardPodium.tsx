import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

interface LeaderboardUser {
  id: string;
  rank: number;
  username: string;
  xp: number;
  avatar_url: string | null;
}

const LeaderboardPodium: React.FC = () => {
  const navigation = useNavigation<any>();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch top 3 users from profiles sorted by XP descending
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, username, xp, avatar_url')
        .order('xp', { ascending: false })
        .limit(3);

      if (error) {
        console.log('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Fetched leaderboard users:', allUsers);

      if (allUsers && allUsers.length > 0) {
        // Add ranks to users
        const rankedUsers = allUsers.map((user: any, index: number) => ({
          ...user,
          rank: index + 1,
        }));

        console.log('📊 Ranked users with avatars:', rankedUsers);
        setTopUsers(rankedUsers);
      } else {
        console.log('⚠️ No users found in leaderboard');
      }
    } catch (error) {
      console.log('❌ Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 LeaderboardPodium focused - fetching data...');
      fetchTopLeaderboard();
    }, [fetchTopLeaderboard])
  );

  // Get users by rank for display (rank 2, rank 1, rank 3)
  const rank1 = topUsers.find((u) => u.rank === 1);
  const rank2 = topUsers.find((u) => u.rank === 2);
  const rank3 = topUsers.find((u) => u.rank === 3);

  console.log('🎯 Rendering avatars:', {
    rank1: rank1?.username,
    rank1Avatar: rank1?.avatar_url,
    rank2: rank2?.username,
    rank2Avatar: rank2?.avatar_url,
    rank3: rank3?.username,
    rank3Avatar: rank3?.avatar_url,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Leaderboards</Text>

      <View style={styles.podiumWrapper}>
        
        {/* ─── BACKGROUND IMAGE SPOTLIGHT ─── */}
        <Image 
          source={require('../assets/podiumbg.png')} 
          style={styles.bgImage}
          resizeMode="contain"
        />

        {/* ─── CROWN ─── */}
        <Image 
          source={require('../assets/crown_icon.png')} 
          style={styles.crown} 
        />

        {/* ─── AVATARS ROW ─── */}
        <View style={styles.avatarRow}>
          {/* Rank 2 (Left) */}
          <View style={styles.rank2}>
            <View style={styles.borderCircle}>
              {rank2?.avatar_url && rank2.avatar_url.trim() ? (
                <Image 
                  source={{ uri: rank2.avatar_url }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <Image source={require('../assets/1.png')} style={styles.avatarImg} />
              )}
            </View>
          </View>

          {/* Rank 1 (Winner - Center) */}
          <View style={styles.rank1}>
            <View style={[styles.borderCircle, styles.winnerBorder]}>
              {rank1?.avatar_url && rank1.avatar_url.trim() ? (
                <Image 
                  source={{ uri: rank1.avatar_url }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <Image source={require('../assets/2.png')} style={styles.avatarImg} />
              )}
            </View>
          </View>

          {/* Rank 3 (Right) */}
          <View style={styles.rank3}>
            <View style={styles.borderCircle}>
              {rank3?.avatar_url && rank3.avatar_url.trim() ? (
                <Image 
                  source={{ uri: rank3.avatar_url }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <Image source={require('../assets/3.png')} style={styles.avatarImg} />
              )}
            </View>
          </View>
        </View>

        {/* ─── PODIUM BASE ─── */}
        <Image 
          source={require('../assets/podium_base.png')} 
          style={styles.podiumBase} 
          resizeMode="stretch" 
        />
      </View>

      <TouchableOpacity
        style={styles.viewLink}
        onPress={() => navigation.navigate('Performance', { screen: 'LeaderboardsScreen' })}
      >
        <Text style={styles.viewLinkText}>View Leaderboards</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LeaderboardPodium;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#121310',
  },
  sectionLabel: {
    fontFamily: "Montserrat_900Black",
    fontSize: 16,
    color: "#fff",
    alignSelf: 'flex-start',
    marginLeft: 16,
    textTransform: "uppercase",
    marginBottom: 30,
  },
  podiumWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 330,
    width: '100%',
    position: 'relative',
  },
  bgImage: {
    position: 'absolute',
    top: -50,
    width: 320,
    height: 320,
    zIndex: 0,
    opacity: 0.9,   
  },
  crown: {
    width: 50,
    height: 50,
    marginBottom: 50,
    zIndex: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 5,
  },
  borderCircle: {
    width: 90,
    height: 90,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#CCFF00',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  winnerBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarImg: { 
    width: '100%', 
    height: '100%' 
  },
  rank1: {
    zIndex: 3,
    marginHorizontal: -20,
    transform: [{ translateY: -40 }],
  },
  rank2: { 
    zIndex: 2 
  },
  rank3: { 
    zIndex: 1 
  },
  podiumBase: {
    width: '50%',
    height: 80,
    marginTop: -30,
    zIndex: 0,
  },
  viewLink: { 
    marginTop: -30,
    marginBottom: -10
  },
  viewLinkText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#CCFF00",
  },
});