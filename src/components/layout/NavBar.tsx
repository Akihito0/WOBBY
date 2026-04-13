// src/components/layout/NavBar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

// 1. This Interface tells TypeScript it's okay to use either Library or Manual props
interface NavBarProps extends Partial<BottomTabBarProps> {
  activeTab?: string;
  onTabPress?: (tabName: string) => void;
}

const icons: { [key: string]: { inactive: any; active: any } } = {
  Home: {
    inactive: require('../../assets/home.png'),
    active: require('../../assets/home0.png'),
  },
  Routines: {
    inactive: require('../../assets/routines1.png'),
    active: require('../../assets/routines00.png'),
  },
  Workout: {
    inactive: require('../../assets/workout.png'),
    active: require('../../assets/workout0.png'),
  },
  Performance: {
    inactive: require('../../assets/perf1.png'),
    active: require('../../assets/perf00.png'),
  },
  You: {
    inactive: require('../../assets/you1.png'),
    active: require('../../assets/you00.png'),
  },
};

const NavBar: React.FC<NavBarProps> = ({ state, descriptors, navigation, activeTab, onTabPress }) => {
  // Don't show navbar when on ActiveWorkoutScreen
  if (state?.routes[state.index]?.state?.routes) {
    const innerRoute = state.routes[state.index].state.routes[state.routes[state.index].state.index];
    if (innerRoute?.name === 'ActiveWorkoutScreen') {
      return null;
    }
  }
  
  // 2. We define the routes. If the library 'state' exists, we use it. 
  // Otherwise, we use a manual list for your WorkoutScreen test.
  const routes = state?.routes || [
    { key: 'home', name: 'Home' },
    { key: 'routines', name: 'Routines' },
    { key: 'workout', name: 'Workout' },
    { key: 'performance', name: 'Performance' },
    { key: 'you', name: 'You' },
  ];

  return (
    <View style={styles.container}>
      {routes.map((route, index) => {
        // 3. Logic to determine if the tab is focused (Works for both methods)
        const isFocused = state ? state.index === index : activeTab === route.name;
        
        const label = descriptors && descriptors[route.key]?.options.tabBarLabel 
          ? descriptors[route.key].options.tabBarLabel 
          : route.name;

        const handlePress = () => {
          // If manual prop exists, call it
          if (onTabPress) onTabPress(route.name);

          // If navigation library exists, use it
          if (navigation) {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }
        };

        const isWorkout = route.name === 'Workout';
        const iconSource = isFocused
          ? icons[route.name]?.active
          : icons[route.name]?.inactive;

        if (isWorkout) {
          return (
            <View key={route.key} style={styles.workoutWrapper}>
              <View style={styles.workoutBump} />
              <TouchableOpacity
                onPress={handlePress}
                style={styles.workoutButton}
                activeOpacity={0.8}
              >
                <Image source={iconSource} style={styles.workoutIcon} />
                <Text style={[styles.label, { color: isFocused ? '#CCFF00' : '#FFFFFF' }]}>
                  {route.name}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={handlePress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Image
              source={iconSource}
              style={[styles.icon, !isFocused && { tintColor: '#FFFFFF' }]}
            />
            <Text style={[styles.label, { color: isFocused ? '#CCFF00' : '#FFFFFF' }]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    height: 80,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    bottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
    marginTop: 1,
  },
  workoutWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 100,
    bottom: 20,
  },
  workoutBump: {
    position: 'absolute',
    top: 10,
    width: 88,
    height: 50,
    backgroundColor: '#000000',
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
  },
  workoutButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 4,
  },
  workoutIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginTop: -10,
  },
});

export default NavBar;