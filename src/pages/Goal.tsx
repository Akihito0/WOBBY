import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

const GOALS = [
  "I wanna lose weight",
  "I wanna gain weight",
  "I wanna get bulks",
  "I wanna gain endurance",
  "Just trying out the app!"
];

export default function Goal({ onNext }: { onNext: () => void }) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canContinue = selectedGoal !== null;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({ goal: selectedGoal })
        .eq('id', user.id);

      if (error) throw error;
      onNext();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save goal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#999999']}
      style={styles.container}
    >
      <View style={styles.content}>
        
        <Text style={styles.headerLabel}>Assessment</Text>
        <Text style={styles.title}>What's your fitness{"\n"}goal/target?</Text>

        <View style={styles.optionsList}>
          {GOALS.map((goal) => {
            const isSelected = selectedGoal === goal;
            return (
              <TouchableOpacity
                key={goal}
                activeOpacity={0.8}
                onPress={() => setSelectedGoal(goal)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected
                ]}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {goal}
                </Text>
                
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, canContinue && styles.continueButtonActive]}
          activeOpacity={0.8}
          disabled={!canContinue || loading}
          onPress={handleContinue}
        >
          {canContinue && <View style={styles.neonBorder} />}
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#CCFF00" />
            ) : (
              <>
                <Text style={[styles.buttonText, canContinue && styles.buttonTextActive]}>
                  Continue
                </Text>
                <Image 
                  source={canContinue ? require('../assets/arrow0.png') : require('../assets/arrow.png')} 
                  style={styles.arrow}
                  resizeMode="contain"
                />
              </>
            )}
          </View>
        </TouchableOpacity>

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
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 25,
  },
  headerLabel: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#000',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 28,
    color: '#000',
    textAlign: 'center',
    marginBottom: 50,
  },
  optionsList: {
    width: '100%',
    gap: 15,
  },
  optionCard: {
    width: '100%',
    height: 62,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#CCFF00',
    borderColor: '#000',
    borderWidth: 2.5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  optionText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: '#000',
  },
  optionTextSelected: {
    fontFamily: 'Montserrat-ExtraBold',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    backgroundColor: '#CCFF00',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
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
    justifyContent: 'center',
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