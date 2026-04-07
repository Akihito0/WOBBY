import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const VersusWorkoutScreen = ({ navigation }: any) => {
  const [workoutExpanded, setWorkoutExpanded] = useState(false);

  const routines = [
    { type: 'PUSH', sub: 'Chest, Shoulders, Triceps', icon: require('../assets/push.png') },
    { type: 'PULL', sub: 'Back, Biceps',              icon: require('../assets/pull.png') },
    { type: 'LEG',  sub: 'Lower Body',                icon: require('../assets/leg.png')  },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <LinearGradient
        colors={['#432B16', '#000000']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../assets/back0.png')} style={styles.backBtn} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VERSUS WORKOUT</Text>
      </LinearGradient>

      {/* Stats Card */}
      <LinearGradient
        colors={['#000000', '#323C2E']}
        start={{ x: 0.02, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.statsCard}
      >
        <Text style={styles.labelSmall}>DURATION</Text>
        <Text style={styles.timerText}>00:00:00</Text>
        <View style={styles.row}>
          <View style={styles.statGroup}>
            <Text style={styles.labelTiny}>Total Repetition</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statGroup}>
            <Text style={styles.labelTiny}>Total Sets</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Choose Mode */}
      <Text style={styles.chooseModeTitle}>Choose Mode</Text>

      {/* WORKOUT Button */}
<TouchableOpacity
  activeOpacity={0.85}
  onPress={() => setWorkoutExpanded(!workoutExpanded)}
  style={styles.modeButtonWrapper}
>
  <LinearGradient
    colors={['#000000', '#0F4933']}
    start={{ x: 0.8, y: 0.5 }}
    end={{ x: 0.27, y: 0.5 }}
    style={styles.modeButton}
  >
    {/* Top row: title + arrow */}
    <View style={styles.modeButtonTopRow}>
      <Text style={styles.modeButtonText}>WORKOUT</Text>
      <Image
        source={
          workoutExpanded
            ? require('../assets/down.png')
            : require('../assets/gooo.png')
        }
        style={styles.modeButtonIcon}
      />
    </View>

    {/* Expanded dropdown INSIDE the card */}
    {workoutExpanded && (
      <View style={styles.dropdownInner}>
        <Text style={styles.dropdownLabel}>Select your routine</Text>
        <View style={styles.routinesRow}>
          {routines.map(({ type, sub, icon }) => (
            <TouchableOpacity key={type} style={styles.routineCardWrapper}>
              <LinearGradient
                colors={['#180020', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.routineCard}
              >
                <Image source={icon} style={styles.routineIcon} />
                <Text style={styles.routineTitle}>{type}</Text>
                <Text style={styles.routineSub}>{sub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}
  </LinearGradient>
</TouchableOpacity>

{/* RUN Button */}
<TouchableOpacity
  activeOpacity={0.85}
  onPress={() => navigation.navigate('RunPlaceholder')}
  style={styles.modeButtonWrapper}
>
  <LinearGradient
    colors={['#000000', '#193845']}
    start={{ x: 0.8, y: 0.5 }}
    end={{ x: 0.27, y: 0.5 }}
    style={styles.modeButton}
  >
    <View style={styles.modeButtonTopRow}>
      <Text style={styles.modeButtonText}>RUN</Text>
      <Image source={require('../assets/gooo.png')} style={styles.modeButtonIcon} />
    </View>
  </LinearGradient>
</TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 65,
    marginBottom: 32,
    width: 500,
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    left: -20,
  },
 backBtn: { 
    width: 30, 
    height: 30, 
    position: 'absolute', 
    left: 12,
    marginTop: -65,
  },
  headerTitle: {
    color: '#d1d1d1',
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    right: -70,
  },
  statsCard: {
    borderRadius: 15,
    padding: 30,
    marginTop: -15,
    alignItems: 'center',
  },
  labelSmall: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 5,
  },
  labelTiny: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
  },
  statGroup: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#A3CF06',
    fontSize: 30,
    fontFamily: 'Barlow-Bold',
  },
  timerText: {
    color: '#A3CF06',
    fontSize: 40,
    fontFamily: 'Barlow-Bold',
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },

  // Choose Mode
  chooseModeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat-SemiBold',
    marginTop: 32,
    marginBottom: 10,
    right: -15,
  },

  // Mode Buttons
 modeButtonWrapper: {
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 14,
  marginTop: 5,
},
modeButton: {
  borderRadius: 16,
  paddingVertical: 22,
  paddingHorizontal: 20,
},
modeButtonTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
modeButtonText: {
  color: '#FFFFFF',
  fontSize: 20,
  fontFamily: 'Montserrat-ExtraBold',
  right: -15,
},
modeButtonIcon: {
  width: 25,
  height: 25,
  resizeMode: 'contain',
  left: -15,
},


  // Dropdown INSIDE the card
dropdownInner: {
  marginTop: 10,
},
dropdownLabel: {
  color: '#CCCCCC',
  fontSize: 13,
  fontFamily: 'Montserrat-Regular',
  marginBottom: 15,
  right: -15,
},
routinesRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10,
},
routineCardWrapper: {
  flex: 1,
  borderRadius: 14,
  overflow: 'hidden',
},
routineCard: {
  borderRadius: 14,
  paddingVertical: 20,
  paddingHorizontal: 8,
  alignItems: 'center',
},
routineIcon: {
  width: 50,
  height: 50,
  resizeMode: 'contain',
  marginBottom: 10,
},
routineTitle: {
  color: '#ffffff',
  fontSize: 16,
  fontFamily: 'Montserrat-Bold',
  textAlign: 'left',
},
routineSub: {
  color: '#888888',
  fontSize: 9,
  fontFamily: 'Montserrat-Regular',
  textAlign: 'center',
  marginTop: 4,
},
});

export default VersusWorkoutScreen;