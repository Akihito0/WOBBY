import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👇 Added Async Storage
import AddDeviceModal from '../components/AddDeviceModal';
import { useHealth } from '../context/HealthContext';

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
  heartRate?: number | null;
}

const STORAGE_KEY = '@wobby_linked_devices'; // 🔑 Our permanent save file name

export default function LinkedDevices({ navigation }: Props) {
  const { heartRate, isAuthorized, refreshHeartRate } = useHealth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 👇 1. Load saved devices from the phone's hard drive when the screen opens
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const storedDevices = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedDevices) {
          setDevices(JSON.parse(storedDevices));
        }
      } catch (error) {
        console.error('Failed to load devices from storage', error);
      }
    };
    loadDevices();
  }, []);

  // 👇 2. Auto-add the platform health device once authorized, and keep its live data fresh
  useEffect(() => {
    setDevices(currentDevices => {
      const platformDeviceId = Platform.OS === 'ios' ? 'apple-watch' : 'health-connect';
      const platformDeviceName = Platform.OS === 'ios' ? 'Apple Watch' : 'Android Health Connect';
      const platformDeviceIcon: keyof typeof Ionicons.glyphMap = Platform.OS === 'ios' ? 'watch' : 'fitness';

      const hasPlatformDevice = currentDevices.some(d => d.id === platformDeviceId);

      let nextDevices = currentDevices.map(device => {
        if (device.id === 'apple-watch' || device.id === 'health-connect') {
          return {
            ...device,
            isConnected: isAuthorized,
            heartRate: heartRate,
            lastSync: heartRate ? 'Just now' : device.lastSync,
          };
        }
        return device;
      });

      if (isAuthorized && !hasPlatformDevice) {
        nextDevices = [
          ...nextDevices,
          {
            id: platformDeviceId,
            name: platformDeviceName,
            icon: platformDeviceIcon,
            lastSync: heartRate ? 'Just now' : 'Just connected',
            isConnected: true,
            heartRate: heartRate,
          },
        ];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextDevices)).catch(error =>
          console.error('Failed to persist auto-added device', error)
        );
      }

      return nextDevices;
    });
  }, [isAuthorized, heartRate]);

  const handleAddDevice = () => setModalVisible(true);

  // 👇 3. Save to hard drive when pairing a new device
  const handlePairDevice = async (device: Omit<Device, 'lastSync' | 'isConnected' | 'heartRate'>) => {
    const newDevice: Device = {
      ...device,
      lastSync: 'Just connected',
      isConnected: true,
      heartRate: null,
    };

    // Filter out duplicates just in case, then add the new device
    const updatedDevices = [...devices.filter(d => d.id !== device.id), newDevice];
    
    setDevices(updatedDevices);
    setModalVisible(false);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDevices));
    } catch (error) {
      console.error('Failed to save device to storage', error);
    }
  };

  // 👇 4. Remove from hard drive when deleting a device
  const handleRemoveDevice = async (id: string) => {
    const updatedDevices = devices.filter(device => device.id !== id);
    setDevices(updatedDevices);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDevices));
    } catch (error) {
      console.error('Failed to remove device from storage', error);
    }
  };

  const handleRefreshAppleWatch = async () => {
    setIsRefreshing(true);
    try {
      refreshHeartRate();
      // Give it a moment to fetch
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnectAppleWatch = async () => {
    handleRefreshAppleWatch();
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
              <View key={device.id} style={styles.deviceCardWrapper}>
                <LinearGradient
                  colors={
                    device.isConnected
                      ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']
                      : ['rgba(21, 24, 40, 0.4)', 'rgba(21, 24, 40, 0.4)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.deviceCard}
                >
                  <View style={styles.deviceIconContainer}>
                    <View style={[styles.deviceIconBox, device.isConnected && styles.deviceIconBoxConnected]}>
                      <Ionicons name={device.icon} size={32} color="#FFFFFF" />
                    </View>
                  </View>

                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    {device.isConnected && device.heartRate ? (
                      <View style={styles.heartRateRow}>
                        <Ionicons name="heart" size={14} color="#FF4444" />
                        <Text style={styles.heartRateText}>{device.heartRate} BPM</Text>
                        <Text style={styles.lastSyncText}>• {device.lastSync}</Text>
                      </View>
                    ) : (
                      <Text style={styles.lastSyncText}>{device.lastSync}</Text>
                    )}
                  </View>

                  <View style={styles.statusIndicator}>
                    <View
                      style={[
                        styles.statusDot,
                        device.isConnected && styles.statusDotConnected,
                      ]}
                    />
                  </View>

                  {device.isConnected ? (
                    <>
                      <TouchableOpacity
                        style={styles.syncButton}
                        onPress={handleRefreshAppleWatch}
                        disabled={isRefreshing}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {isRefreshing ? (
                          <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                          <Ionicons name="refresh" size={20} color="#10B981" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveDevice(device.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={handleConnectAppleWatch}
                      disabled={isRefreshing}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {isRefreshing ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Ionicons name="link" size={20} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  )}
                </LinearGradient>
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
    marginLeft: 115,
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
  deviceCardWrapper: {
    width: '100%',
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
  deviceIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  deviceIconBoxConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
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
  heartRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartRateText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  lastSyncText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  statusIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
  syncButton: {
    padding: 8,
    marginRight: 8,
  },
  connectButton: {
    padding: 8,
    marginRight: 8,
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