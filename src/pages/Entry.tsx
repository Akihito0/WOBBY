import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AuthBackground from '../components/layout/AuthBackground';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Entry({ 
  onNavigateToLogin, 
  onNavigateToRegister 
}: { 
  onNavigateToLogin: () => void; 
  onNavigateToRegister: () => void; 
}) {
  return (
    <AuthBackground>
     <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        
        {/* 2. Text and Buttons Section */}
        <View style={styles.bottomContent}>
          <Text style={styles.brandName}>WOBBY</Text>
          <Text style={styles.tagline}>Level Up Your Fitness</Text>

          <View style={styles.buttonGroup}>
           <TouchableOpacity 
  style={styles.joinButton} 
  activeOpacity={0.85}
  // Change the onPress from console.log to your new navigation prop
  onPress={onNavigateToRegister} 
>
  <LinearGradient
    colors={['#CCFF00', '#7A9900']} 
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={StyleSheet.absoluteFillObject}
  />
  <Text style={styles.joinButtonText}>Join Us</Text>
</TouchableOpacity>

            <TouchableOpacity 
              style={styles.signInButton} 
              activeOpacity={0.85} 
              onPress={onNavigateToLogin} // <--- Add this!
            >
  <LinearGradient
    colors={['#2A2A2E', '#878794']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={StyleSheet.absoluteFillObject}
  />
  <Text style={styles.signInButtonText}>Sign In</Text>
</TouchableOpacity>
          </View>
        </View>

      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 3, 
  justifyContent: 'space-between', // Pushes the top and bottom apart
  backgroundColor: 'transparent', // Key: This pushes headerContent to top and bottomContent to bottom
  },
  headerContent: {
    width: '100%',
    alignItems: 'center',
    marginTop: 100, // Gives some breathing room from the top safe area
    paddingHorizontal: 32,
  },
  bottomContent: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 150, // increase this number = goes higher
    alignItems: 'center',
  },
  brandName: {
    fontFamily: 'Montserrat-Black', 
    fontSize: 48,
    color: '#FFFFFF', // Neon yellow/green
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 24,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 4, // Tighten up the gap between WOBBY and Level Up
    marginBottom: 32, // Space between tagline and buttons
  },
  buttonGroup: {
     gap: 15,
  alignItems: 'center',
  },
  joinButton: {
    width: 280,
  height: 60,
  borderRadius: 15,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 8,
  overflow: 'hidden',
  },
  joinButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#000',
    letterSpacing: 0.5,
  },
  signInButton: {
   width: 280,
  height: 60,
  borderRadius: 15,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 4,
  overflow: 'hidden',
},
  signInButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#CCFF00',
    letterSpacing: 0.5,
  },
});