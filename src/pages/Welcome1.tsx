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
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Welcome1({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/a2.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >

        <View style={styles.darkOverlay}>
          
          <LinearGradient
            colors={['#0F1F1C', '#408578']}
            style={styles.card}
          >

            <Image 
              source={require('../assets/i.png')} 
              style={styles.icon}
              resizeMode="contain"
            />

            <Text style={styles.cardTitle}>
              Take Control of Your Progress with Manual Log Tracking
            </Text>

            <View style={styles.pagination}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={onNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </LinearGradient>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  darkOverlay: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
  },

  card: {
    width: width, 
    height: 180, 
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  nextButton: {
    marginTop: 10, 
    width: 230,
    height: 49,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#666',
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 30,
    height: 4,
    backgroundColor: '#1A332E', 
    borderRadius: 2,
  },
  activeDot: {
    backgroundColor: '#CCFF00',
    borderRadius: 2,
  },
  nextText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 20,
    color: '#FFF',
  },
});