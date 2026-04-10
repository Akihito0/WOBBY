import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ViewStyle, 
  TextStyle,
  ImageSourcePropType,
  ImageStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── TYPES ─────────────────────────────────────────────────────────────────
type DayState = 'past' | 'today' | 'future';

interface WeekDay {
  label: string;
  day: number;
  state: DayState;
  isSameMonth: boolean;
}

// ─── LOGIC ──────────────────────────────────────────────────────────────────
const getCurrentWeek = (): WeekDay[] => {
  const now = new Date();
  const currentMonth = now.getMonth(); 
  const dayOfWeek = now.getDay(); 
  
  // Calculate difference to get to Monday (0 is Sunday, so map to 1-7)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const labels = ["M", "T", "W", "TH", "F", "SAT", "SUN"];
  
  return labels.map((label, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    
    let state: DayState = "future";
    const isSameMonth = d.getMonth() === currentMonth;

    if (d.toDateString() === now.toDateString()) {
      state = "today";
    } else if (d < now) {
      state = "past";
    }

    return { label, day: d.getDate(), state, isSameMonth };
  });
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────
const StreakCalendar: React.FC = () => {
  const weekDays = getCurrentWeek();

  // Ensure this asset path matches your project structure
  const fireIcon: ImageSourcePropType = require("../../assets/streak.png");

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#131304", "#1F2115", "#313911"]} 
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }} 
        end={{ x: 1, y: 0.5 }}
        style={styles.streakCard}
      >
        <View style={styles.streakHeader}>
          <Text style={styles.streakTitle}>STREAK</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.streakRow}>
          {/* Fire Indicator Section */}
          <View style={styles.fireCol}>
            <View style={styles.fireStack}>
              <Image 
                source={fireIcon} 
                style={styles.fireImage}
              />
              <Text style={styles.fireNumber}>0</Text>
            </View>
            <Text style={styles.weeksLabel}>WEEKS</Text>
          </View>

          {/* Days Section */}
          <View style={styles.daysWrapper}>
            {weekDays.map((item, index) => {
              // Rule: Circles only for the same month.
              const showCircle = item.isSameMonth;

              return (
                <View key={index} style={styles.dayCol}>
                  <Text style={styles.dayLabelText}>{item.label}</Text>
                  
                  <View style={[
                    styles.circleBase,
                    // Show white circle for any day in the current month
                    showCircle && { borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
                    // Override with Lime border if it is today
                    showCircle && item.state === 'today' && styles.circleToday,
                    // Different month gets no border
                    !showCircle && { borderWidth: 0 }
                  ]}>
                    <Text style={[
                      styles.numBase,
                      !showCircle 
                        ? { color: "#555555" } // Dark grey for dates of other month
                        : item.state === 'today' 
                          ? styles.numToday 
                          : { color: "#FFFFFF" } // White for all other dates in current month
                    ]}>
                      {item.day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default StreakCalendar;

// ─── STYLES ────────────────────────────────────────────────────────────────
interface Styles {
  container: ViewStyle;
  streakCard: ViewStyle;
  streakHeader: ViewStyle;
  streakTitle: TextStyle;
  seeAllText: TextStyle;
  streakRow: ViewStyle;
  fireCol: ViewStyle;
  fireStack: ViewStyle;
  fireImage: ImageStyle;
  fireNumber: TextStyle;
  weeksLabel: TextStyle;
  daysWrapper: ViewStyle;
  dayCol: ViewStyle;
  dayLabelText: TextStyle;
  circleBase: ViewStyle;
  circlePast: ViewStyle;
  circleToday: ViewStyle;
  numBase: TextStyle;
  numPast: TextStyle;
  numToday: TextStyle;
  numFuture: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    paddingHorizontal: 0, 
  },
  streakCard: {
    padding: 16,
    paddingBottom: 30,
    paddingTop: 30,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: "#fff",
    letterSpacing: 1,
    paddingLeft: 5,
  },
  seeAllText: {
    color: "#CCFF00",
    fontSize: 12,
    fontFamily: "Montserrat_Medium",
    paddingRight: 5,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  fireCol: {
    alignItems: 'center',
    marginRight: 12,
  },
  fireStack: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  fireImage: {
    width: 42,
    height: 42,
    tintColor: "#FFFFFF",
    resizeMode: 'contain',
  },
  fireNumber: {
    position: 'absolute',
    top: 19, 
    fontFamily: "Montserrat_900Black",
    fontSize: 14,
    color: "#000",
  },
  weeksLabel: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 9,
    color: "#facc15",
    marginTop: 2,
  },
  daysWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
  },
  dayLabelText: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 10,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  circleBase: {
    width: 25,
    height: 25,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePast: {
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  circleToday: {
    borderWidth: 1.5,
    borderColor: "#CCFF00",
  },
  numBase: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    textAlign: 'center',
  },
  numPast: { color: "#FFFFFF" },
  numToday: { color: "#CCFF00" },
  numFuture: { color: "#939394" },
});