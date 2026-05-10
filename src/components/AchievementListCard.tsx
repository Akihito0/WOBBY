import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ListProps {
  name: string;
  subtext: string;
  xp: number;
  imageSource: any;
  isLocked?: boolean;
}

const AchievementListCard = ({ name, subtext, xp, imageSource, isLocked = false }: ListProps) => {
  return (
    <LinearGradient
      colors={['#000000', '#1F2118']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 0.73, y: 0.5 }}
      style={styles.listContainer}
    >
      <Image 
        source={imageSource} 
        style={[styles.listMedal, isLocked && { opacity: 0.3, tintColor: '#555' }]} 
        resizeMode="contain" 
      />
      
      <View style={styles.contentContainer}>
        <View>
          <Text style={[styles.listName, isLocked && { color: '#666' }]}>{name}</Text>
          <Text style={[styles.listSubtext, isLocked && { color: '#444' }]}>{subtext}</Text>
        </View>
        <Text style={[styles.listXp, isLocked && { color: '#444' }]}>+ {xp} XP</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    width: 365,
    height: 125,
  },
  listMedal: {
    width: 81,
    height: 94,
    marginRight: 25,
    right: -10,
  },
  contentContainer: {
    flex: 1,
    height: 60,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  listName: {
    color: '#CCFF00',
    fontSize: 16,
    fontFamily: 'Montserrat-ExtraBold',
  },
  listSubtext: {
    color: '#ABABAB',
    fontSize: 13,
    fontFamily: 'Barlow-Bold',
  },
  listXp: {
    color: '#9FAD66',
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
    textAlign: 'right',
    marginTop: 6,
    left: -10,
  },
});

export default AchievementListCard;