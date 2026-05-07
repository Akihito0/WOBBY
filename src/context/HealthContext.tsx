import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👇 Added for persistence check

// Import your custom native module
import {
  requestPermissions,
  getLatestHeartRate,
  startHeartRateObserver,
  stopHeartRateObserver,
  addHeartRateListener,
  HeartRateSubscription,
} from '../../modules/wobby-health';

interface HealthContextType {
  heartRate: number | null;
  isAuthorized: boolean;
  refreshHeartRate: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);
const STORAGE_KEY = '@wobby_linked_devices'; // Match the key in LinkedDevices

export function HealthProvider({ children }: { children: ReactNode }) {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 1. Fetch logic - Now works for both iOS (HealthKit) and Android (Health Connect)
  const fetchHeartRate = useCallback(async () => {
    // Only fetch if we are authorized
    if (!isAuthorized) return;

    try {
      const bpm = await getLatestHeartRate();
      if (bpm !== null) {
        setHeartRate(Math.round(bpm)); 
      }
    } catch (error) {
      console.log('[ERROR] Failed to fetch heart rate:', error);
    }
  }, [isAuthorized]);

  // 2. Initialization & Persistence Check
  useEffect(() => {
    const initHealth = async () => {
      // 🕵️ Check if we have a saved device on the phone's hard drive
      const storedDevices = await AsyncStorage.getItem(STORAGE_KEY);
      const hasSavedDevice = storedDevices && JSON.parse(storedDevices).length > 0;

      // On iOS, we check permissions immediately.
      // On Android, we only set isAuthorized if the user has actually paired Health Connect.
      if (Platform.OS === 'ios') {
        try {
          const success = await requestPermissions();
          if (success) {
            console.log('✅ Apple HealthKit Authorized!');
            setIsAuthorized(true);
          }
        } catch (error) {
          console.log('🚨 Failed to authorize HealthKit:', error);
        }
      } else {
        // Android Path: If we have a saved connection, consider us authorized
        if (hasSavedDevice) {
          console.log('✅ Android Health Connect Connection Found!');
          setIsAuthorized(true);
        }
      }
    };

    initHealth();
  }, []);

  // 3. Once authorized: subscribe to live HealthKit updates on iOS, poll on Android
  useEffect(() => {
    if (!isAuthorized) return;

    fetchHeartRate();

    if (Platform.OS === 'ios') {
      let subscription: HeartRateSubscription | null = null;
      let cancelled = false;

      (async () => {
        try {
          const started = await startHeartRateObserver();
          if (cancelled) {
            await stopHeartRateObserver();
            return;
          }
          if (started) {
            subscription = addHeartRateListener(event => {
              if (event?.bpm != null) {
                setHeartRate(Math.round(event.bpm));
              }
            });
          }
        } catch (error) {
          console.log('[WobbyHealth] Observer failed, falling back to polling:', error);
        }
      })();

      return () => {
        cancelled = true;
        subscription?.remove();
        stopHeartRateObserver().catch(() => {});
      };
    }

    // Android fallback: poll every 10s
    const interval = setInterval(fetchHeartRate, 10000);
    return () => clearInterval(interval);
  }, [isAuthorized, fetchHeartRate]);

  return (
    <HealthContext.Provider value={{ heartRate, isAuthorized, refreshHeartRate: fetchHeartRate }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}