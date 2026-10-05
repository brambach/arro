import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/tokens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationTaps } from './src/navigation/NotificationTaps';
import { RootStackParamList } from './src/navigation/types';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { AppStateProvider } from './src/state/AppState';

/** Flat, warm-neutral navigation theme — no white flash between screens. */
const arroTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.screen, card: colors.screen },
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationContainer ref={navigationRef} theme={arroTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
          <NotificationTaps navigation={navigationRef} />
          {!splashDone && <AnimatedSplash onDone={handleSplashDone} />}
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
