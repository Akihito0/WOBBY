import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { ACHIEVEMENT_DATA } from '../pages/Achievements';
import { Ionicons } from '@expo/vector-icons';

const versusIcon = require('../assets/versus.png');

// Notification type → icon mapping
const getNotificationIcon = (title: string, metadata?: any): { type: 'emoji'; value: string } | { type: 'image'; source: any } => {
  const t = title.toLowerCase();
  
  if (t.includes('achievement') || t.includes('unlocked')) {
    if (metadata && metadata.achievement_id) {
      const achievement = ACHIEVEMENT_DATA.find(a => a.id === String(metadata.achievement_id));
      if (achievement && achievement.image) {
        return { type: 'image', source: achievement.image };
      }
    }
    return { type: 'emoji', value: '🏆' };
  }

  if (
    t.includes('match') || t.includes('versus') || t.includes('result') ||
    t.includes('race') || t.includes('win') || t.includes('winner') ||
    t.includes('loss') || t.includes('lose') || t.includes('lost') ||
    t.includes('forfeit') || t.includes('tie')
  ) {
    return { type: 'image', source: versusIcon };
  }
  if (t.includes('xp') || t.includes('experience')) return { type: 'emoji', value: '⚡' };
  return { type: 'emoji', value: '🔔' };
};


interface NotificationProps {
  title: string;
  message: string;
  timestamp: string;
  metadata?: any;
  avatar?: ImageSourcePropType; // kept for compatibility, not rendered
  isRead: boolean;
  onDelete?: () => void;
}

const NotificationCard: React.FC<NotificationProps> = ({
  title,
  message,
  timestamp,
  metadata,
  isRead,
  onDelete,
}) => {
  const icon = getNotificationIcon(title, metadata);

  return (
    <View style={[styles.card, { backgroundColor: isRead ? '#0D0D0D' : '#141814' }]}>
      {/* Unread indicator stripe */}
      {!isRead && <View style={styles.unreadStripe} />}

      <View style={[styles.iconWrap, { backgroundColor: isRead ? '#1A1A1A' : 'rgba(204,255,0,0.08)' }]}>
        {icon.type === 'image' ? (
          <Image source={icon.source} style={styles.versusIconImg} resizeMode="contain" />
        ) : (
          <Text style={styles.icon}>{icon.value}</Text>
        )}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: isRead ? '#BBBBBB' : '#FFFFFF' }]}>{title}</Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.message, { color: isRead ? '#777' : '#AAAAAA' }]}>
          {message}
        </Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    marginBottom: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#CCFF00',
    borderRadius: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
    flexShrink: 0,
  },
  icon: {
    fontSize: 20,
  },
  versusIconImg: {
    width: 30,
    height: 30,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 12,
    flex: 1,
  },
  message: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 5,
  },
  timestamp: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#555',
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default NotificationCard;