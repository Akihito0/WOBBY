import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Image,
  Platform,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationCard from '../components/NotificationCard';
import { supabase } from '../supabase';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

// We'll load notifications from Supabase `notifications` table for the signed-in user
// Fallback to empty list if table doesn't exist or fetch fails

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

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

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeUserId = sessionData?.session?.user?.id;
        if (!mounted || !activeUserId) return;

        setUserId(activeUserId);
        await reloadNotifications(activeUserId);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadNotifications();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
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
          setNotifications(prev => {
            if (prev.some(item => item.id === nextNotification.id)) {
              return prev;
            }
            return [nextNotification, ...prev];
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
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              Race results and updates will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <NotificationCard
                title={item.title}
                message={item.message}
                timestamp={new Date(item.created_at).toLocaleString()}
                avatar={require('../assets/1.png')}
                isRead={item.is_read}
                onPress={() => navigation.navigate('PostRunFromNotification', { matchId: item.metadata?.match_id, notificationId: item.id })}
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
    marginLeft: 135,
  },
  content: {
    flex: 1,
    backgroundColor: '#121310',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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