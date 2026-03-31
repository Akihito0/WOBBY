import React from 'react';
import { ImageBackground, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
}

const AuthBackground = ({ children }: Props) => {
  return (
    <ImageBackground 
      // Path: We are in layout, go up to components, up to src, then into assets
      source={require('../../assets/bg1.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {children}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    width: width,
    height: height,
    flex: 1,
  },
  overlay: {
    flex: 1,
    // Optional: Add a very slight dark tint if your text is hard to read
    // backgroundColor: 'rgba(0,0,0,0.2)', 
  },
});

export default AuthBackground;