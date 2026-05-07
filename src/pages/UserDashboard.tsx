import { useState, useCallback } from "react";
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
export default function UserDashboard() {
  const [bmiModalVisible, setBmiModalVisible] = useState(false);
  const [refreshStats, setRefreshStats] = useState(0);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // State for both runs and routines
  const [latestRun, setLatestRun] = useState<any>(null);
  const [latestRoutine, setLatestRoutine] = useState<any>(null);
  const navigation = useNavigation<any>();

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

      // 1. Fetch latest run
      const { data: runData, error: runError } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (runError && runError.code !== 'PGRST116') console.log(runError);

      // 2. Fetch latest routine
      const { data: routineData, error: routineError } = await supabase
        .from('completed_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (routineError && routineError.code !== 'PGRST116') console.log(routineError);

      // 3. Compare timestamps
      const runTime = runData ? new Date(runData.completed_at).getTime() : 0;
      const routineTime = routineData ? new Date(routineData.created_at).getTime() : 0;

      if (runTime > routineTime) {
        setLatestRun(runData);
        setLatestRoutine(null);
      } else if (routineTime > runTime) {
        setLatestRoutine(routineData);
        setLatestRun(null);
      } else {
        setLatestRun(null);
        setLatestRoutine(null);
      }
    } catch (error: any) {
      console.log('Error fetching latest activity:', error.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
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
            <View style={styles.notifDot} />
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

        {/* Pass either runData OR routineData */}
        {latestRun || latestRoutine ? (
          <>
            <ActivityFeed
              username={username}
              avatarUrl={avatarUrl}
              runData={latestRun}
              routineData={latestRoutine}
              onRefresh={fetchLatestActivity}
              navigation={navigation}
            />
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
});