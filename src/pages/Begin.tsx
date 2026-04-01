import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Begin({ onBegin }: { onBegin: () => void }) {
  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#F8F9FA', '#939394']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.contentContainer}>
        <Image 
          source={require('../assets/go.png')} 
          style={styles.checkIcon} 
          resizeMode="contain"
        />

        <Text style={styles.title}>You’re all set!</Text>
        
        <Text style={styles.subtitle}>
          Goals set. Plan ready. Game on.
        </Text>

        <Image 
          source={require('../assets/dumbell.png')} 
          style={styles.dumbbellIcon} 
          resizeMode="contain"
        />
      </View>

    <TouchableOpacity 
        style={styles.beginButton} 
        onPress={onBegin}
        activeOpacity={0.8}
    >
        <LinearGradient
           colors={['#CCFF00', '#7A9900']}
           locations={[0.3, 1]}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 0 }}
           style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.beginButtonText}>BEGIN JOURNEY</Text>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.1, 
  },
  
  checkIcon: {
    width: width * 0.35, 
    height: width * 0.35, 
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Montserrat-Black',
    fontSize: 34,
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 50,
  },
  dumbbellIcon: {
    width: 65,
    height: 65,
    marginTop: 90,
    marginBottom: 30,
  },
  beginButton: {
    position: 'absolute',
    bottom: 195,
    width: 300,
    height: 56,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#ccff00',
    shadowOffset: { width: 3, height: 3 },
  },
  beginButtonText: {
    fontFamily: 'Montserrat-Black',
    fontSize: 18,
    color: '#000',
    zIndex: 1,
  },
});