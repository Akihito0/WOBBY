import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
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

  const handleAddDevice = () => {
    setModalVisible(true);
  };

  const handlePairDevice = (device: Omit<Device, 'lastSync' | 'isConnected'>) => {
    const newDevice: Device = {
      ...device,
      lastSync: 'now',
      isConnected: true,
    };
    setDevices([...devices, newDevice]);
  };

  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(device => device.id !== id));
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
          <Text style={styles.headerTitle}>Linked Devices</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {devices.length > 0 ? (
          <View style={styles.devicesContainer}>
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceCardWrapper}>
                <View style={styles.deviceCard}>
                  <View style={styles.deviceIconContainer}>
                    <View style={styles.deviceIconBox}>
                      <Ionicons name={device.icon} size={32} color="#FFFFFF" />
                    </View>
                  </View>

                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.lastSyncText}>Last sync: {device.lastSync}</Text>
                  </View>

                  <View style={styles.statusIndicator}>
                    <View
                      style={[
                        styles.statusDot,
                        device.isConnected && styles.statusDotConnected,
                      ]}
                    />
                  </View>

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
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="watch-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyStateText}>No devices connected</Text>
            <Text style={styles.emptyStateSubtext}>Connect your devices to sync activity</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addDeviceButton} onPress={handleAddDevice}>
          <View style={styles.addButtonContent}>
            <Ionicons name="add" size={28} color="#F8FAFC" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <AddDeviceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPairDevice={handlePairDevice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1118',
  },
  headerGradient: {
    width: '100%',
    backgroundColor: '#000',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#151828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  headerPlaceholder: {
    width: 44,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    paddingTop: 28,
  },
  devicesContainer: {
    marginBottom: 32,
  },
  deviceCardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(21, 24, 40, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceIconContainer: {
    marginRight: 16,
  },
  deviceIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastSyncText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  statusIndicator: {
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  addDeviceButton: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
  },
  addButtonContent: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
});