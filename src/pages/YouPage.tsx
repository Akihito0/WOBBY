import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomCalendar from '../components/CustomCalendar';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'YouMain'>;

export default function YouPage({ navigation }: Props) {
  const user = {
    username: 'cashew_123',
    age: 21,
    bmi: 25.0,
    weight: 75,
    height: 165,
    avatarUrl: 'https://i.pravatar.cc/300',
  };

  const handleDateSelect = (date: Date) => {
    console.log('Selected date on YouPage:', date.toISOString());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.sectionTitle}>YOU</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('YouSettings')}>
            <Ionicons name="settings-sharp" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#14161F", "#10121A"]} style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            <View style={styles.profileTextGroup}>
              <Text style={styles.username}>{user.username}</Text>
              <Text style={styles.profileSubtitle}>Personal overview</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.cardsRow}>
          <View style={styles.cardItem}>
            <View style={styles.cardIconRow}>
              <Ionicons name="calendar" size={28} color="#FBBF24" />
              <Text style={styles.cardLabel}>Age</Text>
            </View>
            <Text style={styles.cardValue}>{user.age}</Text>
            <Text style={styles.cardNote}>Current age</Text>
          </View>

          <View style={styles.cardItemLarge}>
            <View style={styles.cardIconRow}>
              <Ionicons name="speedometer-outline" size={28} color="#60A5FA" />
              <Text style={styles.cardLabel}>Body Mass Index</Text>
            </View>
            <Text style={styles.cardValue}>{user.bmi.toFixed(2)}</Text>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStatBox}>
                <Text style={styles.miniStatLabel}>Weight</Text>
                <Text style={styles.miniStatValue}>{user.weight}kg</Text>
              </View>
              <View style={styles.miniStatBox}>
                <Text style={styles.miniStatLabel}>Height</Text>
                <Text style={styles.miniStatValue}>{user.height}cm</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionHeading}>Activity calendar</Text>
              <Text style={styles.sectionSubheading}>Tap any date to review session details.</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>See details</Text>
            </TouchableOpacity>
          </View>

          <CustomCalendar
            onDateSelect={handleDateSelect}
            streakDates={['2026-04-14', '2026-04-15', '2026-04-16', '2026-04-19', '2026-04-20']}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1118',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  settingsButton: {
    backgroundColor: '#151828',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222433',
  },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2F313C',
    backgroundColor: '#222430',
  },
  profileTextGroup: {
    marginLeft: 16,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  profileSubtitle: {
    color: '#A1A5B8',
    marginTop: 6,
    fontSize: 14,
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileStatItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 10,
  },
  profileStatPrimary: {
    backgroundColor: '#1E293B',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  cardItem: {
    flex: 1,
    backgroundColor: '#151828',
    borderRadius: 24,
    padding: 18,
    marginRight: 12,
  },
  cardItemLarge: {
    flex: 1.4,
    backgroundColor: '#151828',
    borderRadius: 24,
    padding: 18,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardLabel: {
    color: '#D1D5DB',
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12,
  },
  cardNote: {
    color: '#94A3B8',
    fontSize: 12,
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
  },
  miniStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  miniStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#11131B',
    borderRadius: 22,
    padding: 18,
    marginRight: 12,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  calendarSection: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubheading: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  viewAllButton: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
