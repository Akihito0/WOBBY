import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

const NavBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const icons: { [key: string]: any } = {
    Home: require('./assets/home.png'),
    Routines: require('./assets/routines.png'),
    Workout: require('./assets/workout.png'),
    Performance: require('./assets/perf.png'),
    You: require('./assets/you.png'),
  };

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
        const isFocused = state.index === index;

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

        // raised center button for Workout
        if (route.name === 'Workout') {
          return (
            <View key={index} style={styles.workoutContainer}>
              <View style={styles.curve} />
              <TouchableOpacity onPress={onPress} style={styles.raisedButton}>
                <Image source={icons[route.name]} style={styles.workoutIcon} />
                <Text style={styles.workoutText}>{typeof label === 'function' ? label({ focused: isFocused, color: '#FFFFFF', position: 'below-icon', children: route.name }) : label}</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Image 
              source={icons[route.name]} 
              style={[styles.icon, { tintColor: isFocused ? '#CCFF00' : '#FFFFFF' }]} 
            />
            <Text style={[styles.label, { color: isFocused ? '#CCFF00' : '#FFFFFF' }]}>
              {typeof label === 'function' ? label({ focused: isFocused, color: isFocused ? '#CCFF00' : '#FFFFFF', position: 'below-icon', children: route.name }) : label}
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
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold', 
  },
  workoutContainer: {
    flex: 1,
    alignItems: 'center',
    bottom: 20, // Elevates the button
  },
  raisedButton: {
    backgroundColor: '#000000',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 50,
    height: 50,
    tintColor: '#FFFFFF',
  },
  workoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Barlow-SemiBold',
    marginTop: 2,
  },
  curve: {
    position: 'absolute',
    top: 20,
    width: 90,
    height: 45,
    backgroundColor: '#000000',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
  }
});

export default NavBar;