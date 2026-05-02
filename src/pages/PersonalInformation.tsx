import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const handleSave = () => {
    console.log('Saving profile...');
    navigation.goBack();
  };

  const handleDiscard = () => {
    navigation.goBack();
  };

  const handleChangePicture = () => {
    console.log('Change picture tapped');
  };

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={['#001E20', '#000000']}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.headerContent}
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
            <Image source={require('../assets/5.png')} style={styles.avatar} />
          </View>
          <TouchableOpacity onPress={handleChangePicture}>
            <Text style={styles.changePictureText}>Change Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/username.png')} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#4B5563"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/profile.png')} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#4B5563"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Age</Text>
            <View style={styles.inputContainer}>
              <Image source={require('../assets/calendar_age.png')} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="-"
                placeholderTextColor="#4B5563"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.halfFieldGroup, { marginRight: 12 }]}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.inputContainer}>
                <Image source={require('../assets/weight.png')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="kg"
                  placeholderTextColor="#4B5563"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.halfFieldGroup}>
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputContainer}>
                <Image source={require('../assets/height.png')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="cm"
                  placeholderTextColor="#4B5563"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        </View>

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
    width: '100%',
    height: 100,
    paddingBottom: 18,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
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
    marginLeft: -15,
    marginTop: 70, 
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontFamily: "Montserrat_900Black",
    marginTop: 0,
    marginLeft: 85,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
    color: '#939394',
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    padding: 0,
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
});