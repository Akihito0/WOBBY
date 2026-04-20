import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
  streakDates?: string[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CustomCalendar({ onDateSelect, streakDates = [] }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [selectedDate, setSelectedDate] = useState<number>(today.getDate());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysGrid = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayOfMonth + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const formatDateString = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const isSevenDayStreak = (dateString: string) => {
    const date = new Date(dateString);
    for (let i = 1; i <= 6; i++) {
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - i);
      const prevString = prevDate.toISOString().split('T')[0];
      if (!streakDates.includes(prevString)) return false;
    }
    return true;
  };

  return (
    <LinearGradient
      // Applied the requested colors: 313911, 131304, and 1F2115
      colors={['#1F2115', '#131304', '#313911']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
          <Ionicons name="arrow-back" size={22} color="black" />
        </TouchableOpacity>

        <View style={styles.pillsRow}>
          <View style={styles.pillContainer}>
            <Text style={styles.pillText}>{MONTHS[month]}</Text>
          </View>
          <View style={styles.pillContainer}>
            <Text style={styles.pillText}>{year}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
          <Ionicons name="arrow-forward" size={22} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {daysGrid.map((day, index) => {
          if (!day) return <View key={index} style={styles.dayCellContainer} />;

          const dateString = formatDateString(day);
          const isStreak = streakDates.includes(dateString);
          const isSelected = day === selectedDate;
          const isToday = dateString === todayString;
          const isSevenStreak = isSevenDayStreak(dateString);

          return (
            <View key={index} style={styles.dayCellContainer}>
              <TouchableOpacity
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDayCell,
                  isToday && !isSelected && styles.todayDayCell,
                  isSevenStreak && !isSelected && styles.sevenStreakDayCell,
                ]}
                onPress={() => {
                  setSelectedDate(day);
                  if (onDateSelect) onDateSelect(new Date(year, month, day));
                }}
              >
                <Text style={[
                  styles.dayText, 
                  isSelected && styles.selectedDayText
                ]}>
                  {day}
                </Text>
                {isStreak && !isSelected && !isSevenStreak && (
                  <View style={styles.streakDot} />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    paddingBottom: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
    justifyContent: 'center',
  },
  pillText: {
    color: 'black',
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 11,
  },
  caret: {
    marginLeft: 6,
    marginTop: 2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekDayText: {
    color: '#FFFFFF',
    fontSize: 10,
    width: '14.28%',
    textAlign: 'center',
    fontFamily: "Montserrat_800ExtraBold",
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellContainer: {
    width: '14.28%',
    aspectRatio: 0.9,
    padding: 3,
  },
  dayCell: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.8)', // Semi-transparent white border
    backgroundColor: 'transparent', // Darker tint to see the gradient behind
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayCell: {
    borderColor: '#C0FF00', // Neon Green
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  todayDayCell: {
    borderColor: '#60A5FA', 
  },
  sevenStreakDayCell: {
    backgroundColor: 'rgba(192, 255, 0, 0.1)',
  },
  dayText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
  },
  selectedDayText: {
    color: '#C0FF00',
  },
  streakDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C0FF00',
    position: 'absolute',
    bottom: 4,
  },
});