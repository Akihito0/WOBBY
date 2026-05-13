import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../components/NotificationCard';
import { supabase } from '../supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '../context/NotificationContext';
import { ACHIEVEMENT_DATA } from './Achievements';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { markAllRead } = useNotifications();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const reloadNotifications = async (activeUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', userId);

              if (error) throw error;
              setNotifications([]);
            } catch (err) {
              console.error('Error clearing notifications:', err);
              Alert.alert('Error', 'Failed to clear notifications.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    let mounted = true;
    const loadAndMarkRead = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeUserId = sessionData?.session?.user?.id;
        if (!mounted || !activeUserId) return;

        setUserId(activeUserId);

        // -- BACKFILL PAST ACHIEVEMENTS --
        try {
          const { data: userAchievements } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', activeUserId);
            
          const { data: existingAchNotifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', activeUserId)
            .like('title', '%Achievement%');

          if (userAchievements && userAchievements.length > 0) {
            const inserts = [];
            for (const ach of userAchievements) {
              const achId = String(ach.achievement_name);
              const exists = existingAchNotifs?.find((n: any) => n.metadata && String(n.metadata.achievement_id) === achId);
              
              if (!exists) {
                const achDef = ACHIEVEMENT_DATA.find(a => a.id === achId);
                inserts.push({
                  user_id: activeUserId,
                  title: '🏆 Achievement Unlocked!',
                  message: `You unlocked "${achDef?.name || 'Achievement #' + achId}" — +1000 XP bonus!`,
                  metadata: { achievement_id: achId },
                  is_read: true,
                  created_at: ach.unlocked_at || new Date().toISOString()
                });
              }
            }
            if (inserts.length > 0) {
              await supabase.from('notifications').insert(inserts);
            }
          }
        } catch (backfillErr) {
          console.warn('Error backfilling achievements:', backfillErr);
        }

        // Load notifications first so the list renders immediately
        await reloadNotifications(activeUserId);

        // Then mark all as read (clears red dot) and refresh list
        await markAllRead();

        // Re-fetch so local list reflects is_read: true
        if (mounted) await reloadNotifications(activeUserId);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAndMarkRead();
    return () => { mounted = false; };
  }, []);

  // Real-time listener: prepend new notifications while screen is open
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications_screen:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextNotification = payload.new as any;
          // Mark it read immediately (we're on the screen)
          supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', nextNotification.id)
            .then(() => {});

          setNotifications((prev) => {
            if (prev.some((item) => item.id === nextNotification.id)) return prev;
            return [{ ...nextNotification, is_read: true }, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── FIXED HEADER ── */}
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
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── SCROLLABLE BODY ── */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#CCFF00" />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              XP rewards, achievements, and match results will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <NotificationCard
                title={item.title}
                message={item.message}
                timestamp={new Date(item.created_at).toLocaleString()}
                metadata={item.metadata}
                isRead={item.is_read}
                onDelete={() => deleteNotification(item.id)}
              />
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121310',
  },
  header: {
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    height: 100,
    paddingBottom: 22,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat_900Black',
    flex: 1,
    textAlign: 'center',
    marginRight: 20,
  },
  clearAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  clearAllText: {
    color: '#FF4444',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#121310',
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A1A',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;