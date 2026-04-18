import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ImageSourcePropType 
} from 'react-native';

interface NotificationProps {
  title: string;
  message: string;
  timestamp: string;
  avatar: ImageSourcePropType;
  isRead: boolean;
  onPress?: () => void;
}

const NotificationCard: React.FC<NotificationProps> = ({ 
  title, 
  message, 
  timestamp, 
  avatar, 
  isRead, 
  onPress 
}) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
      // Condition: Light background for unread (#1A1A17), dark for read (#0D0D0D)
      style={[styles.card, { backgroundColor: isRead ? '#0D0D0D' : '#1A1A17' }]}
    >
      <Image source={avatar} style={styles.avatar} />
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.message, { color: isRead ? '#888' : '#BBB' }]}>
          {message}
        </Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    marginBottom: 2, // Creates a thin separator effect between cards
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontFamily: 'Montserrat_400Regular', // Or Barlow as per your App.tsx
    fontSize: 11,
    marginBottom: 4,
  },
  timestamp: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#666',
  },
});

export default NotificationCard;