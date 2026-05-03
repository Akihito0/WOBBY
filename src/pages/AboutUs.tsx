import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

type Props = {
  navigation: NavigationProp<any>;
};

// ─── Local assets ─────────────────────────────────────────────────────────────
const ASSETS = {
  wobbyDumbbell: require('../assets/wobby.png'),
  backArrow:     require('../assets/arrow-down.png'),
  bgDumbbell:    require('../assets/aboutusbg.png'),
  avatar1:       require('../assets/1.png'),
  avatar2:       require('../assets/2.png'),
  avatar3:       require('../assets/3.png'),
  avatar4:       require('../assets/4.png'),
  avatar5:       require('../assets/5.png'),
};

// ─── Team Data (Alphabetized by Last Name) ────────────────────────────────────
const TEAM_MEMBERS = [
  { 
    id: 0, 
    name: "Cliff Edward E. Alsonado", 
    role: "Full Stack Developer", 
    desc: "Architects the core systems and ensures seamless integration across the Wobby ecosystem.", 
    avatar: ASSETS.avatar1 
  },
  { 
    id: 1, 
    name: "Nesserain C. De La Cruz", 
    role: "Full Stack Developer", 
    desc: "Builds robust backend logic and scalable infrastructure for real-time fitness tracking.", 
    avatar: ASSETS.avatar2 
  },
  { 
    id: 2, 
    name: "Clark Lourence L. Jaca", 
    role: "Full Stack Developer", 
    desc: "Develops intuitive user interfaces and optimizes the mobile experience for iOS and Android.", 
    avatar: ASSETS.avatar3 
  },
  { 
    id: 3, 
    name: "Noah Gabriel R. Suan", 
    role: "Full Stack Developer", 
    desc: "Implements complex AI vision features and translates biometric data into actionable feedback.", 
    avatar: ASSETS.avatar4 
  },
  { 
    id: 4, 
    name: "Tweetie M. Zapanta", 
    role: "Full Stack Developer", 
    desc: "Engineers the social and gamification mechanics to drive user retention and engagement.", 
    avatar: ASSETS.avatar5 
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg:    '#121310',
  card:  '#1C1C18',
  accent:'#CCFF00',
  white: '#FFFFFF',
  muted: '#A0A0A0',
  teal:  '#001E20',
};

// ─── Interactive Team Section ─────────────────────────────────────────────────
function InteractiveTeamSection() {
  const [expanded, setExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); 

  // Animation values
  const expandAnim = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;

  // Real index bounds 0-4 for highlighting the top avatars seamlessly
  const activeIndex = ((currentStep % 5) + 5) % 5;

  const toggleExpand = () => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false, 
    }).start();
    setExpanded(!expanded);
  };

  const changeMember = (direction: number) => {
    const newStep = currentStep + direction;
    setCurrentStep(newStep);

    Animated.spring(scrollAnim, {
      toValue: newStep,
      friction: 9,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // ── Corrected Infinite Loop Interpolation Math ──
  const getInterpolations = (index: number) => {
    const inputRange = [];
    const translateX = [];
    const scale = [];
    const opacity = [];

    for (let k = -20; k <= 20; k++) {
      const virtualCenter = index + k * 5;
      
      // Far Left 
      inputRange.push(virtualCenter - 2);
      translateX.push(350); 
      scale.push(0.6);
      opacity.push(0);

      // Right Peek 
      inputRange.push(virtualCenter - 1);
      translateX.push(165); 
      scale.push(0.8);
      opacity.push(0.3);

      // Center Focused
      inputRange.push(virtualCenter);
      translateX.push(0);
      scale.push(1);
      opacity.push(1);

      // Left Peek 
      inputRange.push(virtualCenter + 1);
      translateX.push(-165); 
      scale.push(0.8);
      opacity.push(0.3);

      // Far Right 
      inputRange.push(virtualCenter + 2);
      translateX.push(-350); 
      scale.push(0.6);
      opacity.push(0);
    }

    return {
      transform: [
        { translateX: scrollAnim.interpolate({ inputRange, outputRange: translateX }) },
        { scale: scrollAnim.interpolate({ inputRange, outputRange: scale }) }
      ],
      opacity: scrollAnim.interpolate({ inputRange, outputRange: opacity })
    };
  };

  const contentHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 390], 
  });

  const chevronRotation = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'], 
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.8}>
        <Text style={styles.cardTitle}>Team</Text>
        
        <View style={styles.teamContentRow}>
          <View style={styles.avatarRow}>
            {TEAM_MEMBERS.map((member, i) => {
              const isActive = expanded && i === activeIndex;
              return (
                <Image 
                  key={member.id} 
                  source={member.avatar} 
                  style={[styles.avatar, isActive && styles.activeAvatar]} 
                  resizeMode="cover" 
                />
              );
            })}
          </View>
          
          <Animated.Image 
            source={ASSETS.backArrow} 
            style={[styles.downChevron, { transform: [{ rotate: chevronRotation }] }]} 
            resizeMode="contain" 
          />
        </View>
      </TouchableOpacity>

      <Animated.View style={{ height: contentHeight, overflow: 'hidden' }}>
        <View style={styles.carouselContainer}>
          
          {TEAM_MEMBERS.map((member, i) => {
            const isCenter = activeIndex === i;
            const animations = getInterpolations(i);

            return (
              <Animated.View 
                key={member.id}
                style={[
                  styles.memberInfoCard,
                  animations,
                  { zIndex: isCenter ? 10 : 1 } 
                ]}
                pointerEvents={isCenter ? 'auto' : 'none'}
              >
                <Image source={member.avatar} style={styles.largeAvatar} />
                <Text style={styles.memberName} numberOfLines={2} adjustsFontSizeToFit>
                  {member.name}
                </Text>
                <Text style={styles.memberRole}>{member.role}</Text>
                <Text style={styles.memberDesc}>{member.desc}</Text>
              </Animated.View>
            );
          })}

          <TouchableOpacity 
            onPress={() => changeMember(-1)} 
            style={[styles.carouselBtn, styles.leftBtn]}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Image source={ASSETS.backArrow} style={[styles.carouselArrow, { transform: [{ rotate: '90deg' }] }]} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => changeMember(1)} 
            style={[styles.carouselBtn, styles.rightBtn]}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Image source={ASSETS.backArrow} style={[styles.carouselArrow, { transform: [{ rotate: '-90deg' }] }]} />
          </TouchableOpacity>

        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AboutUsScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <Image source={ASSETS.bgDumbbell} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.headerBg} pointerEvents="none" />

      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image source={ASSETS.backArrow} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>About Us</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.logoCardWrapper}>
          <View style={styles.logoCard}>
            <Image source={ASSETS.wobbyDumbbell} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.logoName}>WOBBY</Text>
            <Text style={styles.logoTagline}>Level Up Your Fitness</Text>
          </View>
        </View>

        <View style={[styles.card, styles.tallCard]}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardBody}>
            Our goal is to solve issues like high injury risk and low user retention. 
            We are building an AI-driven fitness ecosystem that uses Computer Vision 
            and Biometric Data to provide real-time coaching and immediate audio feedback.
          </Text>
        </View>

        <View style={[styles.card, styles.tallCard]}>
          <Text style={styles.cardTitle}>Our Story</Text>
          <Text style={styles.cardBody}>
            Developed by Libraphase Technologies, Wobby is the creation of a five-member 
            engineering team: Cliff, Nesserain, Clark, Noah, and Tweetie. We built this 
            cross-platform app to act as an active training partner, integrating an RPG-style 
            progression system where physical effort is rewarded with XP, levels, and 
            community competition.
          </Text>
        </View>

        <InteractiveTeamSection />

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bgImage: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '60%',
    opacity: 0.35, 
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 270, // 🔻 Pulled the teal background up!
    backgroundColor: COLORS.teal,
    opacity: 0.80, 
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.accent,
    transform: [{ rotate: '90deg' }], 
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16, 
  },
  logoCardWrapper: {
    alignItems: 'center',
    marginTop: 24, // 🔻 Pushed the card down to create separation!
    marginBottom: 16,
  },
  logoCard: {
    width: 240, 
    height: 250, 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: 140, 
    height: 110,
    marginBottom: 16,
  },
  logoName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 1.5,
  },
  logoTagline: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.muted,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', 
  },
  tallCard: {
    minHeight: 200, 
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'left', 
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.muted,
    lineHeight: 24,
    textAlign: 'left',
  },

  // ── Team Section Styles ──
  teamContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, 
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333', 
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeAvatar: {
    borderColor: COLORS.accent, 
  },
  downChevron: {
    width: 18,
    height: 18,
    tintColor: COLORS.white, 
    opacity: 0.7,
  },

  // ── 3D Carousel Styles ──
  carouselContainer: {
    height: 350, 
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfoCard: {
    position: 'absolute', 
    width: 260, 
    height: 320, 
    alignItems: 'center',
    backgroundColor: '#262621', 
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  largeAvatar: {
    width: 90, 
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  memberName: {
    color: COLORS.white,
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  memberRole: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  memberDesc: {
    color: COLORS.muted,
    fontSize: 15, 
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // ── Navigation Arrows ──
  carouselBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -25, 
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, 
  },
  leftBtn: {
    left: -15, 
  },
  rightBtn: {
    right: -15,
  },
  carouselArrow: {
    width: 28, 
    height: 28,
    tintColor: COLORS.muted,
  },
});