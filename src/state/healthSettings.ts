import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Settings > Apple Health: "Save sessions to Apple Health", kept on this phone
 * (saunafam.health.v1), off until the person turns it on (spec, section 3,
 * "Apple Health"; open question 3).
 *
 * The seam for M11: `healthBridge` asks iOS for write-only permission and says
 * what iOS answered. Until M11 replaces it, it reports "not wired" and the
 * switch is stored but nothing is written (saveMindfulMinutes is still a no-op).
 * M11 reads `loadHealthSetting()` before each write.
 */
export const HEALTH_SETTING_KEY = 'saunafam.health.v1';

/** What iOS says about writing mindful minutes. */
export type HealthPermission = 'granted' | 'denied' | 'notAsked' | 'unavailable' | 'notWired';

export interface HealthBridge {
  /** Ask for write-only permission (mindful minutes). */
  request: () => Promise<HealthPermission>;
  /** The current answer, without asking. */
  status: () => Promise<HealthPermission>;
}

/** Replaced by M11 with @appeeky/expo-healthkit. */
export const healthBridge: HealthBridge = {
  request: async () => (Platform.OS === 'ios' ? 'notWired' : 'unavailable'),
  status: async () => (Platform.OS === 'ios' ? 'notWired' : 'unavailable'),
};

export async function loadHealthSetting(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_SETTING_KEY);
    return raw ? JSON.parse(raw)?.enabled === true : false;
  } catch {
    return false;
  }
}

export async function saveHealthSetting(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify({ enabled }));
}

export type HealthState = 'off' | 'on' | 'denied' | 'unavailable' | 'waiting';

/** What the screen shows, from the stored switch and iOS's answer. */
export function healthState(enabled: boolean, permission: HealthPermission): HealthState {
  if (permission === 'unavailable') return 'unavailable';
  if (!enabled) return 'off';
  if (permission === 'denied') return 'denied';
  if (permission === 'notWired') return 'waiting';
  return 'on';
}

export const HEALTH_COPY = {
  title: 'Apple Health',
  lead: 'Saunafam can save each session to Apple Health as mindful minutes. It never reads anything from Health.',
  toggle: 'Save sessions to Apple Health',
  statusLabel: 'Status',
  row: { off: 'Off', on: 'On', denied: 'Not allowed', unavailable: 'Not on this device', waiting: 'On' } as Record<HealthState, string>,
  status: {
    off: 'Off. Nothing goes to Apple Health.',
    on: 'On. Each session you save goes into Health as mindful minutes, starting when it started.',
    denied: 'Health isn’t letting Saunafam save. Open the Health app, tap your picture, then Apps, Saunafam, and turn on Mindful Minutes.',
    unavailable: 'Apple Health isn’t on this device.',
    waiting: 'On. This test build can’t write to Health yet, so nothing has gone there.',
  } as Record<HealthState, string>,
  what: 'Only the minutes in the heat, from the time you started. No calories, no heart rate.',
  oldAccess:
    'Used Arro before? iOS may still list its old permission to read your workouts. Saunafam never reads them, and you can remove it in Settings, Health, Data Access & Devices.',
  openHealth: 'Open the Health app',
};

/** The switch and iOS's answer, for Settings. */
export function useHealthSetting() {
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<HealthPermission>('notAsked');

  useEffect(() => {
    let alive = true;
    Promise.all([loadHealthSetting(), healthBridge.status()]).then(([on, p]) => {
      if (!alive) return;
      setEnabledState(on);
      setPermission(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    setEnabledState(on);
    await saveHealthSetting(on).catch(() => undefined);
    if (on) setPermission(await healthBridge.request());
  }, []);

  return { enabled, state: enabled === null ? null : healthState(enabled, permission), setEnabled };
}
