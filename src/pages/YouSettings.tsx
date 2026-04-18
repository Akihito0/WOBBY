import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
  PersonalInformation: undefined;
  LinkedDevices: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'YouSettings'>;

export default function YouSettings({ navigation }: Props) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = () => {
    console.log('Sign out tapped');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#001E20', '#000000']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ACCOUNT SETTINGS</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.iconBox}>
              <Ionicons name="notifications" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.settingLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('PersonalInformation')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="person-circle" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.settingLabel}>Personal information</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('LinkedDevices')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="link" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.settingLabel}>Linked devices</Text>
          </TouchableOpacity>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.iconBox}>
              <Ionicons name="information-circle" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.settingLabel}>About us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.iconBox}>
              <Ionicons name="help-circle" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.settingLabel}>Help center</Text>
          </TouchableOpacity>
        </View>

        {/* Log Out Section */}
        <View style={styles.logOutSection}>
          <Text style={styles.sectionTitle}>Log Out</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <View style={styles.iconBox}>
              <Ionicons name="power" size={20} color="#F8FAFC" />
            </View>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0f0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerGradient: {
    width: '100%',
    backgroundColor: '#000',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 44,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  logOutSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#1a2e1f',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    backgroundColor: '#6B2C2C',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 14,
  },
});