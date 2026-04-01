import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AssessBgProps {
  onBack: () => void;
  children?: React.ReactNode; // This allows you to put other content inside later
}

export default function AssessBg({ onBack, children }: AssessBgProps) {
  return (
    <LinearGradient
      // Vertical gradient from White (#FFF) to Gray (#999)
      colors={['#FFFFFF', '#999999']}
      style={styles.container}
    >
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Image 
  source={require('../../assets/backk.png')} // Two sets of dots
  style={styles.backIcon}
  resizeMode="contain"
/>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Assessment</Text>
        </View>

        {/* This is where your questions/content will go later */}
        <View style={styles.body}>
          {children}
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60, // Space for status bar
    paddingHorizontal: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    width: 45,
    height: 45,
    backgroundColor: '#CCFF00', // Your signature Neon Green
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for the button
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#000', // Forces the back arrow to be black
  },
  headerTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: '#000',
    marginLeft: 20,
  },
  body: {
    flex: 1,
  }
});