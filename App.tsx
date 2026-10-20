import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { palette } from './src/theme/tokens';
import { fontFiles } from './src/theme/typography';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationTaps } from './src/navigation/NotificationTaps';
import { AppOverlays } from './src/navigation/AppOverlays';
import { DevLinks } from './src/navigation/DevLinks';
import { CantReachScreen } from './src/screens/CantReachScreen';
import { markSplashLeaving } from './src/components/splashSignal';
import { RootStackParamList } from './src/navigation/types';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { AppStateProvider, useApp } from './src/state/AppState';
import { missingServerSettings } from './src/state/supabase';
import { DevDriver, devDriverOn } from './src/dev/DevDriver';

// Keep the native splash (plain birch) up until the first JS frame is ready to
// match it: AnimatedSplash hides it. Called at module scope, as the Expo docs ask.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Flat birch navigation theme: no white flash between screens. */
const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: palette.birch, card: palette.birch },
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  // The build embeds Fraunces (the expo-font plugin in app.json); this covers
  // the web preview and resolves at once on a build that has them.
  const [fontsLoaded, fontError] = useFonts(fontFiles);

  if (missingServerSettings) return <MissingServerSettings />;

  return (
    <SafeAreaProvider>
      {/* The app reads Reduce Motion itself (useReduceMotion) and swaps each
          moment for its finished state and a crossfade. Reanimated's default
          would instead jump every animation to its end, crossfades included. */}
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <AppStateProvider>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
          <NotificationTaps navigation={navigationRef} />
          <AppOverlays navigation={navigationRef} />
          {__DEV__ ? <DevLinks navigation={navigationRef} /> : null}
          {devDriverOn ? <DevDriver navigation={navigationRef} /> : null}
          <Splash fontsReady={fontsLoaded || !!fontError} />
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

/** The animated splash, until it's played. Reads the cached session to know who's opening the app. */
function Splash({ fontsReady }: { fontsReady: boolean }) {
  const { ready, session } = useApp();
  const [done, setDone] = useState(false);
  const onDone = useCallback(() => {
    // In case the exit signal was missed, the end of the splash counts too.
    markSplashLeaving();
    setDone(true);
  }, []);
  if (done) return null;
  return <AnimatedSplash ready={ready && fontsReady} returning={!!session} onDone={onDone} onExit={markSplashLeaving} />;
}

/**
 * A release build made without .env.local (testflight.md). Better a plain notice
 * than an app that looks fine and keeps everyone's sessions on their own phone.
 */
function MissingServerSettings() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return (
    <SafeAreaProvider>
      <CantReachScreen />
    </SafeAreaProvider>
  );
}
