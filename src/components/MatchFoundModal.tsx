import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface MatchFoundModalProps {
  visible: boolean;
  currentUser: { name: string; xp: number; avatar?: any };
  opponent: { name: string; xp: number; avatar?: any };
  targetDistance?: number;
  onAccept: () => void;
  onDecline: () => void;
}

export default function MatchFoundModal({
  visible,
  currentUser,
  opponent,
  targetDistance = 1,
  onAccept,
  onDecline,
}: MatchFoundModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState(30);
  const [isAccepted, setIsAccepted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 8,
          speed: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Start countdown timer
      setCountdown(30);
      setIsAccepted(false);
      
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Time expired - auto decline
            if (timerRef.current) clearInterval(timerRef.current);
            console.log('⏱️ [Timer] 30 seconds expired, auto-declining match');
            setTimeout(() => onDecline(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Modal hidden - clear timer
      if (timerRef.current) clearInterval(timerRef.current);
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      setCountdown(30);
      setIsAccepted(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const handleAccept = () => {
    if (!isAccepted) {
      console.log('✅ [MatchFoundModal] User accepted match');
      setIsAccepted(true);
      // Clear timer when accepted
      if (timerRef.current) clearInterval(timerRef.current);
      onAccept();
    }
  };

  // Helper to render Avatar or Placeholder
  const renderAvatar = (user: { name: string; avatar?: any }) => {
    if (user.avatar) {
      return <Image source={user.avatar} style={styles.avatarImg} />;
    }
    
    // Generate initials (e.g., "John Doe" -> "JD")
    const initials = user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>{initials}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.animWrapper,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#1A1D12', '#2A2E1A', '#0D0E09']}
            locations={[0, 0.5, 0.97]}
            style={styles.container}
          >
            {/* Countdown Timer */}
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: countdown <= 10 ? '#FF6B6B' : '#D4FF52' }]}>
                {countdown}s
              </Text>
            </View>

            {/* Header Title Image */}
            <Image
              source={require('../assets/matchFound.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />

            {/* Target Distance */}
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceLabel}>RACE DISTANCE</Text>
              <Text style={styles.distanceValue}>{targetDistance} KM</Text>
            </View>

            {/* Players Row */}
            <View style={styles.vsContainer}>
              {/* Current User */}
              <View style={styles.playerCard}>
                <View style={styles.avatarBorder}>
                  {renderAvatar(currentUser)}
                </View>
                <Text style={styles.playerName}>{currentUser.name}</Text>
                <Text style={styles.playerXP}>{currentUser.xp} XP</Text>
              </View>

              {/* VS Bolt Image */}
              <Image
                source={require('../assets/vs.png')}
                style={styles.vsImage}
                resizeMode="contain"
              />

              {/* Opponent */}
              <View style={styles.playerCard}>
                <View style={styles.avatarBorder}>
                  {renderAvatar(opponent)}
                </View>
                <Text style={styles.playerName}>{opponent.name}</Text>
                <Text style={styles.playerXP}>{opponent.xp} XP</Text>
              </View>
            </View>

            {/* Action Buttons as Images */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleAccept}
                disabled={isAccepted}
                style={[styles.imageButtonWrapper, isAccepted && styles.buttonDisabled]}
              >
                <Image
                  source={require('../assets/accept.png')}
                  style={[styles.buttonImage, isAccepted && { opacity: 0.5 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onDecline}
                disabled={isAccepted}
                style={[styles.imageButtonWrapper, isAccepted && styles.buttonDisabled]}
              >
                <Image
                  source={require('../assets/decline.png')}
                  style={[styles.buttonImage, isAccepted && { opacity: 0.5 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D4FF52',
  },
  timerText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: 'bold',
  },
  animWrapper: {
    width: '92%',
  },
  container: {
    borderRadius: 30,
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerImage: {
    width: '90%',
    height: 100,
    marginTop: -30,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 30,
    marginTop: 50,
  },
  playerCard: {
    alignItems: 'center',
    flex: 1,
  },
  avatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#D4FF52',
    overflow: 'hidden',
    backgroundColor: '#1A1A1A', // Dark background for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252520',
  },
  placeholderText: {
    color: '#D4FF52',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
  },
  playerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#FFF',
    marginTop: 10,
  },
  playerXP: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#888',
  },
  vsImage: {
    width: 90,
    height: 90,
    marginTop: -30,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  imageButtonWrapper: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonImage: {
    width: '100%',
    height: '100%',
    marginBottom: -60,
  },
  distanceContainer: {
    alignItems: 'center',
    marginVertical: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(212, 255, 82, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4FF52',
  },
  distanceLabel: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  distanceValue: {
    color: '#D4FF52',
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
  },
});