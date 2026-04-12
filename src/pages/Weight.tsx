import React, { useState, useRef, useEffect } from 'react';
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

// Ruler settings
const MIN_WEIGHT = 20; // Min KG
const MAX_WEIGHT = 200; // Max KG
const STEP = 10; 
const RULER_DATA = Array.from({ length: MAX_WEIGHT - MIN_WEIGHT + 1 }, (_, i) => i + MIN_WEIGHT);
const CENTER_SPACING = width / 2;

export default function Weight({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
  const [unit, setUnit] = useState<'KG' | 'LB'>('KG');
  const [weightKg, setWeightKg] = useState(75);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Conversion math
  const kgToLb = (kg: number) => Math.round(kg * 2.20462);
  const lbToKg = (lb: number) => Math.round(lb / 2.20462);

  const onScroll = (event: any) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / STEP);
    if (RULER_DATA[index]) {
      setWeightKg(RULER_DATA[index]);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from('profiles')
        .update({ weight: weightKg, weight_unit: unit })
        .eq('id', user.id);

      if (error) throw error;
      onNext();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save weight.');
    } finally {
      setLoading(false);
    }
  };

  const renderRulerItem = ({ item }: { item: number }) => {
  const isMain = item % 5 === 0;
  return (
    <View style={styles.rulerStep}>

      <View style={styles.blackBarDecor} />
      
      <View style={[styles.line, isMain ? styles.mainLine : styles.ssubLine]} />
      
      {isMain && (
        <Text style={styles.rulerNumber}>
          {unit === 'KG' ? item : kgToLb(item)}
        </Text>
      )}
    </View>
  );
};

  return (
    <AssessBg onBack={onBack}>
      <View style={styles.container}>
        <Text style={styles.title}>What Is Your Current{"\n"}Weight Right Now?</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, unit === 'KG' && styles.toggleBtnActive]}
            onPress={() => setUnit('KG')}
          >
            <Text style={[styles.toggleText, unit === 'KG' && styles.toggleTextActive]}>KG</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, unit === 'LB' && styles.toggleBtnActive]}
            onPress={() => setUnit('LB')}
          >
            <Text style={[styles.toggleText, unit === 'LB' && styles.toggleTextActive]}>LB</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weightDisplay}>
          <View style={styles.weightBox}>
            <Text style={styles.weightValue}>{unit === 'KG' ? weightKg : kgToLb(weightKg)}</Text>
          </View>
          <Text style={styles.unitLabel}>{unit.toLowerCase()}</Text>
        </View>

        <View style={styles.rulerContainer}>
          <Image source={require('../assets/arrow-up.png')} style={styles.indicatorArrow} />
          
          <View style={styles.rulerScrollArea}>
             <FlatList
                ref={flatListRef}
                data={RULER_DATA}
                horizontal
                keyExtractor={(item) => item.toString()}
                renderItem={renderRulerItem}
                showsHorizontalScrollIndicator={false}
                snapToInterval={STEP}
                decelerationRate="fast"
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingHorizontal: CENTER_SPACING,
                }}
                getItemLayout={(data, index) => ({
                    length: STEP,
                    offset: STEP * index,
                    index,
                })}
                initialScrollIndex={75 - MIN_WEIGHT}
             />
             <View style={styles.centerLine} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButtonActive}
          onPress={handleContinue}
          disabled={loading}
        >
          <View style={styles.neonBorder} />
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#CCFF00" />
            ) : (
              <>
                <Text style={styles.buttonTextActive}>Continue</Text>
                <Image source={require('../assets/arrow0.png')} style={styles.arrow} />
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
    alignItems: 'center' 
  },
  title: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 24, 
    color: '#000', 
    textAlign: 'center', 
    marginTop: 10 
  },
  toggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#000', 
    marginTop: 50, 
    overflow: 'hidden' 
  },
  toggleBtn: { 
    width: 80, 
    height: 45, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  toggleBtnActive: { 
    backgroundColor: '#000' 
  },
  toggleText: { 
    fontFamily: 'Montserrat-Bold', 
    fontSize: 16, 
    color: '#999' 
  },
  toggleTextActive: { 
    color: '#CCFF00' 
  },
  weightDisplay: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    marginTop: 60,
  },
  weightBox: { 
    backgroundColor: '#CCFF00', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 15, 
    borderWidth: 2, 
    height: 90,
    borderColor: '#000' 
  },
  weightValue: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 50, 
    color: '#000' 
  },
  unitLabel: { 
    fontFamily: 'Montserrat-Bold', 
    fontSize: 20, 
    color: '#545454', 
    marginLeft: 10, 
    marginBottom: 10,
  },
  rulerContainer: { 
    width: '100%', 
    height: 200, 
    marginTop: 20, 
    alignItems: 'center',
    overflow: 'visible' 
  },
  indicatorArrow: { 
    width: 25, 
    height: 25, 
    marginBottom: 5, 
    tintColor: '#CCFF00' 
  },
  rulerScrollArea: { 
    width: width, 
    height: 150, 
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  rulerStep: { 
    width: STEP, 
    height: 150, 
    alignItems: 'center',
  },
  blackBarDecor: {
    position: 'absolute',
    width: STEP,
    height: 90, 
    backgroundColor: '#000',
  },
  line: { 
    backgroundColor: '#555', 
    width: 2,
    zIndex: 1, 
  },
  mainLine: { 
    height: 45, 
    backgroundColor: '#FFF',
    marginTop: 15,
  },
  ssubLine: { 
    height: 20, 
    marginTop: 30,
    backgroundColor: '#444' 
  },
  rulerNumber: { 
    fontFamily: 'Montserrat-Bold', 
    fontSize: 22, 
    color: '#545454', 
    position: 'absolute',
    top: 100, 
    width: 80,    
    textAlign: 'center',    
    left: (STEP / 2) - 40, 
  },
  centerLine: { 
    position: 'absolute', 
    left: width / 2 - 1.5, 
    top: 0, 
    width: 3, 
    height: 90, 
    backgroundColor: '#CCFF00', 
    borderRadius: 2,
    zIndex: 10
  },
  continueButtonActive: { 
    position: 'absolute', 
    bottom: 80, 
    width: width * 0.85, 
    height: 60, 
    backgroundColor: '#000', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderColor: '#CCFF00', 
    borderWidth: 2.5 
  },
  neonBorder: { 
    position: 'absolute', 
    top: -3, 
    bottom: -3, 
    left: -3, 
    right: -3, 
    borderRadius: 23, 
    borderWidth: 2, 
    borderColor: 'rgba(204, 255, 0, 0.3)' 
  },
  buttonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  buttonTextActive: { 
    color: '#CCFF00', 
    fontFamily: 'Montserrat-ExtraBold', 
    fontSize: 18 
  },
  arrow: { 
    width: 20, 
    height: 20 
  }
});