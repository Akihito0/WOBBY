import React, { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, Image, StyleSheet, Dimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/supabase';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavBar from './src/components/layout/NavBar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { 
  useFonts, 
  Montserrat_400Regular,
  Montserrat_400Regular_Italic,
  Montserrat_500Medium_Italic, 
  Montserrat_700Bold, 
  Montserrat_800ExtraBold,
  Montserrat_900Black
} from '@expo-google-fonts/montserrat';

import {
  Barlow_700Bold,
  Barlow_600SemiBold,
  Barlow_400Regular
} from '@expo-google-fonts/barlow';

import * as SplashScreen from 'expo-splash-screen';

// Import your existing pages
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
import WorkoutScreen from './src/pages/WorkoutScreen';
import UserDashboard from './src/pages/UserDashboard';
import SoloWorkoutScreen from './src/pages/SoloWorkout';
import VersusWorkoutScreen from './src/pages/VersusWorkout';
import RunScreen from './src/pages/Run';
import WorkoutSummaryScreen from './src/pages/WorkoutSummaryScreen';
import NotificationsScreen from './src/pages/NotificationsScreen';
import RoutineSelectedScreen from './src/pages/RoutineSelectedScreen';
import ActiveWorkoutScreen from './src/pages/ActiveWorkoutScreen';
import RoutinesScreen from './src/pages/RoutinesScreen';
import PushScreen from './src/pages/PushScreen';
import PerformanceScreen from './src/pages/PerformanceScreen';
import LeaderboardsScreen from './src/pages/Leaderboards';
import AchievementsScreen from './src/pages/Achievements';
import YouPage from './src/pages/YouPage';
import YouSettings from './src/pages/YouSettings';
import PersonalInformation from './src/pages/PersonalInformation';
import LinkedDevices from './src/pages/LinkedDevices';
import PullScreen from './src/pages/PullScreen';
import LegScreen from './src/pages/LegScreen';

SplashScreen.preventAutoHideAsync();

type YouStackParamList = {
  YouMain: { scrollTo?: string };
  YouSettings: undefined;
  PersonalInformation: undefined;
  LinkedDevices: undefined;
};

const RoutinesStack = createNativeStackNavigator();
const WorkoutStack = createNativeStackNavigator();
const PerformanceStack = createNativeStackNavigator();
const YouStack = createNativeStackNavigator<YouStackParamList>();

const Stack = createNativeStackNavigator();

const PlaceholderScreen = () => <View style={{ flex: 1, backgroundColor: '#121310' }} />;
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const { width, height } = Dimensions.get('window');

// Define a type for the screens
type ScreenName = 
  | 'splash'
  | 'entry'
  | 'login'
  | 'register'
  | 'username'
  | 'avatarSelect'
  | 'welcome'
  | 'welcome1'
  | 'welcome2'
  | 'welcome3'
  | 'goal'
  | 'age'
  | 'gender'
  | 'weight'
  | 'height'
  | 'physLvl'
  | 'begin'
  | 'dashboard';

function PerformanceStackScreen() {
  return (
    <PerformanceStack.Navigator screenOptions={{ headerShown: false }}>
      <PerformanceStack.Screen name="PerformanceScreen" component={PerformanceScreen} />
      <PerformanceStack.Screen name="LeaderboardsScreen" component={LeaderboardsScreen} />
      <PerformanceStack.Screen name="AchievementsScreen" component={AchievementsScreen} />
    </PerformanceStack.Navigator>
  );
}


function WorkoutStackScreen() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutMain" component={WorkoutScreen} />
      <WorkoutStack.Screen name="SoloWorkoutScreen" component={SoloWorkoutScreen} />
      <WorkoutStack.Screen name="VersusWorkoutScreen" component={VersusWorkoutScreen} />
      <WorkoutStack.Screen name="RunScreen" component={RunScreen} />
      <WorkoutStack.Screen name="RoutineSelected" component={RoutineSelectedScreen} />
      <WorkoutStack.Screen name="ActiveWorkoutScreen" component={ActiveWorkoutScreen} />
      <WorkoutStack.Screen name="WorkoutSummaryScreen" component={WorkoutSummaryScreen} />
    </WorkoutStack.Navigator>
  );
}

