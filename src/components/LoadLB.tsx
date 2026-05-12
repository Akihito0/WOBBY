import React from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

interface LoadLBProps {
    visible: boolean;
}

const LoadLB: React.FC<LoadLBProps> = ({ visible }) => {
    return (
        <Modal transparent visible={visible} animationType="fade">
            {/* Stacking two BlurViews creates an extreme blur effect */}
            <BlurView intensity={100} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
            <BlurView intensity={100} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.overlay}>
                <View style={styles.container}>
                    <Image
                        source={require('../assets/loadLB.gif')}
                        style={styles.loader}
                        resizeMode="contain"
                    />
                    <Text style={styles.text}>Seeing who's on top...</Text>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent', // Pure blur without manual darkening
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: 320,
        height: 190, // Increased height to fit the button
        backgroundColor: '#0f0f0f',
        borderRadius: 30,
        borderWidth: 1.5,
        borderColor: '#b5d37d',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        shadowColor: '#b5d37d',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    loader: {
        width: 250,
        height: 100,
        marginBottom: 15,
    },
    text: {
        color: '#8c8c8c',
        fontSize: 14,
        fontFamily: 'Montserrat-Bold',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 25,
    },
    cancelBtn: {
        backgroundColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#555'
    },
    cancelText: {
        color: '#FFF',
        fontFamily: 'Montserrat-Bold',
        fontSize: 14,
    }
});

export default LoadLB;