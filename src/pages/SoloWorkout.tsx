import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SoloWorkoutScreen = ({ navigation }: any) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header with 262deg Gradient */}
<LinearGradient
  colors={['#0F4933', '#000000']}
  // 262deg starts from the right/top and moves to the left/bottom
  start={{ x: 1, y: 0.1 }}   // High Green (Right)
  end={{ x: 0.2, y: 0.9 }}   // Deep Black (Left)
  style={styles.header}
>
  <TouchableOpacity 
    style={styles.backBtn} 
    onPress={() => navigation.goBack()}
  >
    <Image source={require('../assets/back0.png')} style={styles.backBtn} />
  </TouchableOpacity>
  
  <Text style={styles.headerTitle}>SOLO WORKOUT</Text>
</LinearGradient>

      {/* Stats Card with 93deg Gradient */}
<LinearGradient
  colors={['#000000', '#323C2E']}
  // 93deg starts at 2.62% Black (Left) and ends at 100% Greenish-Gray (Right)
  start={{ x: 0.02, y: 0.5 }} 
  end={{ x: 1, y: 0.5 }}
  style={styles.statsCard}
>
  <Text style={styles.labelSmall}>DURATION</Text>
  <Text style={styles.timerText}>00:00:00</Text>
  
  <View style={styles.row}>
    <View style={styles.statGroup}>
      <Text style={styles.labelTiny}>Total Repetition</Text>
      <Text style={styles.statValue}>0</Text>
    </View>
    <View style={styles.statGroup}>
      <Text style={styles.labelTiny}>Total Sets</Text>
      <Text style={styles.statValue}>0</Text>
    </View>
  </View>
</LinearGradient>

      {/* Select Routine Button */}
<TouchableOpacity 
  activeOpacity={0.8}
  onPress={() => setModalVisible(true)}
  style={styles.selectBtnWrapper}
>
  <LinearGradient
    colors={['#B1DD01', '#678101']}
    start={{ x: 0, y: 0.5 }}
    end={{ x: 1, y: 0.5 }}
    style={styles.gradientContainer}
  >
    <Text style={styles.selectBtnText}>SELECT ROUTINE</Text>
  </LinearGradient>
</TouchableOpacity>

      {/* --- ROUTINES MODAL --- */}
<Modal
  animationType="fade"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalOverlay}>

    {/* Modal background with gradient + border */}
    <LinearGradient
      colors={['#000000', '#666666']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.modalContent}
    >
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeIcon}
        onPress={() => setModalVisible(false)}
      >
        <Image source={require('../assets/closee.png')} style={styles.closeImg} />
      </TouchableOpacity>

      <Text style={styles.modalTitle}>ROUTINES</Text>

      {/* Routine Buttons */}
      {[
        { type: 'PUSH', sub: 'Chest, Shoulders, Triceps', icon: require('../assets/push.png') },
        { type: 'PULL', sub: 'Back, Biceps',              icon: require('../assets/pull.png') },
        { type: 'LEG',  sub: 'Lower Body',                icon: require('../assets/leg.png')  },
      ].map(({ type, sub, icon }) => (
        <TouchableOpacity key={type} style={styles.routineItemWrapper}>
         <LinearGradient
  colors={['#180020', '#000000']}
  start={{ x: 0, y: 0 }}
  end={{ x: 0, y: 1 }}
  style={styles.routineItem}
>
  <Image source={icon} style={styles.icon} />
  <View>
    <Text style={styles.routineTitle}>{type}</Text>
    <Text style={styles.routineSub}>{sub}</Text>
  </View>
</LinearGradient>
        </TouchableOpacity>
      ))}

    </LinearGradient>
  </View>
</Modal>
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
    marginBottom: 32,
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
    fontSize: 32, 
    fontFamily: 'Montserrat-Black', 
    right: -100,
},
  statsCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 30,
    marginTop: 5,
    alignItems: 'center',
  },
  labelSmall: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold', // or your chosen font
    marginBottom: 5,
  },
  labelTiny: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
  },
  statGroup: {
    alignItems: 'center',
    flex: 1, // This helps space the two columns evenly
  },
  statValue: {
    color: '#A3CF06', // Your neon green
    fontSize: 30,
    fontFamily: 'Barlow-Bold',
  },
  timerText: { 
    color: '#A3CF06', 
    fontSize: 40, 
    fontFamily: 'Barlow-Bold', 
    marginVertical: 5 
},
  row: { flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginTop: 20 
},
  selectBtnWrapper: {
    marginTop: 30,
    width: 325,       
    height: 55,          
    borderRadius: 15,     
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  gradientContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnText: {
    fontFamily: 'Montserrat-ExtraBold', 
    color: '#000000',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 1,
  },

  // Modal Styles
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.75)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '88%',
  borderRadius: 30,
  borderWidth: 1,
  borderColor: '#CCFF00',
  padding: 24,
  alignItems: 'center',
},
closeIcon: {
  alignSelf: 'flex-end',
  marginBottom: 8,
},
closeImg: {
  width: 32,
  height: 32,
  resizeMode: 'contain',
},
modalTitle: {
  color: 'white',
  fontSize: 28,
  fontFamily: 'Montserrat-ExtraBold',
  marginBottom: 20,
},
routineItemWrapper: {
  width: '100%',
  borderRadius: 10,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 6,
},
routineItem: {
  borderRadius: 10,
  paddingVertical: 15,
  paddingHorizontal: 53,
  flexDirection: 'row',    
  alignItems: 'center',
},
icon: {
  width: 50,
  height: 50,
  resizeMode: 'contain',
  marginRight: 16,
},
routineTitle: {
  color: '#CCFF00',
  fontSize: 20,
  fontFamily: 'Montserrat-Bold',
},
routineSub: {
  color: '#CCCCCC',
  fontSize: 12,
  fontFamily: 'Montserrat-Regular',
  marginTop: 2,
},
});

export default SoloWorkoutScreen;