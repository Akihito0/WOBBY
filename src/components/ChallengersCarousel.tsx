import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── DATA (Limited to 3) ───────────────────────────────────────────────────
const challengersData = [
  { id: 1, name: "kkk", xp: "0", avatar: require("../assets/1.png") },
  { id: 2, name: "tweetzieee", xp: "540", avatar: require("../assets/2.png") },
  { id: 3, name: "ness", xp: "780", avatar: require("../assets/3.png") },
];

const CARD_WIDTH = 230;
const GAP = 15;

const ChallengersCarousel: React.FC = () => {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Online Challengers</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + GAP} 
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContainer}
      >
        {challengersData.map((user) => (
          <TouchableOpacity key={user.id} activeOpacity={0.9}>
            <LinearGradient
              // Deep Olive/Charcoal Gradient
              colors={["#000F12", "#1B2100"]} 
              locations={[0.15, 1]} 
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.card}
            >
              {/* XP Header */}
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{user.xp} XP</Text>
                <Image 
                    source={require("../assets/xp_gem.png")} 
                    style={styles.gemIcon} 
                />
              </View>

              {/* Profile Image Container */}
              <View style={styles.avatarBorder}>
                <Image source={user.avatar} style={styles.avatarImg} />
              </View>

              <Text style={styles.nameText}>{user.name}</Text>

              {/* Challenge Button */}
              <TouchableOpacity style={styles.challengeBtn}>
                <Text style={styles.challengeBtnText}>CHALLENGE</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.seeAllBtn}>
        <Text style={styles.seeAllText}>See all challengers</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChallengersCarousel;

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: { paddingVertical: 20 },
  headerRow: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 16,
    color: "#fff",
    textTransform: "uppercase", 
    marginBottom: 5,
    marginTop: -4  
  },
  carouselContainer: { paddingHorizontal: 16, gap: GAP },
  card: {
    width: CARD_WIDTH,
    height: 180, // Taller profile like the image
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  xpRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5,
    alignSelf: 'center' 
  },
  xpText: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 14,
    color: "#DDFF52", // Lime Yellow
    fontStyle: 'italic',
  },
  gemIcon: { width: 14, height: 14 },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  nameText: {
    fontFamily: "Montserrat_800ExtraBold",
    fontSize: 14,
    color: "#fff",
    marginTop: 1,
  },
  challengeBtn: {
    width: '80%',
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  challengeBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    color: "#CCFF00",
  },
  seeAllBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, marginTop: 15 },
  seeAllText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: "#CCFF00",
  },
});