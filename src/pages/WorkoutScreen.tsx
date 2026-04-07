import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';


const { width } = Dimensions.get('window');

const WorkoutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WORKOUT</Text>
        </View>

        <Text style={styles.sectionTitle}>START TRAINING</Text>

        {/* Solo Workout Card */}
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => navigation.navigate('SoloWorkoutScreen')} // Example navigation
        >
          <LinearGradient
            colors={['#0F4933', '#000000']}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0.1, y: 0.5 }}
            style={styles.card}
          >
            <Image source={require('../assets/solo.png')} style={styles.cardIcon} />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: '#C0FDE5' }]}>Solo Workout</Text>
              <Text style={styles.cardSubtext}>Train at your own pace with real-time form tracking.</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Versus Workout Card */}
        <TouchableOpacity 
           activeOpacity={0.8} 
           onPress={() => navigation.navigate('VersusWorkoutScreen')} // Example navigation
       >
          <LinearGradient
            colors={['#432B16', '#000000']}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0.1, y: 0.5 }}
            style={styles.card}
          >
            <Image source={require('../assets/versus.png')} style={styles.cardIcon} />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: '#FFD6B2' }]}>Versus Workout</Text>
              <Text style={styles.cardSubtext}>Enter matchmaking to challenge another user to a live workout battle.</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Run Card */}
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => navigation.navigate('RunScreen')} // Example navigation
        >
          <LinearGradient
            colors={['#193845', '#000000']}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0.1, y: 0.5 }}
            style={styles.card}
          >
            <Image source={require('../assets/runn.png')} style={styles.cardIcon} />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: '#B5E9FF' }]}>Run</Text>
              <Text style={styles.cardSubtext}>Hit the pavement and track your distance, pace, and cardio.</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121310',
  },
  scrollContent: {
    paddingBottom: 120, // Space so content doesn't hide behind NavBar
  },
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingTop: 65,
    marginBottom: 32,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 45,
    color: '#d1d1d1',
    fontFamily: 'Montserrat-Black',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'Montserrat-SemiBold',
    marginLeft: 25,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 10, 
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 10,
  },
  cardIcon: {
    width: 100,
    height: 100,
    marginBottom: -10,
    resizeMode: 'contain',
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  cardTitle: {
    fontSize: 23,
    fontFamily: 'Montserrat-ExtraBold',
    marginBottom: 4,
    textAlign: 'right',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Barlow-Regular',
    lineHeight: 16,
    opacity: 0.8,
    textAlign: 'right',
  },
});

export default WorkoutScreen;