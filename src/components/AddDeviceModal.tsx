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
    PermissionsAndroid,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppleHealthKit from 'react-native-health';
import { BleManager, Device } from 'react-native-ble-plx';
import { LinearGradient } from 'expo-linear-gradient'; // <-- Add this new line


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

    // Cleanup BleManager on unmount
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
            // Ripple 1
            Animated.loop(
                Animated.sequence([
                    Animated.timing(ripple1Value, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ripple1Value, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Ripple 2 - delayed start
            const timer2 = setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(ripple2Value, {
                            toValue: 1,
                            duration: 1500,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        }),
                        Animated.timing(ripple2Value, {
                            toValue: 0,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 500);

            // Ripple 3 - more delayed start
            const timer3 = setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(ripple3Value, {
                            toValue: 1,
                            duration: 1500,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        }),
                        Animated.timing(ripple3Value, {
                            toValue: 0,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 1000);

            return () => {
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [visible, modalState, ripple1Value, ripple2Value, ripple3Value]);

    // Search for available devices
    useEffect(() => {
        if (visible && modalState === 'searching') {
            searchForDevices();
        }
    }, [visible, modalState]);

    const searchForDevices = async () => {
        try {
            setError(null);
            const discoveredDevicesList: DiscoveredDevice[] = [];
            const deviceMap = new Map<string, DiscoveredDevice>();

            // Check platform
            if (Platform.OS === 'android') {
                // Request Bluetooth permissions on Android
                try {
                    const permissions = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    ]);

                    if (
                        permissions[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !==
                        PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        setError('Bluetooth permissions required');
                        setModalState('found');
                        return;
                    }
                } catch (err) {
                    console.error('Permission error:', err);
                    setError('Failed to request Bluetooth permissions');
                    setModalState('found');
                    return;
                }
            }

            // If BleManager is not available, fall back to showing Apple Watch only
            if (!bleManager) {
                console.log('BleManager not available, falling back to Apple Watch');
                setDiscoveredDevices([
                    { id: 'apple-watch', name: 'Apple Watch', icon: 'watch' },
                ]);
                setModalState('found');
                return;
            }

            // Start BLE scan
            bleManager.startDeviceScan(null, null, (error: any, device: Device | null) => {
                if (error) {
                    console.error('Scan error:', error);
                    return;
                }

                if (device && device.name) {
                    const deviceName = device.name.toLowerCase();
                    let icon: keyof typeof Ionicons.glyphMap = 'bluetooth';
                    let displayName = device.name;

                    // Identify device type based on name patterns
                    if (
                        deviceName.includes('apple watch') ||
                        deviceName.includes('watch')
                    ) {
                        icon = 'watch';
                        displayName = device.name;
                    } else if (
                        deviceName.includes('airpods') ||
                        deviceName.includes('beats')
                    ) {
                        icon = 'headset';
                        displayName = device.name;
                    } else if (
                        deviceName.includes('fitbit') ||
                        deviceName.includes('garmin') ||
                        deviceName.includes('polar') ||
                        deviceName.includes('whoop')
                    ) {
                        icon = 'fitness';
                        displayName = device.name;
                    }

                    // Avoid duplicates
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

            // Scan for 3 seconds
            setTimeout(() => {
                bleManager.stopDeviceScan();

                const devices = Array.from(deviceMap.values());

                if (devices.length === 0) {
                    setError('No devices found. Make sure your devices are nearby, turned on, and Bluetooth is enabled.');
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

            // Check if it's an Apple Watch
            if (device.name.toLowerCase().includes('apple watch') || device.name.toLowerCase().includes('watch')) {
                // Use HealthKit for Apple Watch
                if (!AppleHealthKit || !AppleHealthKit.initHealthKit) {
                    setError('HealthKit is not available on this device');
                    return;
                }

                const permissions = {
                    permissions: {
                        read: [
                            AppleHealthKit.Constants.Permissions.HeartRate,
                            AppleHealthKit.Constants.Permissions.StepCount,
                            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
                        ],
                        write: [AppleHealthKit.Constants.Permissions.ActiveEnergyBurned],
                    },
                } as any;

                AppleHealthKit.initHealthKit(permissions, (error: string) => {
                    if (error) {
                        console.log('[ERROR] Cannot grant HealthKit permissions!', error);
                        setError('Failed to connect Apple Watch. Please check HealthKit permissions in Settings.');
                        return;
                    }

                    // Successfully paired
                    onPairDevice(device);
                    handleClose();
                });
            } else if (bleManager) {
                // Handle other BLE devices
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
                // BleManager not available
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
                    {/* Header */}
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
                    

                    {/* Content */}
                    {modalState === 'searching' ? (
                        <View style={styles.searchingContainer}>
                            <View style={styles.centerContainer}>
                                {/* Ripple 1 */}
                                <Animated.View
                                    style={[
                                        styles.ripple,
                                        {
                                            opacity: ripple1Value.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 0],
                                            }),
                                            transform: [
                                                {
                                                    scale: ripple1Value.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.6, 1.6],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />

                                {/* Ripple 2 */}
                                <Animated.View
                                    style={[
                                        styles.ripple,
                                        {
                                            opacity: ripple2Value.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 0],
                                            }),
                                            transform: [
                                                {
                                                    scale: ripple2Value.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.6, 1.6],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />

                                {/* Ripple 3 */}
                                <Animated.View
                                    style={[
                                        styles.ripple,
                                        {
                                            opacity: ripple3Value.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 0],
                                            }),
                                            transform: [
                                                {
                                                    scale: ripple3Value.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.6, 1.6],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />

                                {/* Center search icon */}
                                <View style={styles.searchIconContainer}>
                                    <Ionicons name="search" size={40} color="#7A9900" />
                                </View>
                            </View>
                            <Text style={styles.searchingText}>Searching for devices...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.devicesListContent}
                            showsVerticalScrollIndicator={false}
                        >
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
        //flexDirection: 'row',
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
