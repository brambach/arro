import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { space } from '../theme/tokens';
import { NoticeScreen } from '../components/NoticeScreen';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';
import { useApp } from '../state/AppState';
import { COPY } from '../state/buildView';

export const UPDATE_COPY = {
  title: 'Time to update',
  body: COPY.updateRequired,
  testflight: 'Open TestFlight',
  appStore: 'Open the App Store',
  leavePreview: 'Leave the preview',
};

const openTestFlight = () => Linking.openURL('itms-beta://').catch(() => Linking.openURL('https://testflight.apple.com'));
const openAppStore = () => Linking.openURL('itms-apps://apps.apple.com').catch(() => undefined);

/**
 * app_config().min_ios_build is above this build (view.updateRequired). It's
 * the only screen until the app is updated: everything else would be talking to
 * a server that has moved on.
 */
export function UpdateRequiredScreen() {
  const { preview, setPreview } = useApp();
  return (
    <NoticeScreen title={UPDATE_COPY.title} body={UPDATE_COPY.body}>
      <SolidButton title={UPDATE_COPY.testflight} onPress={openTestFlight} />
      <TextAction label={UPDATE_COPY.appStore} onPress={openAppStore} style={styles.second} />
      {__DEV__ && preview ? <TextAction label={UPDATE_COPY.leavePreview} tone="coal" onPress={() => setPreview(null)} /> : null}
    </NoticeScreen>
  );
}

const styles = StyleSheet.create({ second: { marginTop: space.s8 } });
