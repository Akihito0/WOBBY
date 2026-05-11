import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import { calculateBMI, calculateBMR } from '../utils/healthCalculations';

interface BMIModalProps {
  isVisible: boolean;
  onClose: () => void;
  onBMIUpdated?: () => void;
}

interface BMIRecord {
  id: string;
  bmi: number;
  weight: number;
  height: number;
  created_at: string;
}

const BMIModal: React.FC<BMIModalProps> = ({ isVisible, onClose, onBMIUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [currentBMI, setCurrentBMI] = useState<number | null>(null);
  const [bmrData, setBmrData] = useState<any>(null);
  const [bmiHistory, setBmiHistory] = useState<BMIRecord[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [expandCalories, setExpandCalories] = useState(false);

  // Harris-Benedict equation for BMR
  const calculateBMRCalories = (weight: number, height: number, age: number, gender: string) => {
    const result = calculateBMR(weight, height, age, gender);
    return result;
  };

  // Fetch user profile and BMI history
  useEffect(() => {
    if (isVisible) {
      fetchUserData();
    }
  }, [isVisible]);

  const fetchUserData = async () => {
    setFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('weight, height, age, gender')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      if (profile?.weight && profile?.height) {
        setWeight(profile.weight.toString());
        setHeight(profile.height.toString());
        const bmiResult = calculateBMI(profile.weight, profile.height);
        setCurrentBMI(bmiResult.bmi);

        // Calculate BMR and suggested calories
        if (profile.age) {
          const bmrResult = calculateBMRCalories(profile.weight, profile.height, profile.age, profile.gender);
          setBmrData(bmrResult);
        }
      }

      // Fetch BMI history
      const { data: history, error: historyError } = await supabase
        .from('bmi_history')
        .select('id, bmi, weight, height, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.log('Note: bmi_history table may not exist yet');
      } else if (history) {
        setBmiHistory(history);
      }
    } catch (error: any) {
      console.log('Error fetching data:', error.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!weight || !height) {
      Alert.alert('Error', 'Please enter weight and height');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      let weightKg = parseFloat(weight);
      let heightCm = parseFloat(height);

      if (weightUnit === 'lb') {
        weightKg = parseFloat(weight) / 2.20462;
      }
      if (heightUnit === 'in') {
        heightCm = parseFloat(height) * 2.54;
      }

      const bmiResult = calculateBMI(weightKg, heightCm);
      const newBMI = bmiResult.bmi;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ weight: weightKg, height: heightCm })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Insert into BMI history
      const { error: historyError } = await supabase
        .from('bmi_history')
        .insert([
          {
            user_id: user.id,
            bmi: newBMI,
            weight: weightKg,
            height: heightCm,
            created_at: new Date().toISOString(),
          },
        ]);

      if (historyError) {
        console.log('Note: Could not save to bmi_history');
      }

      setCurrentBMI(newBMI);

      // 🏆 Check for BMI Voyager Achievement (ID 18) — one-time
      try {
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', user.id)
          .eq('achievement_name', '18')
          .single();

        if (!existing) {
          await supabase.from('user_achievements').insert([{
            user_id: user.id,
            achievement_name: '18',
            unlocked_at: new Date().toISOString(),
          }]);

          // Award 1000 XP
          const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ xp: (profile.xp || 0) + 1000 })
              .eq('id', user.id);
          }

          Alert.alert('🏆 Achievement Unlocked!', 'BMI Voyager — You recorded your first BMI measurement! +1000 XP');
        } else {
          Alert.alert('Success', `BMI updated to ${newBMI}`);
        }
      } catch (achErr) {
        console.log('Achievement check error (non-critical):', achErr);
        Alert.alert('Success', `BMI updated to ${newBMI}`);
      }

      onBMIUpdated?.();
      fetchUserData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save BMI');
    } finally {
      setLoading(false);
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Underweight', color: '#3498db' };
    if (bmi < 25) return { text: 'Normal', color: '#2ecc71' };
    if (bmi < 30) return { text: 'Overweight', color: '#f39c12' };
    return { text: 'Obese', color: '#e74c3c' };
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#000328', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>BMI Tracker</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {fetching ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Current BMI Display */}
              {currentBMI !== null && (
                <View style={styles.currentBMISection}>
                  <LinearGradient
                    colors={['#1a0033', '#000328']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bmiCard}
                  >
                    <Text style={styles.label}>Current BMI</Text>
                    <View style={styles.bmiRow}>
                      <Text style={styles.bmiValue}>{currentBMI}</Text>
                      <Text
                        style={[
                          styles.bmiCategory,
                          { color: getBMICategory(currentBMI).color },
                        ]}
                      >
                        {getBMICategory(currentBMI).text}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* BMR & Calories - Dropdown */}
              {bmrData !== null && (
                <View style={styles.caloriesSection}>
                  <TouchableOpacity
                    onPress={() => setExpandCalories(!expandCalories)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#330000', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.caloriesCard}
                    >
                      <View style={styles.caloriesHeader}>
                        <View>
                          <Text style={styles.label}>Daily Calories</Text>
                          <Text style={styles.bmrValue}>BMR: {bmrData.bmr} kcal</Text>
                        </View>
                        <Text style={styles.dropdownToggle}>
                          {expandCalories ? '▼' : '▶'}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Expanded Activity Levels */}
                  {expandCalories && (
                    <View style={styles.activityGrid}>
                      {/* Sedentary */}
                      <View style={styles.activityItem}>
                        <Text style={styles.activityLevel}>Sedentary</Text>
                        <Text style={styles.activityCalories}>{bmrData.dailyCalories.sedentary}</Text>
                        <Text style={styles.activityDesc}>Little/no exercise</Text>
                      </View>

                      {/* Lightly Active */}
                      <View style={styles.activityItem}>
                        <Text style={styles.activityLevel}>Lightly Active</Text>
                        <Text style={styles.activityCalories}>{bmrData.dailyCalories.lightly_active}</Text>
                        <Text style={styles.activityDesc}>1-3 days/week</Text>
                      </View>

                      {/* Moderately Active */}
                      <View style={styles.activityItem}>
                        <Text style={styles.activityLevel}>Moderately Active</Text>
                        <Text style={styles.activityCalories}>{bmrData.dailyCalories.moderately_active}</Text>
                        <Text style={styles.activityDesc}>3-5 days/week</Text>
                      </View>

                      {/* Very Active */}
                      <View style={styles.activityItem}>
                        <Text style={styles.activityLevel}>Very Active</Text>
                        <Text style={styles.activityCalories}>{bmrData.dailyCalories.very_active}</Text>
                        <Text style={styles.activityDesc}>6-7 days/week</Text>
                      </View>

                      {/* Extremely Active */}
                      <View style={styles.activityItem}>
                        <Text style={styles.activityLevel}>Extremely Active</Text>
                        <Text style={styles.activityCalories}>{bmrData.dailyCalories.extremely_active}</Text>
                        <Text style={styles.activityDesc}>Physical job/2x/day</Text>
                      </View>

                      <Text style={styles.caloriesInfo}>
                        Based on Harris-Benedict equation (BMR × activity multiplier)
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Update Form */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Update Measurements</Text>

                {/* Weight Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Weight</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter weight"
                      placeholderTextColor="#666"
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.unitToggle}>
                      <TouchableOpacity
                        style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
                        onPress={() => setWeightUnit('kg')}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            weightUnit === 'kg' && styles.unitTextActive,
                          ]}
                        >
                          kg
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitBtn, weightUnit === 'lb' && styles.unitBtnActive]}
                        onPress={() => setWeightUnit('lb')}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            weightUnit === 'lb' && styles.unitTextActive,
                          ]}
                        >
                          lb
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Height Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Height</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter height"
                      placeholderTextColor="#666"
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.unitToggle}>
                      <TouchableOpacity
                        style={[styles.unitBtn, heightUnit === 'cm' && styles.unitBtnActive]}
                        onPress={() => setHeightUnit('cm')}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            heightUnit === 'cm' && styles.unitTextActive,
                          ]}
                        >
                          cm
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitBtn, heightUnit === 'in' && styles.unitBtnActive]}
                        onPress={() => setHeightUnit('in')}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            heightUnit === 'in' && styles.unitTextActive,
                          ]}
                        >
                          in
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* BMI History */}
              {bmiHistory.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.sectionTitle}>BMI History</Text>
                  {bmiHistory.map((record) => (
                    <View key={record.id} style={styles.historyItem}>
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyBMI}>{record.bmi}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(record.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyStats}>
                          {Math.round(record.weight)} kg • {Math.round(record.height)} cm
                        </Text>
                        <Text
                          style={[
                            styles.historyCategory,
                            { color: getBMICategory(record.bmi).color },
                          ]}
                        >
                          {getBMICategory(record.bmi).text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BMIModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
    marginTop: 40,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 20,
    color: '#fff',
  },
  closeBtn: {
    fontSize: 24,
    color: '#fff',
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBMISection: {
    marginBottom: 16,
  },
  bmiCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  bmiValue: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 48,
    color: '#fff',
  },
  bmiCategory: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  caloriesSection: {
    marginBottom: 16,
  },
  caloriesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  caloriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dropdownToggle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#FFA500',
    paddingTop: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  caloriesValue: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 36,
    color: '#FFA500',
  },
  caloriesSubtext: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 12,
    color: '#888',
  },
  caloriesInfo: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 11,
    color: '#666',
    marginTop: 8,
  },
  bmrValue: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 28,
    color: '#FFA500',
    marginBottom: 16,
    marginTop: 4,
  },
  activityGrid: {
    gap: 10,
    marginTop: 12,
    marginHorizontal: -4,
  },
  activityItem: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityLevel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#fff',
    marginBottom: 6,
  },
  activityCalories: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 20,
    color: '#FFA500',
    marginBottom: 4,
  },
  activityDesc: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 10,
    color: '#666',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Montserrat_600SemiBold',
    borderWidth: 1,
    borderColor: '#333',
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  unitBtnActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  unitText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#666',
  },
  unitTextActive: {
    color: '#000',
  },
  saveBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 14,
    color: '#000',
  },
  historySection: {
    marginBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyLeft: {
    alignItems: 'center',
  },
  historyBMI: {
    fontFamily: 'Montserrat_900Black',
    fontSize: 18,
    color: '#fff',
  },
  historyDate: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyStats: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 11,
    color: '#888',
  },
  historyCategory: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    marginTop: 2,
  },
});
