import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { supabase } from '../supabase';
import { ACHIEVEMENT_DATA } from '../pages/Achievements';

const versusIcon = require('../assets/versus.png');

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotificationContextValue {
  unreadCount: number;
  markAllRead: () => Promise<void>;
  latestNotification: any | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  markAllRead: async () => {},
  latestNotification: null,
  dismissToast: () => {},
});

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useNotifications = () => useContext(NotificationContext);

// ─── Toast Component ─────────────────────────────────────────────────────────
interface ToastProps {
  notification: any;
  onDismiss: () => void;
}

function NotificationToast({ notification, onDismiss }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      dismissWithAnimation();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissWithAnimation = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -120,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  // Determine icon based on notification type
  const getNotificationIcon = (): { type: 'emoji'; value: string } | { type: 'image'; source: any } => {
    const title = notification.title || '';
    const metadata = notification.metadata || {};
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

  const icon = getNotificationIcon();

  return (
    <Animated.View
      style={[
        toastStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={dismissWithAnimation}
        style={toastStyles.inner}
      >
        <View style={toastStyles.iconWrap}>
          {icon.type === 'image' ? (
            <Image source={icon.source} style={toastStyles.versusImg} resizeMode="contain" />
          ) : (
            <Text style={toastStyles.icon}>{icon.value}</Text>
          )}
        </View>
        <View style={toastStyles.textWrap}>
          <Text style={toastStyles.label}>NEW NOTIFICATION</Text>
          <Text style={toastStyles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={toastStyles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity onPress={dismissWithAnimation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={toastStyles.close}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1612',
    borderWidth: 1,
    borderColor: '#2F6F4E',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 18,
  },
  versusImg: {
    width: 26,
    height: 26,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    color: '#8EE6A8',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Montserrat_800ExtraBold',
    marginBottom: 2,
  },
  message: {
    color: '#C9D1CC',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 15,
  },
  close: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Load current session & initial unread count
  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) return;
      setUserId(uid);
      await refreshUnreadCount(uid);
    };
    init();

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        refreshUnreadCount(uid);
      } else {
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUnreadCount = async (uid: string) => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Real-time listener for new notification inserts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notif_ctx:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          // Increment unread counter
          setUnreadCount((prev) => prev + 1);
          // Show toast
          setLatestNotification(newNotif);
          setShowToast(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Mark all unread notifications as read
  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [userId, unreadCount]);

  const dismissToast = useCallback(() => {
    setShowToast(false);
    setLatestNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        markAllRead,
        latestNotification,
        dismissToast,
      }}
    >
      {children}
      {showToast && latestNotification && (
        <NotificationToast
          notification={latestNotification}
          onDismiss={dismissToast}
        />
      )}
    </NotificationContext.Provider>
  );
}
