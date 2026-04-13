import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import AssessBg from '../components/layout/AssessBg';
import { supabase } from '../supabase'; 

const { width } = Dimensions.get('window');

// generate ages from 13 to 99
const AGES = Array.from({ length: 87 }, (_, i) => i + 13);
const ITEM_HEIGHT = 95; // Height of each age number row

export default function Age({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
  const [selectedAge, setSelectedAge] = useState(19);
  const [loading, setLoading] = useState(false);
  
  // scroll logic to find the center item
  const onScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (AGES[index]) {
      setSelectedAge(AGES[index]);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({ age: selectedAge })
        .eq('id', user.id);

      if (error) throw error;
      onNext();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save age.');
    } finally {
      setLoading(false);
    }
  };

  const renderAge = ({ item }: { item: number }) => {
    const isSelected = item === selectedAge;
    return (
      <View style={[styles.ageItem, { height: ITEM_HEIGHT }]}>
        {isSelected ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedText}>{item}</Text>
          </View>
        ) : (
          <Text style={styles.unselectedText}>{item}</Text>
        )}
      </View>
    );
  };

 return (
    <AssessBg onBack={onBack}>
      <View style={styles.container}>
        <Text style={styles.title}>How Old Are You?</Text>

        <View style={styles.pickerWrapper}>
          <View style={styles.fixedSelectedBox} />

          <FlatList
            data={AGES}
            renderItem={({ item }) => {
              const isSelected = item === selectedAge;
              return (
                <View style={[styles.ageItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[
                    styles.unselectedText, 
                    isSelected && styles.selectedText
                  ]}>
                    {item}
                  </Text>
                </View>
              );
            }}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingVertical: ITEM_HEIGHT * 2, 
            }}
          />
        </View>

        <TouchableOpacity
          style={styles.continueButtonActive}
          activeOpacity={0.8}
          disabled={loading}
          onPress={handleContinue}
        >
          <View style={styles.neonBorder} />
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#CCFF00" />
            ) : (
              <>
                <Text style={styles.buttonTextActive}>Continue</Text>
                <Image 
                  source={require('../assets/arrow0.png')} 
                  style={styles.arrow}
                  resizeMode="contain"
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </AssessBg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 30,
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * 5,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedSelectedBox: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    backgroundColor: '#CCFF00',
    width: 160,
    height: 100,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
  },
  ageItem: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 35,
    color: '#8F8F8F',
  },
  selectedBox: {
    backgroundColor: '#CCFF00',
    width: 137,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  selectedText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 95,
    color: '#000',
    alignItems: 'center',
    lineHeight: 100,
  },
  continueButtonActive: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.85,
    height: 60,
    backgroundColor: '#000000',
    borderWidth: 2.5,
    borderColor: '#CCFF00',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 10,
  },
  buttonTextActive: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
  },
  arrow: {
    width: 20,
    height: 20,
  },
});