import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Image,
  Platform,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../components/NotificationCard';
import { LinearGradient } from 'expo-linear-gradient';

const notifications = [
  {
    id: '1',
    title: 'You have a new challenger!',
    message: '@tweetzie wants to challenge you.',
    timestamp: '2 hrs ago',
    avatar: require('../assets/1.png'),
    isRead: false,
  },
  {
    id: '2',
    title: 'You have a new challenger!',
    message: '@calrkGwapough wants to challenge you.',
    timestamp: '2 hrs ago',
    avatar: require('../assets/2.png'),
    isRead: true,
  },
  // Adding duplicates to ensure the list is long enough to scroll
  {
    id: '3',
    title: 'You have a new challenger!',
    message: '@gym_rat_99 wants to challenge you.',
    timestamp: '5 hrs ago',
    avatar: require('../assets/3.png'),
    isRead: true,
  },
  {
    id: '4',
    title: 'You have a new challenger!',
    message: '@fitness_king wants to challenge you.',
    timestamp: '1 day ago',
    avatar: require('../assets/4.png'),
    isRead: true,
  },
];

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      
      {/* ── FIXED HEADER ── */}
      {/* Being outside the FlatList ensures it never moves */}
      <LinearGradient
              colors={['#001E20', '#000000']}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0.3, y: 0.5 }}
              style={styles.header}
            >
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Image 
              source={require('../assets/back0.png')} 
              style={styles.backIcon}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        </View>
      </LinearGradient>

      {/* ── SCROLLABLE BODY ── */}
      <View style={styles.content}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NotificationCard
              title={item.title}
              message={item.message}
              timestamp={item.timestamp}
              avatar={item.avatar}
              isRead={item.isRead}
              onPress={() => console.log(`Pressed notification ${item.id}`)}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#121310",
  },
  header: {
    backgroundColor: "#000000",
    paddingTop: Platform.OS === "ios" ? 52 : 32,
    height: 100,
    paddingBottom: 22,
    paddingHorizontal: 10,
    borderBottomWidth: 1, 
    borderBottomColor: "#1a1a1a",
    zIndex: 10, // Ensures header stays on top of content
  },
  headerRow: {
    //flexDirection: 'row',
    //alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
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
    marginLeft: 5,
    marginTop: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Montserrat_900Black', 
    marginTop: -30,
    marginLeft: 130,
  },
  content: {
    flex: 1,
    backgroundColor: '#121310',
  },
});

export default NotificationsScreen;