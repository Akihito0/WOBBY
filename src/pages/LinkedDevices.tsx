import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import AddDeviceModal from '../components/AddDeviceModal';

type YouStackParamList = {
  YouMain: undefined;
  YouSettings: undefined;
  LinkedDevices: undefined;
};

type Props = NativeStackScreenProps<YouStackParamList, 'LinkedDevices'>;

interface Device {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  lastSync: string;
  isConnected: boolean;
}

export default function LinkedDevices({ navigation }: Props) {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Apple Watch SE 3',
      icon: 'watch',
      lastSync: '10:28 am',
      isConnected: true,
    },
  ]);
  const [modalVisible, setModalVisible] = useState(false);

  const handleAddDevice = () => setModalVisible(true);

  const handlePairDevice = (device: Omit<Device, 'lastSync' | 'isConnected'>) => {
    const newDevice: Device = { ...device, lastSync: 'now', isConnected: true };
    setDevices([...devices, newDevice]);
  };

  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(device => device.id !== id));
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
          <Text style={styles.headerTitle}>LINKED DEVICES</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {devices.length > 0 ? (
          <View style={styles.devicesContainer}>
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                {/* Watch icon box */}
                <View style={styles.deviceIconBox}>
                  <Ionicons name={device.icon} size={32} color="#FFFFFF" />
                </View>

                {/* Device info */}
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.lastSyncText}>Last sync: {device.lastSync}</Text>
                </View>

                {/* Status dot */}
                <View
                  style={[
                    styles.statusDot,
                    device.isConnected ? styles.statusDotConnected : styles.statusDotDisconnected,
                  ]}
                />

                {/* Remove button */}
                {device.isConnected && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveDevice(device.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="watch-outline" size={64} color="#4B5563" />
            <Text style={styles.emptyStateText}>No devices connected</Text>
            <Text style={styles.emptyStateSubtext}>Connect your devices to sync activity</Text>
          </View>
        )}

        {/* Add device button */}
        <View style={styles.addButtonWrapper}>
          <TouchableOpacity style={styles.addDeviceButton} onPress={handleAddDevice}>
            <Text style={styles.addButtonPlus}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddDeviceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPairDevice={handlePairDevice}
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
  devicesContainer: {
    marginBottom: 24,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22221D',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  deviceIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#34342B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastSyncText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusDotConnected: {
    backgroundColor: '#22c55e',
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 6,
  },
  addButtonWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  addDeviceButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ccff00',
    opacity: 0.95,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addButtonPlus: {
    color: '#000000',
    fontSize: 28,
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 32,
  },
});