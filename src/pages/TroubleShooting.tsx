import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const COLORS = {
  bg: '#121310',
  cardOverlay: 'rgba(255, 255, 255, 0.03)',
  textPrimary: '#D9D9D9',
  textWhite: '#FFFFFF',
  headerGradientStart: '#001E20',
  headerGradientEnd: '#000000',
};

const FAQ_ITEMS = [
  { id: 1, question: 'The AI camera isn’t tracking my movements.', answer: 'Ensure your room is well-lit and your entire body is visible within the camera frame. Try propping your phone against a wall or using a tripod at waist height.' },
  { id: 2, question: 'My Apple Watch / Smartwatch isn’t syncing.', answer: 'Go to Settings → Linked Devices. Make sure your device shows as "Connected". If it does not, try disconnecting and reconnecting it, and ensure WOBBY has permission to read your health data.' },
  { id: 3, question: 'The app crashed during my workout.', answer: 'We apologize for the inconvenience! Your progress is auto-saved every 30 seconds. Force close the app and reopen it; you should be prompted to resume your previous session.' },
];

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, { toValue: expanded ? 0 : 1, duration: 220, useNativeDriver: true }).start();
    setExpanded(prev => !prev);
  };

  const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.faqRow}>
      <View style={styles.faqCardShadow} />
      <View style={styles.faqCardOverlay} />
      <View style={styles.faqContent}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={20} color={COLORS.textPrimary} />
        </Animated.View>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
}

export default function TroubleShootingScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.headerGradientStart, COLORS.headerGradientEnd]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image source={require('../assets/back0.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} adjustsFontSizeToFit numberOfLines={1}>TROUBLE SHOOTING</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
            <Ionicons name="build" size={64} color="#3B82F6" style={styles.mainIcon} />
            <Text style={styles.pageSubtitle}>Find quick fixes and solutions to get back to your workout.</Text>
        </View>

        <View style={styles.sectionPanel}>
          {FAQ_ITEMS.map((item) => (
            <FaqRow key={item.id} question={item.question} answer={item.answer} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { height: 117, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 18, paddingHorizontal: 22 },
  backBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backIcon: { width: 30, height: 30 },
  headerTitle: { flex: 1, fontFamily: 'Montserrat_900Black', fontSize: 26, color: COLORS.textWhite, textAlign: 'right' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48, paddingTop: 24 },
  iconContainer: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 30 },
  mainIcon: { marginBottom: 16 },
  pageSubtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 15, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 22 },
  sectionPanel: { backgroundColor: 'rgba(34,34,29,0.25)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16, marginHorizontal: 16 },
  faqRow: { position: 'relative', marginBottom: 12 },
  faqCardShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15 },
  faqCardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.cardOverlay, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  faqContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: 18, paddingVertical: 12 },
  faqQuestion: { flex: 1, fontFamily: 'Montserrat_400Regular', fontSize: 15, color: COLORS.textPrimary, paddingRight: 12 },
  faqAnswer: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: COLORS.textPrimary, lineHeight: 20, paddingHorizontal: 18, paddingBottom: 16, opacity: 0.85 },
});