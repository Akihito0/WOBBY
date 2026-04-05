import React, { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, Image, StyleSheet, Dimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/supabase';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

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

import Entry from './src/pages/Entry';
import Login from './src/pages/LogIn'; 
import Register from './src/pages/Register';
import Username from './src/pages/Username'; 
import AvatarSelect from './src/pages/Avatar';
import Welcome from './src/pages/Welcome';
import Welcome1 from './src/pages/Welcome1';
import Welcome2 from './src/pages/Welcome2';
import Welcome3 from './src/pages/Welcome3';
import Goal from './src/pages/Goal';
import Age from './src/pages/Age';
import Gender from './src/pages/Gender';
import Weight from './src/pages/Weight';
import Height from './src/pages/Height';
import PhysLvl from './src/pages/PhysLvl';
import Begin from './src/pages/Begin';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');

  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-Italic': Montserrat_400Regular_Italic,
    'Montserrat-MediumItalic': Montserrat_500Medium_Italic,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
    'Montserrat-Black': Montserrat_900Black,
  });

  // Handle deep link after email confirmation
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url) {
        // Give Supabase a moment to process the token from the URL
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setCurrentScreen('login');
        }
      }
    };

    // App was already open when confirmation link was tapped
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // App was cold-started from the confirmation link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // NAVIGATION FLOW

  if (currentScreen === 'begin') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Begin onBegin={() => setCurrentScreen('entry')} />
      </View>
    );
  }

  if (currentScreen === 'physLvl') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <PhysLvl onBack={() => setCurrentScreen('height')} onNext={() => setCurrentScreen('begin')} />
      </View>
    );
  }

  if (currentScreen === 'height') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Height onBack={() => setCurrentScreen('weight')} onNext={() => setCurrentScreen('physLvl')} />
      </View>
    );
  }

  if (currentScreen === 'weight') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Weight onBack={() => setCurrentScreen('gender')} onNext={() => setCurrentScreen('height')} />
      </View>
    );
  }

  if (currentScreen === 'gender') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Gender onBack={() => setCurrentScreen('age')} onNext={() => setCurrentScreen('weight')} />
      </View>
    );
  }

  if (currentScreen === 'age') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Age onBack={() => setCurrentScreen('goal')} onNext={() => setCurrentScreen('gender')} />
      </View>
    );
  }
  
  if (currentScreen === 'goal') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Goal onNext={() => setCurrentScreen('age')} />
      </View>
    );
  }

  if (currentScreen === 'welcome3') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Welcome3 onNext={() => setCurrentScreen('goal')} />
      </View>
    );
  }

  if (currentScreen === 'welcome2') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Welcome2 onNext={() => setCurrentScreen('welcome3')} />
      </View>
    );
  }

  if (currentScreen === 'welcome1') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Welcome1 onNext={() => setCurrentScreen('welcome2')} />
      </View>
    );
  }

  if (currentScreen === 'welcome') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Welcome onNext={() => setCurrentScreen('welcome1')} />
      </View>
    );
  }

  if (currentScreen === 'avatarSelect') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AvatarSelect onNavigateNext={() => setCurrentScreen('welcome')} />
      </View>
    );
  }

  if (currentScreen === 'username') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Username onNavigateNext={() => setCurrentScreen('avatarSelect')} />
      </View>
    );
  }

  if (currentScreen === 'register') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Register 
          onNavigateToLogin={() => setCurrentScreen('login')} 
        />
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Login 
          onNavigateToRegister={() => setCurrentScreen('register')} 
          onSignIn={() => setCurrentScreen('entry')}
        />
      </View>
    );
  }

  if (currentScreen === 'entry') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Entry 
          onNavigateToLogin={() => setCurrentScreen('login')} 
          onNavigateToRegister={() => setCurrentScreen('register')} 
        />
      </View>
    );
  }

  // Splash Screen
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