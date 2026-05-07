import { requireNativeModule } from 'expo-modules-core';

// Tell React Native to load our compiled Swift code
const WobbyHealthModule = requireNativeModule('WobbyHealth');

// 1. Export permissions function
export async function requestPermissions(): Promise<boolean> {
  return await WobbyHealthModule.requestPermissions();
}

// 2. Export the single latest reading function
export async function getLatestHeartRate(): Promise<number | null> {
  return await WobbyHealthModule.getLatestHeartRate();
}

// Define the shape of the data coming back for history
export type HeartRateSample = {
  value: number;
  date: string; // ISO 8601 format (e.g., "2026-05-02T10:00:00Z")
};

// 3. Export the history array function
export async function getHeartRateHistory(daysBack: number): Promise<HeartRateSample[]> {
  return await WobbyHealthModule.getHeartRateHistory(daysBack);
}

// 4. Live heart rate observer (iOS only — Android falls back to polling)
export type HeartRateUpdate = { bpm: number };
export type HeartRateSubscription = { remove: () => void };

export async function startHeartRateObserver(): Promise<boolean> {
  if (typeof WobbyHealthModule.startHeartRateObserver !== 'function') return false;
  return await WobbyHealthModule.startHeartRateObserver();
}

export async function stopHeartRateObserver(): Promise<boolean> {
  if (typeof WobbyHealthModule.stopHeartRateObserver !== 'function') return false;
  return await WobbyHealthModule.stopHeartRateObserver();
}

export function addHeartRateListener(
  listener: (event: HeartRateUpdate) => void
): HeartRateSubscription {
  return WobbyHealthModule.addListener('onHeartRateUpdate', listener);
}