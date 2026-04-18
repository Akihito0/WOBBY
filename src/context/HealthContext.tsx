import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native'; // <-- We imported Platform here
import AppleHealthKit from 'react-native-health';
import type { HealthKitPermissions, HealthInputOptions } from 'react-native-health';

interface HealthContextType {
  heartRate: number | null;
  isAuthorized: boolean;
  refreshHeartRate: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 🛑 BOUNCER #1: This stops Android devices from asking for Apple permissions
    if (Platform.OS !== 'ios') {
      console.log('📱 Android device detected. Skipping Apple HealthKit.');
      return; 
    }

    if (!AppleHealthKit || !AppleHealthKit.initHealthKit) {
      console.log('🚨 [WARNING] Apple HealthKit native module is STILL missing on this device.');
      return;
    }

    const permissions = {
      permissions: {
        read: [AppleHealthKit.Constants.Permissions.HeartRate],
        write: [],
      },
    } as HealthKitPermissions;

    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        console.log('[ERROR] Cannot grant HealthKit permissions!', error);
        return;
      }
      setIsAuthorized(true);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const options: HealthInputOptions = {
        startDate: yesterday.toISOString(),
        endDate: new Date().toISOString(),
        limit: 1, 
        ascending: false, 
      };

      AppleHealthKit.getHeartRateSamples(options, (err: Object, results: Array<any>) => {
        if (!err && results && results.length > 0) {
          setHeartRate(results[0].value);
        }
      });
    });
  }, []);

  const refreshHeartRate = () => {
    // 🛑 BOUNCER #2: This stops Android devices from trying to fetch heartbeat data
    if (Platform.OS !== 'ios') return;

    if (!isAuthorized || !AppleHealthKit) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const options: HealthInputOptions = {
      startDate: yesterday.toISOString(),
      endDate: new Date().toISOString(),
      limit: 1,
      ascending: false,
    };

    AppleHealthKit.getHeartRateSamples(options, (err: Object, results: Array<any>) => {
      if (!err && results && results.length > 0) {
        setHeartRate(results[0].value);
      }
    });
  };

  return (
    <HealthContext.Provider value={{ heartRate, isAuthorized, refreshHeartRate }}>
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