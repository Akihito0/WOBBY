import { useState, useCallback, useRef } from "react";
import { useNotifications } from '../context/NotificationContext';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
} from "react-native";
import StreakCalendar from "../components/layout/StreakCalendar";
import TargetedSessions from "../components/TargetedSessions";
import MotivationBanner from "../components/MotivationBanner";
import StatsCards from "../components/StatsCards";
import BMIModal from "../components/BMIModal";
import ChallengersCarousel from "../components/ChallengersCarousel";
import LeaderboardPodium from "../components/LeaderboardPodium";
import ActivityFeed from "../components/ActivityFeed";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts, Montserrat_900Black, Montserrat_800ExtraBold, Montserrat_600SemiBold } from "@expo-google-fonts/montserrat";
import { Barlow_400Regular } from "@expo-google-fonts/barlow";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase";

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export default function UserDashboard({ route }: any) {
  const prefetched = route?.params?.prefetchedData;
  const [bmiModalVisible, setBmiModalVisible] = useState(false);
  const [refreshStats, setRefreshStats] = useState(0);
  const [username, setUsername] = useState(prefetched?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(prefetched?.avatarUrl ?? null);
  const { unreadCount } = useNotifications();

  // Merged list of runs and routines, sorted newest-first.
  // Each entry: { kind: 'run' | 'routine', data, timestamp }
  const [posts, setPosts] = useState<Array<{ kind: 'run' | 'routine'; data: any; timestamp: number }>>(prefetched?.posts ?? []);
  const navigation = useNavigation<any>();
  const hasUsedPrefetchRef = useRef(!!prefetched);

  const [fontsLoaded] = useFonts({
    Montserrat_900Black,
    Montserrat_800ExtraBold,
    Montserrat_600SemiBold,
    Barlow_400Regular,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUsername(data.username ?? '');
      setAvatarUrl(data.avatar_url ?? null);
    } catch (error: any) {
      console.log('Error fetching profile:', error.message);
    }
  }, []);

  const fetchLatestActivity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [runsResult, routinesResult] = await Promise.all([
        supabase
          .from('runs')
          .select('*')
          .eq('user_id', user.id)
          .neq('workout_type', 'versus_run')
          .order('completed_at', { ascending: false }),
        supabase
          .from('completed_routines')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (runsResult.error && runsResult.error.code !== 'PGRST116') console.log(runsResult.error);
      if (routinesResult.error && routinesResult.error.code !== 'PGRST116') console.log(routinesResult.error);

      const runEntries = (runsResult.data || []).map((r: any) => ({
        kind: 'run' as const,
        data: r,
        timestamp: new Date(r.completed_at).getTime(),
      }));
      const routineEntries = (routinesResult.data || []).map((r: any) => ({
        kind: 'routine' as const,
        data: r,
        timestamp: new Date(r.created_at).getTime(),
      }));

      const merged = [...runEntries, ...routineEntries].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      setPosts(merged);
    } catch (error: any) {
      console.log('Error fetching latest activity:', error.message);
      setPosts([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Skip the first fetch if we already have prefetched data
      if (hasUsedPrefetchRef.current) {
        hasUsedPrefetchRef.current = false;
        return;
      }
      fetchProfile();
      fetchLatestActivity();
    }, [fetchProfile, fetchLatestActivity])
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── FIXED HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarRow}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require("../assets/cashew.png")}
              style={styles.avatarImage}
            />
            <View>
              <Text style={styles.greetLabel}>Time to Grind,</Text>
              <Text style={styles.username}>{username || 'Guest'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Image
              source={require("../assets/notif_bell.png")}
              style={styles.bellImage}
              resizeMode="contain"
            />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StreakCalendar navigation={navigation} />

        <View style={styles.separator}>
          <StatsCards onBMIPress={() => setBmiModalVisible(true)} />
        </View>

        {posts.length > 0 ? (
          <>
            <Text style={styles.activityVaultLabel}>Activity Vault</Text>
            {posts.map((post) => (
              <ActivityFeed
                key={`${post.kind}-${post.data.id}`}
                username={username}
                avatarUrl={avatarUrl}
                runData={post.kind === 'run' ? post.data : undefined}
                routineData={post.kind === 'routine' ? post.data : undefined}
                onRefresh={fetchLatestActivity}
                navigation={navigation}
              />
            ))}
            <LeaderboardPodium />
          </>
        ) : (
          <>
            <MotivationBanner />
            <TargetedSessions />
            <ChallengersCarousel />
            <LeaderboardPodium />
          </>
        )}
      </ScrollView>

      <BMIModal
        isVisible={bmiModalVisible}
        onClose={() => setBmiModalVisible(false)}
        onBMIUpdated={() => {
          setRefreshStats(refreshStats + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121310" },
  scroll: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 108 : 88,
  },
  scrollContent: { paddingBottom: 48 },

  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 52 : 32,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarImage: {
    width: 39,
    height: 39,
    borderRadius: 10,
    marginRight: 4,
  },
  greetLabel: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 12,
    color: "#A8A8A8",
    marginTop: 7,
  },
  username: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
    marginTop: -3,
  },
  bellWrap: {
    position: "relative",
    padding: 4,
  },
  bellImage: {
    width: 25,
    height: 25,
    tintColor: "#fff",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#ff4444",
    position: "absolute",
    top: 5,
    right: 5,
    borderWidth: 1,
    borderColor: "#000",
  },
  separator: {
    marginTop: 20,
    marginBottom: 10,
  },
  activityVaultLabel: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    color: '#fff',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 15,
  },
});