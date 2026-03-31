import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Image, StyleSheet, Dimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { 
  useFonts, 
  Montserrat_400Regular,
  Montserrat_400Regular_Italic,
  Montserrat_500Medium_Italic, 
  Montserrat_700Bold, 
  Montserrat_800ExtraBold,
  Montserrat_900Black
} from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';

// Import your pages
import Entry from './src/pages/Entry';
import Login from './src/pages/LogIn'; 
import Register from './src/pages/Register'; // 1. Added Register import

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function App() {
  // Screens: 'splash', 'entry', 'login', 'register'
  const [currentScreen, setCurrentScreen] = useState('splash');

  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-Italic': Montserrat_400Regular_Italic,
    'Montserrat-MediumItalic': Montserrat_500Medium_Italic,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
    'Montserrat-Black': Montserrat_900Black,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // --- NAVIGATION LOGIC ---

  // 2. Show the Register Page
  if (currentScreen === 'register') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Register onNavigateToLogin={() => setCurrentScreen('login')} />
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Login onNavigateToRegister={() => setCurrentScreen('register')} />
      </View>
    );
  }

  if (currentScreen === 'entry') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        {/* 3. Pass both navigation triggers to Entry */}
        <Entry 
          onNavigateToLogin={() => setCurrentScreen('login')} 
          onNavigateToRegister={() => setCurrentScreen('register')} 
        />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onLayout={onLayoutRootView}
      onPress={() => setCurrentScreen('entry')} 
    >
      <Image 
        source={require('./src/assets/splash.png')} 
        style={styles.splashImage}
        resizeMode="cover" 
      />
      <StatusBar style="light" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splashImage: { width: width, height: height },
});