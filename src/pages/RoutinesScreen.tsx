import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const routines = [
  { type: 'PUSH', sub: 'Chest, Shoulders, Triceps', icon: require('../assets/push.png'), screen: 'PushScreen' },
  { type: 'PULL', sub: 'Back, Biceps',              icon: require('../assets/pull.png'), screen: 'PullScreen' },
  { type: 'LEG',  sub: 'Lower Body',                icon: require('../assets/leg.png'),  screen: 'LegScreen'  },
];

const RoutinesScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ROUTINES</Text>
      </View>

      {/* Routine Cards */}
      <View style={styles.cardsContainer}>
        {routines.map(({ type, sub, icon, screen }) => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(screen)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={['#180020', '#000000']}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0.3, y: 0.5 }}
              style={styles.card}
            >
              <Image source={icon} style={styles.icon} />
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{type}</Text>
                <Text style={styles.cardSub}>{sub}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
    alignItems: 'center',
  },

  // Header
  header: {
    width: '100%',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingTop: 70,
    marginBottom: 32,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 45,
    color: '#d1d1d1',
    fontFamily: 'Montserrat-Black',
    letterSpacing: 2,
  },

  // Cards
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: 340,
    height: 136,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  icon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontFamily: 'Montserrat-ExtraBold',
    letterSpacing: 1,
  },
  cardSub: {
    color: '#AAAAAA',
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default RoutinesScreen;