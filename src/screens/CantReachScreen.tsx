import React from 'react';
import { Linking } from 'react-native';
import { NoticeScreen } from '../components/NoticeScreen';
import { SolidButton } from '../components/SolidButton';

export const CANT_REACH_COPY = {
  title: 'This build can’t reach Saunafam',
  body: 'It was made without the server settings, so nothing you log would reach your family. Delete it and install the latest build from TestFlight.',
  testflight: 'Open TestFlight',
};

/**
 * A release build made without EXPO_PUBLIC_SUPABASE_URL and the anon key
 * (design/app-store/testflight.md). A plain notice beats an app that looks fine
 * and keeps everyone's sessions on one phone. App.tsx shows it; dev builds can
 * open it as the CantReach route for captures.
 */
export function CantReachScreen() {
  return (
    <NoticeScreen title={CANT_REACH_COPY.title} body={CANT_REACH_COPY.body}>
      <SolidButton
        title={CANT_REACH_COPY.testflight}
        onPress={() => Linking.openURL('itms-beta://').catch(() => Linking.openURL('https://testflight.apple.com'))}
      />
    </NoticeScreen>
  );
}
