import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, TextInput, Modal, Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
  PersonalInformation: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'PersonalInformation'>;

export default function PersonalInformation({ navigation }: Props) {
  const [username, setUsername] = useState('cashew_123');
  const [fullName, setFullName] = useState('Tung Tung Tung Sahur');
  const [age, setAge] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // ── Focus states ──
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);
  const [heightFocused, setHeightFocused] = useState(false);

  // ── Saved state — forces all text back to grey after Save ──
  const [saved, setSaved] = useState(false);

  const inputColor = (focused: boolean) => {
    if (saved) return '#939394';
    if (focused) return '#FFFFFF';
    return '#939394';
  };

  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years--;
    return years;
  };

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selected) {
        setBirthDate(selected);
        setAge(String(calculateAge(selected)));
        setSaved(false);
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const handleIOSConfirm = () => {
    setBirthDate(tempDate);
    setAge(String(calculateAge(tempDate)));
    setSaved(false);
    setShowDatePicker(false);
  };

  const handleChangePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={['#001E20', '#000000']}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Image source={require('../assets/back0.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PROFILE SETTINGS</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={avatarUri ? { uri: avatarUri } : require('../assets/5.png')}
              style={styles.avatar}
            />
          </View>
          <TouchableOpacity onPress={handleChangePicture}>
            <Text style={styles.changePictureText}>Change Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/username.png')} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: inputColor(usernameFocused) }]}
                value={username}
                onChangeText={(t) => { setSaved(false); setUsername(t); }}
                onFocus={() => { setSaved(false); setUsernameFocused(true); }}
                onBlur={() => setUsernameFocused(false)}
                placeholder="e.g. cool_lifter_99"
                placeholderTextColor="#939394"
              />
            </View>
          </View>

          {/* Full name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/profile.png')} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: inputColor(fullNameFocused) }]}
                value={fullName}
                onChangeText={(t) => { setSaved(false); setFullName(t); }}
                onFocus={() => { setSaved(false); setFullNameFocused(true); }}
                onBlur={() => setFullNameFocused(false)}
                placeholder="e.g. Juan dela Cruz"
                placeholderTextColor="#939394"
              />
            </View>
          </View>

          {/* Age */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => {
                setSaved(false);
                setTempDate(birthDate ?? new Date());
                setShowDatePicker(true);
              }}
              activeOpacity={0.8}
            >
              <Image source={require('../assets/calendar_age.png')} style={styles.inputIcon} />
              <Text
                style={[
                  styles.input,
                  styles.inputTouchable,
                  { color: saved ? '#939394' : age ? '#FFFFFF' : '#939394' },
                ]}
              >
                {age
                  ? `${age} yrs old${birthDate
                      ? `  ·  ${birthDate.toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}`
                      : ''}`
                  : 'Tap to pick your birthday'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight & Height */}
          <View style={styles.rowContainer}>
            <View style={[styles.halfFieldGroup, { marginRight: 12 }]}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.inputContainer}>
                <Image source={require('../assets/weight.png')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputColor(weightFocused) }]}
                  value={weight}
                  onChangeText={(t) => { setSaved(false); setWeight(t.replace(/[^0-9]/g, '')); }}
                  onFocus={() => { setSaved(false); setWeightFocused(true); }}
                  onBlur={() => setWeightFocused(false)}
                  placeholder="kg"
                  placeholderTextColor="#939394"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.halfFieldGroup}>
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputContainer}>
                <Image source={require('../assets/height.png')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputColor(heightFocused) }]}
                  value={height}
                  onChangeText={(t) => { setSaved(false); setHeight(t.replace(/[^0-9]/g, '')); }}
                  onFocus={() => { setSaved(false); setHeightFocused(true); }}
                  onBlur={() => setHeightFocused(false)}
                  placeholder="cm"
                  placeholderTextColor="#939394"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.discardButton} onPress={() => navigation.goBack()}>
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              setSaved(true);
              console.log('Saved:', { username, fullName, age, weight, height });
            }}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Android date picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Birthday</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
                style={{ backgroundColor: '#1a1a1a' }}
                textColor="#FFFFFF"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121310',
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 18,
    paddingHorizontal: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontFamily: 'Montserrat_900Black',
    marginTop: 11,
    marginLeft: 50,
  },
  headerPlaceholder: {
    width: 44,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 28,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#1e2e22',
    resizeMode: 'cover',
  },
  changePictureText: {
    color: '#3B82F6',
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  formContainer: {
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22221D',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    padding: 0,
  },
  inputTouchable: {
    paddingVertical: 14,
  },
  rowContainer: {
    flexDirection: 'row',
  },
  halfFieldGroup: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    backgroundColor: '#22221D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#ccff00',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  modalDone: {
    color: '#ccff00',
    fontSize: 16,
    fontFamily: 'Montserrat_800ExtraBold',
  },
});