import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { NavigationContainer, DefaultTheme, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/tokens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationTaps } from './src/navigation/NotificationTaps';
import { RootStackParamList } from './src/navigation/types';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { AppStateProvider } from './src/state/AppState';
import { missingServerSettings } from './src/state/supabase';
import { type } from './src/theme/typography';

/** Flat, warm-neutral navigation theme — no white flash between screens. */
const arroTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.screen, card: colors.screen },
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Instrument Serif, the heading face. A build has it embedded already (the
// expo-font plugin in app.json); this covers the web preview and dev builds
// made before it was added. Headings fall back to the system serif until it loads.
Font.loadAsync({ 'InstrumentSerif-Regular': require('./assets/fonts/InstrumentSerif-Regular.ttf') }).catch(() => {});

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  if (missingServerSettings) return <MissingServerSettings />;

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

/**
 * A release build made without .env.local (testflight.md). Better a plain notice
 * than an app that looks fine and keeps everyone's workouts on their own phone.
 */
function MissingServerSettings() {
  return (
    <View style={styles.missing}>
      <Text style={type.title}>This build can’t reach Arro</Text>
      <Text style={[type.body, { marginTop: 10 }]}>
        It was made without the server settings. Please delete it and install the latest version from TestFlight.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: colors.screen },
});
