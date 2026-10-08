import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Literata_500Medium,
  Literata_500Medium_Italic,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import { colors } from './src/theme/tokens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AnimatedSplash } from './src/components/AnimatedSplash';

/** Flat, warm-neutral navigation theme — no white flash between screens. */
const arroTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.screen, card: colors.screen },
};

export default function App() {
  const [revealed, setRevealed] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const handleReveal = useCallback(() => setRevealed(true), []);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);
  const [fontsLoaded, fontError] = useFonts({
    Literata_500Medium,
    Literata_500Medium_Italic,
    Literata_600SemiBold,
  });
  // The splash covers the wait; if the fonts fail we still open with the system face.
  const ready = fontsLoaded || !!fontError;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={arroTheme}>
        <StatusBar style="dark" />
        {/* Mount behind the lifting splash so the first screen's entrance is seen, not spent. */}
        {ready && revealed && <RootNavigator />}
        {!splashDone && <AnimatedSplash onReveal={handleReveal} onDone={handleSplashDone} />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
