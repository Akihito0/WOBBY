import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  ImageBackground, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ImageBackground 
        source={require('../assets/a1.png')} 
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          
          <View style={styles.content}>
            <Text style={styles.welcomeText}>Welcome to</Text>

            <Image 
              source={require('../assets/wobby.png')} 
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.appName}>WOBBY</Text>

            <Text style={styles.tagline}>Level Up Your Fitness</Text>
          </View>

          <TouchableOpacity 
            style={styles.fullScreenTouch} 
            onPress={onNext} 
            activeOpacity={1}
          />

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: '#FFF',
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 2,
    alignItems: 'center',
  },
  appName: {
    fontFamily: 'Montserrat-Black',
    fontSize: 40,
    color: '#CCFF00', 
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 15,
    color: '#FFF',
    marginTop: 1,
    opacity: 0.9,
  },
  fullScreenTouch: {
    position: 'absolute',
    width: width,
    height: height,
  }
});