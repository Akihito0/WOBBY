import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Dimensions 
} from 'react-native';
import AssessBg from '../components/layout/AssessBg';

const { width } = Dimensions.get('window');

export default function Gender({ onBack, onNext }: { onBack: () => void, onNext: (gender: string) => void }) {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const canContinue = selectedGender !== null;

  return (
    <AssessBg onBack={onBack}>
      <View style={styles.container}>
        <Text style={styles.title}>What Is Your Gender?</Text>

        <View style={styles.optionsContainer}>

          <View style={styles.genderWrapper}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setSelectedGender('Male')}
            >
              <Image 
                source={selectedGender === 'Male' 
                  ? require('../assets/male0.png') 
                  : require('../assets/male.png')
                } 
                style={styles.genderIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.genderLabel}>Male</Text>
          </View>

          <View style={styles.genderWrapper}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setSelectedGender('Female')}
            >
              <Image 
                source={selectedGender === 'Female' 
                  ? require('../assets/female0.png') 
                  : require('../assets/female.png')
                } 
                style={styles.genderIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.genderLabel}>Female</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, canContinue && styles.continueButtonActive]}
          activeOpacity={0.8}
          disabled={!canContinue}
          onPress={() => onNext(selectedGender!)}
        >
          {canContinue && <View style={styles.neonBorder} />}
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonText, canContinue && styles.buttonTextActive]}>
              Continue
            </Text>
            <Image 
              source={canContinue ? require('../assets/arrow0.png') : require('../assets/arrow.png')} 
              style={styles.arrow}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </View>
    </AssessBg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 26,
    color: '#000',
    textAlign: 'center',
    marginTop: 10,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 30,
    marginTop: -150, 
  },
  genderWrapper: {
    alignItems: 'center',
  },
  genderIcon: {
    width: 170,
    height: 170,
  },
  genderLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 26,
    color: '#000',
    marginTop: 10,
  },
  continueButton: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.85,
    height: 60,
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: '#000000',
    borderWidth: 2.5,
    borderColor: '#CCFF00',
    shadowColor: '#818181',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  neonBorder: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(204, 255, 0, 0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: '#000',
  },
  buttonTextActive: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-ExtraBold',
  },
  arrow: {
    width: 20,
    height: 20,
  },
});