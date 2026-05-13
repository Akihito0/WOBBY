import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import SignOutModal from '../components/SignOutModal';
import NotificationsScreen from './NotificationsScreen';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
  NotificationsScreen: undefined;
  PersonalInformation: undefined;
  LinkedDevices: undefined;
  AboutUs: undefined;
  HelpCenter: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'YouSettings'>;

export default function YouSettings({ navigation }: Props) {
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const handleConfirmSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', 'Failed to sign out: ' + error.message);
      }
      setSignOutModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred during sign out.');
      setSignOutModalVisible(false);
    }
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
          <Text style={styles.headerTitle}>ACCOUNT SETTINGS</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

<TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('NotificationsScreen')}
          >
            <View style={styles.iconBox}>
              <Image source={require('../assets/notif_bell.png')} style={styles.icon} />
            </View>
            <Text style={styles.settingLabel}>Notifications</Text> 
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('PersonalInformation')}
          >
            <View style={styles.iconBox}>
              <Image source={require('../assets/profile.png')} style={styles.icon} />
            </View>
            <Text style={styles.settingLabel}>Personal information</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('LinkedDevices')}
          >
            <View style={styles.iconBox}>
              <Image source={require('../assets/link.png')} style={styles.icon} />
            </View>
            <Text style={styles.settingLabel}>Linked devices</Text>
          </TouchableOpacity>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('AboutUs')}
          >
            <View style={styles.iconBox}>
              <Image source={require('../assets/about.png')} style={styles.icon} />
            </View>
            <Text style={styles.settingLabel}>About us</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.iconBox}>
              <Image source={require('../assets/help.png')} style={styles.icon} />
            </View>
            <Text style={styles.settingLabel}>Help center</Text>
          </TouchableOpacity>
        </View>

        {/* Log Out Section */}
        <View style={styles.logOutSection}>
          <Text style={styles.sectionTitle}>Log Out</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <View style={styles.signOutIconBox}>
              <Image source={require('../assets/sign_out.png')} style={styles.icon} />
            </View>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SignOutModal
        visible={signOutModalVisible}
        onCancel={() => setSignOutModalVisible(false)}
        onConfirm={handleConfirmSignOut}
      />
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
    height: 117,
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
    marginTop: 30,
    marginLeft: 70,
  },
  headerPlaceholder: {
    width: 44,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 28,
  },
  section: {
    marginBottom: 35,
  },
  logOutSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: "Montserrat_800ExtraBold",
    marginBottom: 14,
    fontSize: 18,
  },
  settingItem: {
    backgroundColor: '#22221D',
    borderRadius: 15,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: '#34342B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    flex: 1,
    marginLeft: 10,
  },
  signOutButton: {
    backgroundColor: '#3d1212',
    borderRadius: 15,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: '#5a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  signOutText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    flex: 1,
    marginLeft: 10,
  },
});