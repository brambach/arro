/**
 * The home screen icon, through expo-alternate-app-icons (the alternate icons
 * are declared in app.json and built into the app). The native module is
 * loaded lazily: Jest, the web build and a dev client built before the module
 * was added don't have it, and then changing the icon quietly does nothing.
 */
import type { AppIconName } from './look';

type Native = {
  supportsAlternateIcons: boolean;
  setAlternateAppIcon: (name: Exclude<AppIconName, 'default'> | null) => Promise<string | null>;
  getAppIconName: () => string | null;
};

function native(): Native | null {
  try {
    // A lazy require, so a build without the native module still starts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-alternate-app-icons') as Native;
    return mod.supportsAlternateIcons ? mod : null;
  } catch {
    return null;
  }
}

export function canChangeAppIcon(): boolean {
  return native() !== null;
}

/** The icon on the home screen now, or 'default'. */
export function currentAppIcon(): AppIconName {
  const name = native()?.getAppIconName() ?? null;
  return name === 'NightStone' || name === 'Cedar' || name === 'Lake' ? name : 'default';
}

/** iOS shows its own small "You have changed the icon" alert; that's Apple's, not ours. */
export async function applyAppIcon(name: AppIconName): Promise<boolean> {
  const mod = native();
  if (!mod) return false;
  if (currentAppIcon() === name) return true;
  try {
    await mod.setAlternateAppIcon(name === 'default' ? null : name);
    return true;
  } catch {
    return false;
  }
}
