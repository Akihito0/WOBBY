import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

export default function Username({ onNavigateNext, onLogout }: { onNavigateNext: () => void; onLogout?: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const hasInput = name.trim().length > 0;

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            onLogout?.();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleContinue = async () => {
    if (!hasInput) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No user logged in");
      }

      // Check if username is already taken
      const { data: existingUser, error: fetchError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', name.trim())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: "exact-one" violation (0 rows)
        throw fetchError;
      }

      if (existingUser) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: name.trim() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      onNavigateNext();

    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F8F9FA', '#939394']}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        
        <Image 
          source={require('../assets/dumbell.png')} 
          style={styles.icon}
          resizeMode="contain"
        />

        <Text style={styles.title}>What should we{"\n"}call you?</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder=""
          placeholderTextColor="#999"
          autoFocus={true}
        />

<TouchableOpacity
  style={[styles.continueButton, hasInput && styles.continueButtonActive]}
  activeOpacity={0.8}
  disabled={!hasInput || loading}
  onPress={handleContinue} 
>
  {hasInput && (
    <View style={styles.neonBorder} />
  )}
  <View style={styles.buttonContent}>
    {loading ? (
      <ActivityIndicator color="#CCFF00" />
    ) : (
      <>
        <Text style={[styles.buttonText, hasInput && styles.buttonTextActive]}>
          Continue
        </Text>
        <Image 
          source={hasInput ? require('../assets/arrow0.png') : require('../assets/arrow.png')} 
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
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 30,
    marginTop: -200,
  },
  title: {
    fontFamily: 'Montserrat-Black',
    fontSize: 32,
    color: '#000',
    textAlign: 'center',
    marginBottom: 70,
    marginTop: -20,
  },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 20,
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    elevation: 4,
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueButton: {
    position: 'absolute',
    bottom: 85,
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
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    zIndex: 100,
  },
  logoutText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#000',
  },
});