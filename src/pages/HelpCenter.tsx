import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type YouStackParamList = {
  YouSettings: undefined;
  HelpCenter: undefined;
  GettingStarted: undefined; 
  TroubleShooting: undefined; 
};

type Props = NativeStackScreenProps<YouStackParamList, 'HelpCenter'>;

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#121310',
  cardBg: '#22221D',
  cardOverlay: 'rgba(255, 255, 255, 0.03)',
  searchBg: 'rgba(147,147,148,0.41)',
  categoryBg: 'rgba(42, 42, 34, 0.4)',
  divider: 'rgba(217,217,217,0.45)',
  textPrimary: '#D9D9D9',
  textWhite: '#FFFFFF',
  accent: '#0066FF',
  headerGradientStart: '#001E20',
  headerGradientEnd: '#000000',
};

// ─── General Top FAQs ──────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    id: 1,
    question: 'Do I need equipment to do the workouts?',
    answer: 'No! Most workouts in WOBBY are designed to be done with just your bodyweight. However, some advanced routines do suggest optional equipment like resistance bands or dumbbells.',
  },
  {
    id: 2,
    question: 'How do I choose the right fitness level?',
    answer: 'When you set up your profile, you can select Beginner, Intermediate, or Advanced. The app will also adapt over time based on your performance and feedback.',
  },
  {
    id: 3,
    question: 'Can I connect the app to Apple Health or Google Fit?',
    answer: 'Yes! WOBBY supports integration with both Apple Health and Google Fit. Go to Settings → Integrations to connect your preferred health platform.',
  },
  {
    id: 4,
    question: 'How do I track my progress?',
    answer: 'Your progress is automatically tracked after each session. Visit the Progress tab to see charts, streaks, personal records, and weekly summaries.',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionPanel({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.sectionPanel, style]}>{children}</View>;
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setExpanded(prev => !prev);
  };

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'], 
  });

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

function SubmitTicketButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.submitBtn}>
      <View style={styles.submitBtnBg} />
      <Text style={styles.submitBtnText}>Submit a Ticket</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function HelpCenterScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');

  const filteredFaqs = FAQ_ITEMS.filter((item) => 
    item.question.toLowerCase().includes(searchText.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleEmailSupport = async () => {
    const email = 'wobby@gmail.com';
    const subject = 'WOBBY Support Ticket';
    const body = 'Hi Wobby Support Team,\n\nI need help with...';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Error", "No email app found. Please email us directly at wobby@gmail.com");
      }
    } catch (error) {
      Alert.alert("Error", "Could not open email app.");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.headerGradientStart, COLORS.headerGradientEnd]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={require('../assets/back0.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HELP CENTER</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={COLORS.textPrimary}
              value={searchText}
              onChangeText={setSearchText}
            />
            <Ionicons name="search" size={20} color={COLORS.textPrimary} style={styles.searchIcon} />
          </View>
        </View>

        {/* Category Grid */}
        <View style={styles.categoryRow}>
          <TouchableOpacity 
            style={styles.categoryCard} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('GettingStarted')}
          >
            <Ionicons name="rocket-outline" size={36} color="#3B82F6" style={styles.categoryIcon} />
            <Text style={styles.categoryLabel}>Getting Started</Text>
          </TouchableOpacity>

          <View style={styles.categoryDivider} />

          <TouchableOpacity 
            style={styles.categoryCard} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('TroubleShooting')}
          >
            <Ionicons name="build-outline" size={36} color="#3B82F6" style={styles.categoryIcon} />
            <Text style={styles.categoryLabel}>Trouble Shooting</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section Wrapped to push to bottom */}
        <View style={styles.bottomSection}>
          <Text style={styles.faqSectionTitle}>Frequently Asked Questions (FAQs)</Text>

          <SectionPanel>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((item) => (
                <FaqRow
                  key={item.id}
                  question={item.question}
                  answer={item.answer}
                />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No results found for "{searchText}"</Text>
              </View>
            )}

            <View style={styles.supportSection}>
              <Text style={styles.stillGotQuestions}>Still got questions?</Text>
              <SubmitTicketButton onPress={handleEmailSupport} />
            </View>
          </SectionPanel>
        </View>
        
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  header: { 
    height: 117, 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingBottom: 18, 
    paddingHorizontal: 22 
  },
  backBtn: { 
    width: 34, 
    height: 34, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  backIcon: { 
    width: 30, 
    height: 30 
  },
  headerTitle: { 
    flex: 1, 
    fontFamily: 'Montserrat_900Black', 
    fontSize: 28, 
    color: COLORS.textWhite, 
    textAlign: 'right' 
  },
  scroll: { 
    flex: 1 
  }, 
  
  /* UPDATED SCROLL CONTENT */
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: 48 
  },
  
  searchWrapper: { 
    paddingHorizontal: 40, 
    marginTop: 20, 
    marginBottom: 28 },
  searchBar: { 
    backgroundColor: COLORS.searchBg, 
    borderRadius: 15, 
    height: 45, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16 
  },
  searchInput: { 
    flex: 1, 
    fontFamily: 'Montserrat_600SemiBold', 
    fontSize: 15, 
    color: COLORS.textPrimary, 
    padding: 0 },
  searchIcon: { 
    marginLeft: 8 
  },
  categoryRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 40, 
    marginBottom: 32 
  },
  categoryCard: { 
    flex: 1, 
    backgroundColor: COLORS.categoryBg, 
    borderRadius: 16, 
    height: 110, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  categoryIcon: { 
    marginBottom: 8 
  }, 
  categoryLabel: { 
    fontFamily: 'Montserrat_600SemiBold', 
    fontSize: 14, 
    color: COLORS.textPrimary, 
    textAlign: 'center' 
  },
  categoryDivider: { 
    width: 1, 
    height: 70, 
    backgroundColor: COLORS.divider, 
    marginHorizontal: 15 
  },
  
  /* NEW WRAPPER TO PUSH TO BOTTOM */
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 20, // Gives breathing room on smaller screens
  },

  faqSectionTitle: { 
    fontFamily: 'Montserrat_800ExtraBold', 
    fontSize: 19, 
    color: COLORS.textPrimary, 
    marginHorizontal: 26, 
    marginBottom: 16 
  },
  sectionPanel: { 
    backgroundColor: 'rgba(34,34,29,0.25)', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)', 
    paddingTop: 16, 
    paddingHorizontal: 16, 
    paddingBottom: 24, 
    marginHorizontal: 16 
  },
  faqRow: { 
    position: 'relative', 
    marginBottom: 12 
  },
  faqCardShadow: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    borderRadius: 15 
  },
  faqCardOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: COLORS.cardOverlay, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.12)' 
  },
  faqContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    minHeight: 72, 
    paddingHorizontal: 18, 
    paddingVertical: 12 
  },
  faqQuestion: { 
    flex: 1, 
    fontFamily: 'Montserrat_700Bold', 
    fontSize: 15, 
    color: COLORS.textPrimary, 
    paddingRight: 12 
  },
  faqAnswer: { 
    fontFamily: 'Montserrat_400Regular', 
    fontSize: 13, 
    color: COLORS.textPrimary, 
    lineHeight: 20, 
    paddingHorizontal: 18, 
    paddingBottom: 16, 
    opacity: 0.85 
  },
  emptyStateContainer: { 
    paddingVertical: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyStateText: { 
    fontFamily: 'Montserrat_400Regular', 
    fontSize: 14, 
    color: COLORS.textPrimary, 
    fontStyle: 'italic',
    opacity: 0.8 },
  supportSection: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 20, 
    marginBottom: 8, 
    gap: 16 
  },
  stillGotQuestions: { 
    fontFamily: 'Montserrat_600SemiBold', 
    fontSize: 14, 
    color: COLORS.textPrimary 
  },
  submitBtn: { 
    position: 'relative', 
    height: 38, 
    paddingHorizontal: 22, 
    borderRadius: 19, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  submitBtnBg: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: COLORS.accent 
  },
  submitBtnText: { 
    fontFamily: 'Montserrat_600SemiBold', 
    fontSize: 14, color: 
    COLORS.textWhite, 
    textAlign: 'center' 
  },
});
