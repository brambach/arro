/**
 * The two Plus looks each person picks for themselves (spec, Paid tier): the
 * timer face and the app icon. Kept on this phone (saunafam.look.v1), per
 * member. They only take effect while the family has Plus and plus_enabled is
 * on; otherwise the timer is Löyly and the icon is the default, whatever was
 * picked, so a plan coming back brings the pick back too.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MemberId } from '../data/types';

export const LOOK_KEY = 'saunafam.look.v1';

export type TimerFace = 'loyly' | 'coal' | 'brass';
/** `default` is the main icon; the rest are the native alternate icon names (app.json). */
export type AppIconName = 'default' | 'NightStone' | 'Cedar' | 'Lake';

export interface Look {
  timerFace: TimerFace;
  appIcon: AppIconName;
}

export const DEFAULT_LOOK: Look = { timerFace: 'loyly', appIcon: 'default' };

export const TIMER_FACES: { id: TimerFace; name: string; detail: string; plus: boolean }[] = [
  { id: 'loyly', name: 'Löyly', detail: 'Ember dots on char. Free, always', plus: false },
  { id: 'coal', name: 'Coal', detail: 'A glowing ring on soot', plus: true },
  { id: 'brass', name: 'Brass', detail: 'A brass clock in the dark room', plus: true },
];

export const APP_ICONS: { id: AppIconName; name: string; detail: string; plus: boolean }[] = [
  { id: 'default', name: 'Löyly', detail: 'The warm stone. Free, always', plus: false },
  { id: 'NightStone', name: 'Night stone', detail: 'The stone after dark', plus: true },
  { id: 'Cedar', name: 'Cedar', detail: 'The stone on cedar boards', plus: true },
  { id: 'Lake', name: 'Lake', detail: 'The stone by cold water', plus: true },
];

const FACE_IDS = new Set<string>(TIMER_FACES.map((f) => f.id));
const ICON_IDS = new Set<string>(APP_ICONS.map((i) => i.id));

/** What actually shows: the pick while the family has Plus, otherwise the free look. */
export function effectiveLook(look: Look, plus: { visible: boolean; active: boolean }): Look {
  return plus.visible && plus.active ? look : DEFAULT_LOOK;
}

export function parseLooks(raw: string | null): Record<MemberId, Look> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, Partial<Look>>;
    const out: Record<MemberId, Look> = {};
    for (const [id, l] of Object.entries(v ?? {})) {
      out[id] = {
        timerFace: l && typeof l.timerFace === 'string' && FACE_IDS.has(l.timerFace) ? l.timerFace : 'loyly',
        appIcon: l && typeof l.appIcon === 'string' && ICON_IDS.has(l.appIcon) ? l.appIcon : 'default',
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadLooks(): Promise<Record<MemberId, Look>> {
  try {
    return parseLooks(await AsyncStorage.getItem(LOOK_KEY));
  } catch {
    return {};
  }
}

export async function saveLooks(looks: Record<MemberId, Look>): Promise<void> {
  await AsyncStorage.setItem(LOOK_KEY, JSON.stringify(looks));
}
