import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/tokens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AnimatedSplash } from './src/components/AnimatedSplash';

/** Flat, warm-neutral navigation theme — no white flash between screens. */
const arroTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.screen, card: colors.screen },
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={arroTheme}>
        <StatusBar style="dark" />
        <RootNavigator />
        {!splashDone && <AnimatedSplash onDone={handleSplashDone} />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
