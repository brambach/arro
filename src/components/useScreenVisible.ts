import { useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

/**
 * True while the screen this component sits in is visible: focused in the
 * navigator (when there is one) and the app in the foreground. Ambient loops
 * run only while this is true (Quality bar, Ambient loops).
 *
 * Works outside a navigator too (the splash), where only the app state counts.
 */
export function useScreenVisible(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  const [foreground, setForeground] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    if (!navigation) return;
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active' || s === 'inactive'));
    return () => sub.remove();
  }, []);

  return focused && foreground;
}
