import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, TextInput, Modal, Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { MediaType } from 'expo-image-picker';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
  PersonalInformation: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'PersonalInformation'>;

export default function PersonalInformation({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [weightUnit, setWeightUnit] = useState('KG');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [validationError, setValidationError] = useState('');

  const [originalData, setOriginalData] = useState({
    username: '',
    age: '',
    weight: '',
    height: '',
    avatarUri: null as string | null,
  });

  const [toast, setToast] = useState<{ message: string; type: 'saved' | 'discarded' } | null>(null);

  const showToast = (message: string, type: 'saved' | 'discarded') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);
  const [heightFocused, setHeightFocused] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('Not logged in');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, age, weight, height, avatar_url, weight_unit, height_unit')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const fetchedData = {
        username: profile.username ?? '',
        age: profile.age ? String(profile.age) : '',
        weight: profile.weight ? String(profile.weight) : '',
        height: profile.height ? String(profile.height) : '',
        avatarUri: profile.avatar_url ?? null,
      };

      setUsername(fetchedData.username);
      setAge(fetchedData.age);
      setWeight(fetchedData.weight);
      setHeight(fetchedData.height);
      setAvatarUri(fetchedData.avatarUri);
      setAvatarUrl(fetchedData.avatarUri);
      setOriginalData(fetchedData);
      setFullName(user.email ?? '');
      setWeightUnit(profile.weight_unit ?? 'KG');
      setHeightUnit(profile.height_unit ?? 'cm');
    } catch (err) {
      console.error('fetchUserData error:', err);
    }
  };

  const handleDiscard = () => {
    setUsername(originalData.username);
    setAge(originalData.age);
    setWeight(originalData.weight);
    setHeight(originalData.height);
    setAvatarUri(originalData.avatarUri);
    setSaved(false);
    setValidationError('');
    showToast('Changes discarded', 'discarded');
  };

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
        setValidationError('');
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const handleIOSConfirm = () => {
    setBirthDate(tempDate);
    setAge(String(calculateAge(tempDate)));
    setSaved(false);
    setValidationError('');
    setShowDatePicker(false);
  };

  const handleChangePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!username.trim() || !age || !weight || !height) {
      setValidationError('All fields are required.');
      return;
    }
    if (parseInt(age) === 0) {
      setValidationError('Age cannot be 0.');
      return;
    }
    setValidationError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let uploadedAvatarUrl: string | null = avatarUri;

      if (avatarUri && !avatarUri.startsWith('http')) {
        const ext = avatarUri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const fileName = `${user.id}/avatar.${ext}`;

        const base64 = await FileSystem.readAsStringAsync(avatarUri, {
          encoding: 'base64' as any,
        });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(base64), {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        // Add cache-busting query parameter to force image refresh
        uploadedAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        setAvatarUri(uploadedAvatarUrl);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          age: age ? parseInt(age) : null,
          weight: weight ? parseInt(weight) : null,
          height: height ? parseInt(height) : null,
          avatar_url: uploadedAvatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalData({
        username,
        age,
        weight,
        height,
        avatarUri: uploadedAvatarUrl,
      });

      setAvatarUri(uploadedAvatarUrl);
      setAvatarUrl(uploadedAvatarUrl);
      setSaved(true);
      showToast('Changes saved', 'saved');
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  return (
    <View style={styles.safeArea}>

      {/* ── Toast ── */}
      {toast && (
        <View style={[
          styles.toast,
          toast.type === 'saved' ? styles.toastSaved : styles.toastDiscarded
        ]}>
          <Text style={[
            styles.toastText,
            { color: toast.type === 'saved' ? '#000000' : '#FFFFFF' }
          ]}>
            {toast.message}
          </Text>
        </View>
      )}

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
              source={avatarUri ? { uri: avatarUri } : require('../assets/user.png')}
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
                onChangeText={(t) => { setSaved(false); setUsername(t); setValidationError(''); }}
                onFocus={() => { setSaved(false); setUsernameFocused(true); }}
                onBlur={() => setUsernameFocused(false)}
                placeholder="e.g. cool_lifter_99"
                placeholderTextColor="#939394"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/profile.png')} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#939394' }]}
                value={fullName}
                editable={false}
                placeholder="your@email.com"
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
                setValidationError('');
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
                {age ? `${age}` : 'Tap to set your age'}
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
                  onChangeText={(t) => { setSaved(false); setWeight(t.replace(/[^0-9]/g, '')); setValidationError(''); }}
                  onFocus={() => { setSaved(false); setWeightFocused(true); }}
                  onBlur={() => setWeightFocused(false)}
                  placeholderTextColor="#939394"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.unitLabel}>{weightUnit}</Text>
              </View>
            </View>

            <View style={styles.halfFieldGroup}>
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputContainer}>
                <Image source={require('../assets/height.png')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputColor(heightFocused) }]}
                  value={height}
                  onChangeText={(t) => { setSaved(false); setHeight(t.replace(/[^0-9]/g, '')); setValidationError(''); }}
                  onFocus={() => { setSaved(false); setHeightFocused(true); }}
                  onBlur={() => setHeightFocused(false)}
                  placeholderTextColor="#939394"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.unitLabel}>{heightUnit}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Validation Error */}
        {validationError ? (
          <Text style={styles.validationError}>{validationError}</Text>
        ) : null}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
    elevation: 999,
  },
  toastSaved: {
    backgroundColor: '#ccff00',
  },
  toastDiscarded: {
    backgroundColor: '#334155',
  },
  toastText: {
    fontSize: 13,
    fontFamily: 'Montserrat_800ExtraBold',
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
  unitLabel: {
    color: '#939394',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    marginLeft: 4,
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
  validationError: {
    color: '#FF4D4D',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
    marginBottom: 12,
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