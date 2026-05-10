import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GridProps {
  name: string;
  xp: number;
  imageSource: any; // Local require or URI
  isLocked?: boolean;
}

const AchievementGridCard = ({ name, xp, imageSource, isLocked = false }: GridProps) => {
  return (
    <LinearGradient
      colors={['#1F2118', '#000000']}
      locations={[0.5, 0.99]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gridContainer}
    >
      <Image 
        source={imageSource} 
        style={[styles.medalIcon, isLocked && { opacity: 0.3, tintColor: '#555' }]} 
        resizeMode="contain" 
      />
      <Text style={[styles.nameText, isLocked && { color: '#666' }]}>{name}</Text>
      <Text style={[styles.xpText, isLocked && { color: '#444' }]}>+ {xp} XP</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    width: (Dimensions.get('window').width / 3) - 20, // Dynamic sizing for 3 columns
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
    margin: 5,
  },
  medalIcon: {
    width: 81,
    height: 94,
    marginBottom: 12,
  },
  nameText: {
    color: '#CCFF00', // Your Wobby Neon Green
    fontSize: 14,
    fontFamily: 'Montserrat-ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpText: {
    color: '#9FAD66',
    fontSize: 10,
    fontFamily: 'Barlow-Bold',
  },
});

export default AchievementGridCard;