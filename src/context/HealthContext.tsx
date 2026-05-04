import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';

// 👇 Import your shiny new custom native module!
import { requestPermissions, getLatestHeartRate } from '../../modules/wobby-health';

interface HealthContextType {
  heartRate: number | null;
  isAuthorized: boolean;
  refreshHeartRate: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 1. Fetch logic using your custom Swift function
  const fetchHeartRate = useCallback(async () => {
    if (Platform.OS !== 'ios' || !isAuthorized) return;

    try {
      const bpm = await getLatestHeartRate();
      if (bpm !== null) {
        setHeartRate(Math.round(bpm)); // Round it for a clean display
      }
    } catch (error) {
      console.log('[ERROR] Failed to fetch heart rate from custom module:', error);
    }
  }, [isAuthorized]);

  // 2. Initialization & Permissions
  useEffect(() => {
    // 🛑 BOUNCER: Stop Android devices from asking for Apple permissions
    if (Platform.OS !== 'ios') {
      console.log('📱 Android device detected. Skipping Apple HealthKit.');
      return;
    }

    const initHealth = async () => {
      try {
        const success = await requestPermissions();
        if (success) {
          console.log('✅ Custom Wobby Health Module Authorized!');
          setIsAuthorized(true);
        }
      } catch (error) {
        console.log('🚨 Failed to authorize HealthKit via custom module:', error);
      }
    };

    initHealth();
  }, []);

  // 3. Trigger initial fetch once authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchHeartRate();
    }
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