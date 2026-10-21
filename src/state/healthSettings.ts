import { useCallback, useEffect, useState } from 'react';
import { useApp } from './AppState';
import {
  HEALTH_SETTING_KEY,
  HealthPermission,
  healthPermission,
  loadHealthSetting,
  requestHealthPermission,
  saveHealthSetting,
} from './health';

/**
 * Settings > Apple Health: "Save sessions to Apple Health", kept on this phone
 * (saunafam.health.v1), off until the person turns it on (spec, section 3,
 * "Apple Health"; open question 3). Turning it on asks iOS for write-only
 * permission (mindful minutes); src/state/health.ts does the writing.
 */
export { HEALTH_SETTING_KEY, loadHealthSetting, saveHealthSetting };
export type { HealthPermission };

export interface HealthBridge {
  /** Ask for write-only permission (mindful minutes). */
  request: () => Promise<HealthPermission>;
  /** The current answer, without asking. */
  status: () => Promise<HealthPermission>;
}

/** @appeeky/expo-healthkit, through health.ts. */
export const healthBridge: HealthBridge = {
  request: requestHealthPermission,
  status: healthPermission,
};

/** Turns the switch on or off; on asks iOS (once) and says what it answered. */
export async function setHealthEnabled(on: boolean): Promise<HealthPermission> {
  await saveHealthSetting(on).catch(() => undefined);
  return on ? healthBridge.request() : healthBridge.status();
}

export type HealthState = 'off' | 'on' | 'denied' | 'unavailable';

/** What the screen shows, from the stored switch and iOS's answer. */
export function healthState(enabled: boolean, permission: HealthPermission): HealthState {
  if (permission === 'unavailable') return 'unavailable';
  if (!enabled) return 'off';
  if (permission === 'denied') return 'denied';
  return 'on';
}

export const HEALTH_COPY = {
  title: 'Apple Health',
  lead: 'Saunafam can save each session to Apple Health as mindful minutes. It never reads anything from Health.',
  toggle: 'Save sessions to Apple Health',
  statusLabel: 'Status',
  row: { off: 'Off', on: 'On', denied: 'Not allowed', unavailable: 'Not on this device' } as Record<HealthState, string>,
  status: {
    off: 'Off. Nothing goes to Apple Health.',
    on: 'On. Each session you save goes into Health as mindful minutes, starting when it started.',
    denied: 'Health isn’t letting Saunafam save. Open the Health app, tap your picture, then Apps, Saunafam, and turn on Mindful Minutes.',
    unavailable: 'Apple Health isn’t on this device.',
  } as Record<HealthState, string>,
  what: 'Only the minutes in the heat, from the time you started. No calories, no heart rate.',
  oldAccess:
    'Used Arro before? iOS may still list its old permission to read your workouts. Saunafam never reads them, and you can remove it in Settings, Health, Data Access & Devices.',
  openHealth: 'Open the Health app',
};

/** The switch and iOS's answer, for Settings. */
export function useHealthSetting() {
  const { syncHealth } = useApp();
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
    const answer = await setHealthEnabled(on);
    setPermission(answer);
    // Sessions from the past week go in now; new ones as they're saved.
    if (on && answer === 'granted') syncHealth();
  }, [syncHealth]);

  return { enabled, state: enabled === null ? null : healthState(enabled, permission), setEnabled };
}
