import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const LeaderboardPodium: React.FC = () => {
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
              <Image source={require('../assets/1.png')} style={styles.avatarImg} />
            </View>
          </View>

          {/* Rank 1 (Winner - Center) */}
          <View style={styles.rank1}>
            <View style={[styles.borderCircle, styles.winnerBorder]}>
              <Image source={require('../assets/2.png')} style={styles.avatarImg} />
            </View>
          </View>

          {/* Rank 3 (Right) */}
          <View style={styles.rank3}>
            <View style={styles.borderCircle}>
              <Image source={require('../assets/3.png')} style={styles.avatarImg} />
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

      <TouchableOpacity style={styles.viewLink}>
        <Text style={styles.viewLinkText}>View Leaderboards</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LeaderboardPodium;

// ─── STYLES ───
const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#121310', // Match your dark dashboard theme
  },
  sectionLabel: {
    fontFamily: "Montserrat_900Black",
    fontSize: 16,
    color: "#fff",
    alignSelf: 'flex-start',
    marginLeft: 16,
    letterSpacing: 1.5,
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
    top: -50,       // Positioned to glow behind the winner
    width: 320,     // Adjust width to match your PNG's aspect ratio
    height: 320,
    zIndex: 0,
    opacity: 0.9,   
  },
  crown: {
    width: 50,
    height: 50,
    marginBottom: 50, // Pushed up away from the winner's head
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
    borderColor: '#CCFF00', // Lime Yellow Border
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  winnerBorder: {
    width: 100, // Winner is slightly larger
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
    marginHorizontal: -20, // Overlap effect
    transform: [{ translateY: -40 }], // Winner "Podium" lift
  },
  rank2: { 
    zIndex: 2 
  },
  rank3: { 
    zIndex: 1 
  },
  podiumBase: {
    width: '50%', // Centered platform
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