function RoutinesStackScreen() {
  return (
    <RoutinesStack.Navigator screenOptions={{ headerShown: false }}>
      <RoutinesStack.Screen name="RoutinesMain" component={RoutinesScreen} />
      <RoutinesStack.Screen name="PushScreen" component={PushScreen} />
      <RoutinesStack.Screen name="PullScreen" component={PullScreen} />
      <RoutinesStack.Screen name="LegScreen" component={LegScreen} />
    </RoutinesStack.Navigator>
  );
}

 
function YouStackScreen() {
  return (
    <YouStack.Navigator screenOptions={{ headerShown: false }}>
      <YouStack.Screen name="YouMain" component={YouPage} />
      <YouStack.Screen name="YouSettings" component={YouSettings} />
      <YouStack.Screen name="PersonalInformation" component={PersonalInformation} />
      <YouStack.Screen name="LinkedDevices" component={LinkedDevices} />
    </YouStack.Navigator>
  );
}

// Extracted AppTabs to prevent unmounting
function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboard} />
      <Tab.Screen name="Routines" component={RoutinesStackScreen} />
      <Tab.Screen name="Workout" component={WorkoutStackScreen} />
      <Tab.Screen name="Performance" component={PerformanceStackScreen} />
      <Tab.Screen name="You" component={YouStackScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('splash');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-Italic': Montserrat_400Regular_Italic,
    'Montserrat-MediumItalic': Montserrat_500Medium_Italic,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
    'Montserrat-Black': Montserrat_900Black,
    'Barlow-Bold': Barlow_700Bold,
    'Barlow-SemiBold': Barlow_600SemiBold,
    'Barlow-Regular': Barlow_400Regular,
  });

  // Check if user is already logged in when app starts
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is already logged in, check their profile completeness
          console.log('✅ Session found! User:', session.user?.email);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, goal, age, gender, weight, height, physical_level')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }

          // Check if onboarding is complete (all fields filled)
          const isOnboardingComplete = 
            profile &&
            profile.username &&
            profile.avatar_url &&
            profile.goal &&
            profile.age &&
            profile.gender &&
            profile.weight &&
            profile.height &&
            profile.physical_level;

          if (!isOnboardingComplete) {
            console.log('👤 Incomplete profile detected, resuming onboarding...');
            
            // Route to appropriate onboarding page
            if (!profile || !profile.avatar_url) {
              console.log('→ Starting from Username (fresh registration)');
              setCurrentScreen('username');
            } else if (!profile.goal) {
              console.log('→ Resuming from Goal');
              setCurrentScreen('goal');
            } else if (!profile.age) {
              console.log('→ Resuming from Age');
              setCurrentScreen('age');
            } else if (!profile.gender) {
              console.log('→ Resuming from Gender');
              setCurrentScreen('gender');
            } else if (!profile.weight) {
              console.log('→ Resuming from Weight');
              setCurrentScreen('weight');
            } else if (!profile.height) {
              console.log('→ Resuming from Height');
              setCurrentScreen('height');
            } else if (!profile.physical_level) {
              console.log('→ Resuming from PhysLvl');
              setCurrentScreen('physLvl');
            } else {
              setCurrentScreen('username');
            }
          } else {
            // Profile complete, go to dashboard
            console.log('🚀 Complete profile found, navigating to dashboard...');
            setCurrentScreen('dashboard');
          }
        } else {
          // No session, show entry/login screen
          console.log('❌ No session found. Showing entry screen.');
          setCurrentScreen('entry');
        }
      } catch (error) {
        console.error('❌ Error checking auth status:', error);
        // Default to entry on error
        setCurrentScreen('entry');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    console.log('🔧 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event);
      console.log('📊 Session user:', session?.user?.email || 'no session');
      console.log('📊 Session access token:', session?.access_token ? '✅ exists' : '❌ missing');
      
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        // Sign-in event OR email confirmation detected while app is open
        console.log('📝 User signed in or updated, checking profile completeness...');
        const checkProfile = async () => {
          try {
            console.log('🔍 Querying profile for user:', session.user.id);
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('username, avatar_url, goal, age, gender, weight, height, physical_level')
              .eq('id', session.user.id)
              .single();

            if (error) {
              if (error.code !== 'PGRST116') {
                // PGRST116 = no rows returned (expected for new users)
                console.error('❌ Profile query error:', error.code, error.message);
              } else {
                console.log('ℹ️ No profile found (PGRST116 - new user)');
              }
            } else {
              console.log('✅ Profile found:', {
                username: profile?.username || '❌ missing',
                avatar_url: profile?.avatar_url ? '✅' : '❌',
                goal: profile?.goal || '❌',
                age: profile?.age || '❌',
                gender: profile?.gender || '❌',
                weight: profile?.weight || '❌',
                height: profile?.height || '❌',
                physical_level: profile?.physical_level || '❌',
              });
            }

            // Check if onboarding is complete (all fields filled)
            const isOnboardingComplete = 
              profile &&
              profile.username &&
              profile.avatar_url &&
              profile.goal &&
              profile.age &&
              profile.gender &&
              profile.weight &&
              profile.height &&
              profile.physical_level;

            if (!isOnboardingComplete) {
              console.log('👤 Incomplete profile detected, starting/continuing onboarding...');
              
              // Route to appropriate onboarding page based on what's been filled
              if (!profile || !profile.avatar_url) {
                console.log('→ Starting from Username (fresh registration)');
                setCurrentScreen('username');
              } else if (!profile.goal) {
                console.log('→ Resuming from Goal');
                setCurrentScreen('goal');
              } else if (!profile.age) {
                console.log('→ Resuming from Age');
                setCurrentScreen('age');
              } else if (!profile.gender) {
                console.log('→ Resuming from Gender');
                setCurrentScreen('gender');
              } else if (!profile.weight) {
                console.log('→ Resuming from Weight');
                setCurrentScreen('weight');
              } else if (!profile.height) {
                console.log('→ Resuming from Height');
                setCurrentScreen('height');
              } else if (!profile.physical_level) {
                console.log('→ Resuming from PhysLvl');
                setCurrentScreen('physLvl');
              } else {
                setCurrentScreen('username');
              }
            } else {
              console.log('✅ Onboarding complete! User profile fully filled.');
              setCurrentScreen('dashboard');
            }
          } catch (error) {
            console.error('❌ Error checking profile:', error);
            console.error('Error details:', error instanceof Error ? error.message : JSON.stringify(error));
            setCurrentScreen('username'); // Default to onboarding on error
          }
        };
        checkProfile();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, going to entry screen...');
        setCurrentScreen('entry');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Handle deep link after OAuth callback or email confirmation
  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        if (url) {
          console.log('🔗 Deep link received:', url);
          
          // For OAuth, Supabase redirects with tokens in the hash/fragment
          // We need to explicitly extract them since native apps work differently than web
          try {
            // Parse the redirect URL to extract OAuth tokens
            const result = await supabase.auth.parseRedirectUrl(url);
            console.log('📊 Parsed redirect URL:', {
              access_token: result.data?.session?.access_token ? '✅ found' : '❌ missing',
              refresh_token: result.data?.session?.refresh_token ? '✅ found' : '❌ missing',
              user_email: result.data?.session?.user?.email,
            });

            if (result.data?.session) {
              console.log('✅ Session found in redirect URL! Setting session...');
              // Manually set the session from the OAuth callback
              // This is critical for native apps since detectSessionInUrl doesn't work the same way
              const { error: setSessionError } = await supabase.auth.setSession(result.data.session);
              if (setSessionError) {
                console.error('❌ Error setting session from OAuth:', setSessionError);
              } else {
                console.log('✅ Session set successfully from OAuth token!');
                // Auth state listener should fire and handle routing
              }
            } else {
              console.log('ℹ️ No session data in redirect URL - this might be an email confirmation link');
            }
          } catch (parseError) {
            console.warn('⚠️ Error parsing redirect URL (might not be an OAuth redirect):', parseError);
            // This is normal for non-OAuth deep links
          }
        }
      } catch (err) {
        console.error('Error handling deep link:', err);
      }
    };

    // App was already open when confirmation/OAuth link was tapped
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // App was cold-started from the confirmation/OAuth link
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

  // --- NAVIGATION FLOW ---  
  if (currentScreen === 'dashboard') {
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="AppTabs" component={AppTabs} />
          <MainStack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </MainStack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </View>
  );
}

  if (currentScreen === 'begin') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Begin onBegin={() => setCurrentScreen('dashboard')} />
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
        <Username 
          onNavigateNext={() => setCurrentScreen('avatarSelect')}
          onLogout={() => setCurrentScreen('entry')}
        />
      </View>
    );
  }

  if (currentScreen === 'register') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Register 
          onNavigateToLogin={() => setCurrentScreen('login')} 
          onRegisterSuccess={() => {
            // onAuthStateChange will handle navigation, so we can just log it.
            console.log('Registration successful, waiting for auth state change...');
          }}
        />
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Login 
          onNavigateToRegister={() => setCurrentScreen('register')}
          onSignIn={() => {}} // Auth listener handles routing
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
        resizeMode="cover" 
        style={styles.splashImage}
      />
      <StatusBar style="light" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splashImage: { width: width, height: height },
});