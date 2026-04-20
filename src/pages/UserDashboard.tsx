import { useState } from "react";
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
import ChallengersCarousel from "../components/ChallengersCarousel";
import LeaderboardPodium from "../components/LeaderboardPodium";
import ActivityFeed from "../components/ActivityFeed";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts, Montserrat_900Black, Montserrat_800ExtraBold, Montserrat_600SemiBold } from "@expo-google-fonts/montserrat";
import { Barlow_400Regular } from "@expo-google-fonts/barlow";
import { useNavigation } from "@react-navigation/native";

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const [fontsLoaded] = useFonts({
    Montserrat_900Black,
    Montserrat_800ExtraBold,
    Montserrat_600SemiBold,
    Barlow_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── FIXED HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarRow}>
            <Image
              source={require("../assets/cashew.png")}
              style={styles.avatarImage}
            />
            <View>
              <Text style={styles.greetLabel}>Time to Grind,</Text>
              <Text style={styles.username}>cashew_123</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellWrap}
            onPress={() => navigation.navigate("Notifications")}>
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
        {/* ════════ STREAK ════════ */}
        <StreakCalendar navigation={navigation}/>

        {/* ════════ STATS CARDS ════════ */}
        <View style={styles.separator}>
        <StatsCards/>
        </View>

        {/* ════════ ACTIVITY FEED ════════ */}
        <ActivityFeed />

        {/* ════════ MOTIVATION BANNER ════════ */}
        <MotivationBanner/>

        {/* ════════ TARGETED SESSIONS ════════ */}     
        <TargetedSessions/>     

        {/* ════════ ONLINE CHALLENGERS ════════ */}
        <ChallengersCarousel />

        {/* ════════ LEADERBOARDS ════════ */}
        <LeaderboardPodium />

      </ScrollView>
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121310" },
  scroll: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 108 : 88,
  },
  scrollContent: { paddingBottom: 48 },
  // HEADER
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
    justifyContent: "space-between" 
  },
  avatarRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12 
  },
  avatarImage: { 
    width: 39, 
    height: 39, 
    borderRadius: 10, 
    marginRight: 4 
  },
  greetLabel: { 
    fontFamily: "Montserrat_800ExtraBold", 
    fontSize: 12, 
    color: "#A8A8A8", 
    marginTop: 7 
  },
  username:   { 
    fontFamily: "Montserrat_800ExtraBold", 
    fontSize: 18, 
    color: "#FFFFFF", 
    marginTop: -3
  },
  bellWrap:   { 
    position: "relative", 
    padding: 4 
  },
  bellImage:  { 
    width: 25, 
    height: 25, 
    tintColor: "#fff" 
  },
  notifDot:   { 
    width: 8, 
    height: 8, 
    borderRadius: 5, 
    backgroundColor: "#ff4444", 
    position: "absolute", 
    top: 5, 
    right: 5, 
    borderWidth: 1, 
    borderColor: "#000" },

  // SHARED
  sectionLabel: {
    fontFamily: "Montserrat_600SemiBold", 
    fontSize: 15, 
    color: "#fff",
    textTransform: "uppercase",
    marginLeft: 16, 
    marginBottom: 12,
  },
  seeAll: { 
    fontFamily: "Barlow_400Regular", 
    fontSize: 13, 
    color: "#84cc16", 
    fontWeight: "600", 
  },
  hrule:  { 
    height: 1, 
    backgroundColor: "#1e1e1e" 
  },
  section: { 
    paddingHorizontal: 16, 
    paddingTop: 18, 
    paddingBottom: 8 
  },
  separator: {
    marginTop: 20,
    marginBottom: 10,
  },
  
  
});