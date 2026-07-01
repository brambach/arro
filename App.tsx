import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Literata_500Medium,
  Literata_600SemiBold,
  Literata_500Medium_Italic,
} from '@expo-google-fonts/literata';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { colors } from './src/theme/tokens';
import { RootNavigator } from './src/navigation/RootNavigator';

/** Warm navigation theme so there's never a white flash between screens. */
const arroTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.cream, card: colors.surface },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Literata_500Medium,
    Literata_600SemiBold,
    Literata_500Medium_Italic,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={arroTheme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
