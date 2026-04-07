import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const RunScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      {/* Header with 262deg Gradient */}
<LinearGradient
  colors={['#193845', '#000000']}
  start={{ x: 1, y: 0.1 }}   
  end={{ x: 0.2, y: 0.9 }}   
  style={styles.header}
>
  <TouchableOpacity 
    style={styles.backBtn} 
    onPress={() => navigation.goBack()}
  >
    <Image source={require('../assets/back0.png')} style={styles.backBtn} />
  </TouchableOpacity>
  
  <Text style={styles.headerTitle}>RUN</Text>
</LinearGradient>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121310', 
    paddingHorizontal: 20 
},
  header: { 
    backgroundColor: '#000000',
    paddingTop: 65, 
    marginBottom: 30,
    width: 500,
    height: 140,
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    left: -20,
},
  backBtn: { 
    width: 30, 
    height: 30, 
    position: 'absolute', 
    left: 12,
    marginTop: -65,
},
  headerTitle: { 
    color: '#d1d1d1', 
    fontSize: 40, 
    fontFamily: 'Montserrat-Black', 
    right: -250,
},
});

export default RunScreen;