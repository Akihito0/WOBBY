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

const icons: { [key: string]: { inactive: any; active: any } } = {
  Home: {
    inactive: require('../../assets/home.png'),
    active: require('../../assets/home0.png'),
  },
  Routines: {
    inactive: require('../../assets/routines.png'),
    active: require('../../assets/routines0.png'),
  },
  Workout: {
    inactive: require('../../assets/workout.png'),
    active: require('../../assets/workout0.png'),
  },
  Performance: {
    inactive: require('../../assets/perf.png'),
    active: require('../../assets/perf0.png'),
  },
  You: {
    inactive: require('../../assets/you.png'),
    active: require('../../assets/you0.png'),
  },
};

const NavBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const isWorkout = route.name === 'Workout';
        const iconSource = isFocused
          ? icons[route.name]?.active
          : icons[route.name]?.inactive;

        if (isWorkout) {
          return (
            <View key={route.key} style={styles.workoutWrapper}>
              {/* Curved cutout background */}
              <View style={styles.workoutBump} />
              <TouchableOpacity
                onPress={onPress}
                style={styles.workoutButton}
                activeOpacity={0.8}
              >
                <Image source={iconSource} style={styles.workoutIcon} />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? '#CCFF00' : '#FFFFFF' },
                  ]}
                >
                  {typeof label === 'function'
                    ? label({
                        focused: isFocused,
                        color: isFocused ? '#CCFF00' : '#FFFFFF',
                        position: 'below-icon',
                        children: route.name,
                      })
                    : label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Image
              source={iconSource}
              style={[
                styles.icon,
                !isFocused && { tintColor: '#FFFFFF' },
              ]}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? '#CCFF00' : '#FFFFFF' },
              ]}
            >
              {typeof label === 'function'
                ? label({
                    focused: isFocused,
                    color: isFocused ? '#CCFF00' : '#FFFFFF',
                    position: 'below-icon',
                    children: route.name,
                  })
                : label}
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
    borderTopWidth: 0,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
  },

  // Workout raised button
  workoutWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 100,
    bottom: 20,
  },
  workoutBump: {
    position: 'absolute',
    top: 0,
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
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
});

export default NavBar;