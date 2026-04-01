import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image 
} from 'react-native';
import AssessBg from '../components/layout/AssessBg';

const { width } = Dimensions.get('window');

const MIN_HEIGHT = 100; 
const MAX_HEIGHT = 250; 
const STEP = 15;
const RULER_DATA = Array.from({ length: MAX_HEIGHT - MIN_HEIGHT + 1 }, (_, i) => MAX_HEIGHT - i);
const CENTER_OFFSET = 150;

export default function Height({ onBack, onNext }: { onBack: () => void, onNext: (val: string, unit: string) => void }) {
  const [unit, setUnit] = useState('cm');
  const [showDropdown, setShowDropdown] = useState(false);
  const [heightValue, setHeightValue] = useState(165);
  
  const units = ['cm', 'm', 'ft', 'in'];

  // unit conversion logic
  const formatHeight = (val: number, currentUnit: string) => {
    if (currentUnit === 'cm') return `${val}`;
    if (currentUnit === 'm') return (val / 100).toFixed(2);
    if (currentUnit === 'in') return `${Math.round(val * 0.3937)}`;
    if (currentUnit === 'ft') {
      const totalInches = val * 0.3937;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}`;
    }
    return `${val}`;
  };

  const onScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / STEP);
    if (RULER_DATA[index]) {
      setHeightValue(RULER_DATA[index]);
    }
  };

  const renderRulerItem = ({ item }: { item: number }) => {
    const isMain = item % 5 === 0;
    const isSelected = item === heightValue;

    return (
      <View style={[styles.rulerStep, { height: STEP }]}>
        <View style={styles.numberContainer}>
          {isMain && (
            <Text style={[styles.rulerNumber, isSelected && styles.selectedRulerText]}>
              {formatHeight(item, unit)}
            </Text>
          )}
        </View>
        <View style={[styles.line, isMain ? styles.mainLine : styles.subLine, isSelected && styles.selectedLine]} />
      </View>
    );
  };

  return (
    <AssessBg onBack={onBack}>
      <View style={styles.container}>
        <Text style={styles.title}>What Is Your Height?</Text>

        <View style={styles.displaySection}>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>
              {formatHeight(heightValue, unit)}
            </Text>
          </View>
          
          <View style={styles.unitDropdownContainer}>
            <TouchableOpacity 
              style={styles.unitSelector} 
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={styles.unitText}>{unit}</Text>
              <Image source={require('../assets/arrow-down.png')} style={styles.dropdownArrow} />
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdownMenu}>
                {units.map((u) => (
                  <TouchableOpacity 
                    key={u} 
                    onPress={() => { setUnit(u); setShowDropdown(false); }} 
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <View style={styles.blackRulerBox}>
            <FlatList
              data={RULER_DATA}
              renderItem={renderRulerItem}
              keyExtractor={(item) => item.toString()}
              showsVerticalScrollIndicator={false}
              snapToInterval={STEP}
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: CENTER_OFFSET }}
              initialScrollIndex={MAX_HEIGHT - 165}
              getItemLayout={(data, index) => ({ length: STEP, offset: STEP * index, index })}
            />
          </View>
          
          <Image 
            source={require('../assets/arrow-up.png')} 
            style={styles.indicatorArrow} 
          />
        </View>

        <TouchableOpacity 
          style={styles.continueButtonActive} 
          onPress={() => onNext(formatHeight(heightValue, unit), unit)}
        >
          <View style={styles.neonBorder} />
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTextActive}>Continue</Text>
            <Image source={require('../assets/arrow0.png')} style={styles.arrow} />
          </View>
        </TouchableOpacity>
      </View>
    </AssessBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 26, 
    color: '#000', 
    marginTop: 10, 
    marginBottom: 30 
  },
  displaySection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 40, 
    zIndex: 100 
  },
  valueBox: { 
    backgroundColor: '#CCFF00', 
    height: 100,
    minWidth: 160,
    paddingHorizontal: 20, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  valueText: { 
    fontFamily: 'Montserrat-Black', 
    fontSize: 55,
    color: '#000' 
  },
  unitDropdownContainer: { marginLeft: 10, position: 'relative' },
  unitSelector: { flexDirection: 'row', alignItems: 'center' },
  unitText: { fontFamily: 'Montserrat-Bold', fontSize: 22, color: '#545454' },
  dropdownArrow: { width: 12, height: 12, marginLeft: 5, tintColor: '#545454' },
  dropdownMenu: { 
    position: 'absolute', 
    top: 30, 
    left: 0, 
    backgroundColor: '#FFF', 
    borderRadius: 10, 
    elevation: 5, 
    padding: 5, 
    width: 60 
  },
  dropdownItem: { paddingVertical: 5, alignItems: 'center' },
  dropdownItemText: { fontFamily: 'Montserrat-Bold', fontSize: 16, color: '#545454' },
  pickerContainer: { 
    height: 350, 
    width: width, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'visible'
  },
  blackRulerBox: { 
    backgroundColor: '#000', 
    width: 130, 
    height: '100%', 
    borderRadius: 15, 
    overflow: 'visible',
    marginTop: -25,
  },
  rulerStep: { 
    width: 170, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end',
    transform: [{ translateX: -40 }] 
  },
  numberContainer: { 
    width: 70, 
    height: 20,
    marginRight: 15,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  rulerNumber: { 
    color: '#BDBDBD', 
    fontFamily: 'Montserrat-Bold', 
    fontSize: 18, 
  },
  selectedRulerText: { 
    color: '#000', 
    fontSize: 24, 
    fontFamily: 'Montserrat-Black' 
  },
  line: { 
    height: 2, 
    backgroundColor: '#555', 
    borderRadius: 1
  },
  mainLine: { width: 45, backgroundColor: '#FFF' },
  subLine: { width: 25, backgroundColor: '#444' },
  selectedLine: { 
    backgroundColor: '#CCFF00', 
    width: 55,
    height: 3 
  },
  indicatorArrow: { 
    width: 20, 
    height: 20, 
    tintColor: '#CCFF00', 
    transform: [{ rotate: '-90deg' }], 
    marginLeft: 15, 
    marginTop: -50,
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
    borderWidth: 2.5,
    elevation: 10,
    shadowColor: '#818181',
    shadowOpacity: 0.9,
    shadowRadius: 10,
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