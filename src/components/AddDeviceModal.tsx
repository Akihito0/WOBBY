import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

    // Simulate device discovery
    useEffect(() => {
        if (visible && modalState === 'searching') {
            const timer = setTimeout(() => {
                setDiscoveredDevices([
                    { id: '2', name: 'Realme Watch S', icon: 'watch' },
                    { id: '3', name: 'Fitbit Charge 5', icon: 'watch' },
                    { id: '4', name: 'Apple Watch Ultra', icon: 'watch' },
                    { id: '5', name: 'Garmin Venu', icon: 'watch' },
                ]);
                setModalState('found');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible, modalState]);

    const handleClose = () => {
        setModalState('searching');
        setDiscoveredDevices([]);
        onClose();
    };

    const handlePair = (device: DiscoveredDevice) => {
        onPairDevice(device);
        handleClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add New Device</Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={24} color="#94A3B8" />
                        </TouchableOpacity>
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
                                    <Ionicons name="search" size={40} color="#3B82F6" />
                                </View>
                            </View>
                            <Text style={styles.searchingText}>Searching for devices...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.devicesListContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {discoveredDevices.length > 0 ? (
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
                </View>
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
        backgroundColor: '#151828',
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitle: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700',
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
        borderColor: '#3B82F6',
    },
    searchIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#3B82F6',
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
        backgroundColor: '#1F2937',
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    deviceName: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    pairButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    pairButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
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
    retryButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
