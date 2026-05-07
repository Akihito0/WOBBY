import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BleManager, Device } from 'react-native-ble-plx';
import { LinearGradient } from 'expo-linear-gradient';

import { requestPermissions } from '../../modules/wobby-health';

interface DiscoveredDevice {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
}

interface AddDeviceModalProps {
    visible: boolean;
    onClose: () => void;
    onPairDevice: (device: DiscoveredDevice) => void;
}

export default function AddDeviceModal({
    visible,
    onClose,
    onPairDevice,
}: AddDeviceModalProps) {
    const [modalState, setModalState] = useState<'searching' | 'found'>('searching');
    const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
    const [ripple1Value] = useState(new Animated.Value(0));
    const [ripple2Value] = useState(new Animated.Value(0));
    const [ripple3Value] = useState(new Animated.Value(0));
    const [error, setError] = useState<string | null>(null);
    
    const bleManager = useMemo(() => {
        try {
            return new BleManager();
        } catch (err) {
            console.warn('BleManager initialization failed:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (bleManager) {
                bleManager.destroy();
            }
        };
    }, [bleManager]);

    // Animate ripples
    useEffect(() => {
        if (visible && modalState === 'searching') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(ripple1Value, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(ripple1Value, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            ).start();

            const timer2 = setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(ripple2Value, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
                        Animated.timing(ripple2Value, { toValue: 0, duration: 0, useNativeDriver: true }),
                    ])
                ).start();
            }, 500);

            const timer3 = setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(ripple3Value, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
                        Animated.timing(ripple3Value, { toValue: 0, duration: 0, useNativeDriver: true }),
                    ])
                ).start();
            }, 1000);

            return () => {
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [visible, modalState, ripple1Value, ripple2Value, ripple3Value]);

    useEffect(() => {
        if (visible && modalState === 'searching') {
            searchForDevices();
        }
    }, [visible, modalState]);

    const searchForDevices = async () => {
        try {
            setError(null);

            // 👇 PATH B: Android Health Connect Route 👇
            if (Platform.OS === 'android') {
                // Skip Bluetooth permissions completely. 
                // Show the searching animation for 2.5 seconds, then display Health Connect.
                setTimeout(() => {
                    setDiscoveredDevices([
                        { id: 'health-connect', name: 'Android Health Connect', icon: 'fitness' }
                    ]);
                    setModalState('found');
                }, 2500);
                return; // Exit early so Android doesn't run iOS BLE code
            }

            // 👇 PATH B: iOS Route 👇
            if (!bleManager) {
                console.log('BleManager not available, falling back to Apple Watch');
                setTimeout(() => {
                    setDiscoveredDevices([
                        { id: 'apple-watch', name: 'Apple Watch', icon: 'watch' },
                    ]);
                    setModalState('found');
                }, 2500);
                return;
            }

            const deviceMap = new Map<string, DiscoveredDevice>();

            bleManager.startDeviceScan(null, null, (error: any, device: Device | null) => {
                if (error) {
                    console.error('Scan error:', error);
                    return;
                }

                if (device && device.name) {
                    const deviceName = device.name.toLowerCase();
                    let icon: keyof typeof Ionicons.glyphMap = 'bluetooth';
                    let displayName = device.name;

                    if (deviceName.includes('apple watch') || deviceName.includes('watch')) {
                        icon = 'watch';
                    } else if (deviceName.includes('airpods') || deviceName.includes('beats')) {
                        icon = 'headset';
                    } else if (deviceName.includes('fitbit') || deviceName.includes('garmin') || deviceName.includes('polar') || deviceName.includes('whoop')) {
                        icon = 'fitness';
                    }

                    if (!deviceMap.has(device.id)) {
                        const discoveredDevice: DiscoveredDevice = {
                            id: device.id,
                            name: displayName,
                            icon,
                        };
                        deviceMap.set(device.id, discoveredDevice);
                    }
                }
            });

            setTimeout(() => {
                bleManager.stopDeviceScan();
                const devices = Array.from(deviceMap.values());

                if (devices.length === 0) {
                    // Fallback just in case nothing is found on iOS
                    setDiscoveredDevices([{ id: 'apple-watch', name: 'Apple Watch', icon: 'watch' }]);
                } else {
                    setDiscoveredDevices(devices);
                }
                setModalState('found');
            }, 3000);
        } catch (err) {
            console.error('Error searching for devices:', err);
            setError('Failed to search for devices. Please try again.');
            setModalState('found');
        }
    };

    const handleClose = () => {
        if (bleManager) {
            bleManager.stopDeviceScan();
        }
        setModalState('searching');
        setDiscoveredDevices([]);
        setError(null);
        onClose();
    };

    const handlePair = async (device: DiscoveredDevice) => {
        try {
            if (bleManager) {
                bleManager.stopDeviceScan();
            }

            // 👇 Handle Android Health Connect Pairing 👇
            if (device.id === 'health-connect') {
                try {
                    console.log("Triggering Health Connect Bridge...");
                    const success = await requestPermissions();
                    if (success) {
                        onPairDevice(device);
                        handleClose();
                    } else {
                         setError('Failed to initialize Health Connect. Ensure it is installed.');
                    }
                } catch (error) {
                    console.log('[ERROR] Cannot trigger Health Connect via custom module!', error);
                    setError('Failed to connect to Health Connect.');
                }
                return;
            }

            // 👇 Handle Apple Watch Pairing 👇
            if (device.id === 'apple-watch' || device.name.toLowerCase().includes('apple watch') || device.name.toLowerCase().includes('watch')) {
                try {
                    const success = await requestPermissions();
                    if (success) {
                        onPairDevice(device);
                        handleClose();
                    } else {
                         setError('Failed to connect Apple Watch. Please check HealthKit permissions in Settings.');
                    }
                } catch (error) {
                    console.log('[ERROR] Cannot grant HealthKit permissions via custom module!', error);
                    setError('Failed to connect Apple Watch. HealthKit might not be available.');
                }
            } else if (bleManager) {
                try {
                    const peripheralDevice = await bleManager.connectToDevice(device.id);
                    await peripheralDevice.discoverAllServicesAndCharacteristics();
                    console.log(`Successfully paired with ${device.name}`);
                    onPairDevice(device);
                    handleClose();
                } catch (err) {
                    console.error('BLE pairing error:', err);
                    setError(`Failed to connect to ${device.name}. Please try again.`);
                }
            } else {
                onPairDevice(device);
                handleClose();
            }
        } catch (err) {
            console.error('Error pairing device:', err);
            setError('Failed to pair device');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <LinearGradient
                        colors={['#393939', '#000000']}
                        start={{ x: 0.3, y: 1 }}
                        end={{ x: 0.3, y: 0.5 }}
                        style={styles.container}
                      >
                    <View style={styles.header}>
                        <TouchableOpacity
                                onPress={handleClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Image
                                    source={require('../assets/X.png')}
                                    style={styles.closeIcon}
                                />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Add New Device</Text>
                    </View>
                    
                    {modalState === 'searching' ? (
                        <View style={styles.searchingContainer}>
                            <View style={styles.centerContainer}>
                                <Animated.View style={[styles.ripple, { opacity: ripple1Value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: ripple1Value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }]} />
                                <Animated.View style={[styles.ripple, { opacity: ripple2Value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: ripple2Value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }]} />
                                <Animated.View style={[styles.ripple, { opacity: ripple3Value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: ripple3Value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }]} />
                                <View style={styles.searchIconContainer}>
                                    <Ionicons name="search" size={40} color="#7A9900" />
                                </View>
                            </View>
                            <Text style={styles.searchingText}>Searching for devices...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.devicesListContent} showsVerticalScrollIndicator={false}>
                            {error ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => {
                                            setModalState('searching');
                                            setDiscoveredDevices([]);
                                            setError(null);
                                        }}
                                    >
                                        <Text style={styles.retryButtonText}>Try Again</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : discoveredDevices.length > 0 ? (
                                discoveredDevices.map((device) => (
                                    <View key={device.id} style={styles.deviceItemWrapper}>
                                        <View style={styles.deviceItem}>
                                            <View style={styles.deviceIconBox}>
                                                <Ionicons name={device.icon} size={32} color="#FFFFFF" />
                                            </View>
                                            <Text style={styles.deviceName}>{device.name}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.pairButton}
                                            onPress={() => handlePair(device)}
                                        >
                                            <Text style={styles.pairButtonText}>Pair</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No devices found</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => {
                                            setModalState('searching');
                                            setDiscoveredDevices([]);
                                        }}
                                    >
                                        <Text style={styles.retryButtonText}>Try Again</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxHeight: '70%',
        borderRadius: 30,
        overflow: 'hidden',
        borderColor: '#7A9900',
        borderWidth: 1,
    },
    header: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitle: {
        color: '#F8FAFC',
        fontSize: 21,
        fontFamily: 'Montserrat_800ExtraBold',
        alignItems: 'center',
    },
    closeIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        marginLeft: 250,
        marginTop: 5,
    },
    searchingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    centerContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    ripple: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#7A9900',
    },
    searchIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#7A9900',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    searchingText: {
        color: '#94A3B8',
        fontSize: 14,
        marginTop: 12,
    },
    devicesListContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    deviceItemWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#22221D',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        minHeight: 72,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#34342B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    deviceName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    pairButton: {
        backgroundColor: '#ccff00',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
        opacity: 0.7,
    },
    pairButtonText: {
        color: '#000000',
        fontSize: 13,
        fontFamily: 'Montserrat_600SemiBold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        color: '#94A3B8',
        fontSize: 14,
        marginBottom: 16,
    },
    errorText: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#ccff00',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
        opacity: 0.7,
    },
    retryButtonText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '600',
    },
});