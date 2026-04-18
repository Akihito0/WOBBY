import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.monthLabelContainer}>
          <Text style={styles.monthLabel}>{MONTHS[month]}</Text>
          <Text style={styles.yearLabel}>{year}</Text>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={22} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {daysGrid.map((day, index) => {
          if (!day) {
            return <View key={index} style={styles.dayCellContainer} />;
          }

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
                  isSevenStreak && !isSelected && styles.sevenStreakDayCell,
                  isStreak && !isSelected && !isSevenStreak && styles.streakDayCell,
                  isSelected && styles.selectedDayCell,
                  isToday && !isSelected && styles.todayDayCell,
                ]}
                onPress={() => {
                  setSelectedDate(day);
                  if (onDateSelect) onDateSelect(new Date(year, month, day));
                }}
              >
                <View style={styles.dayTextRow}>
                  <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                  {isStreak && !isSelected && !isSevenStreak ? <View style={styles.streakDot} /> : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#42752E',
    borderRadius: 24,
    padding: 18,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0F1321',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabelContainer: {
    alignItems: 'center',
  },
  monthLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  yearLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDayText: {
    color: '#94A3B8',
    fontSize: 12,
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellContainer: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayCell: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#0F1321',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  todayDayCell: {
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  streakDayCell: {
    backgroundColor: '#111B31',
  },
  sevenStreakDayCell: {
    backgroundColor: '#10B981',
  },
  selectedDayCell: {
    backgroundColor: '#FBBF24',
  },
  dayTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  selectedDayText: {
    color: '#0F172A',
  },
  streakDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginLeft: 6,
  },
});
