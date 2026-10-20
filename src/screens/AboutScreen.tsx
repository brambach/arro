import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { space } from '../theme/tokens';
import { type } from '../theme/typography';
import { StoneMark } from '../components/brand/StoneMark';
import { Wordmark } from '../components/brand/Wordmark';
import { Card } from '../components/Card';
import { ListGroup, ListRow } from '../components/ListRow';
import { SubScreen } from '../components/SubScreen';
import { RootStackScreenProps } from '../navigation/types';
import { APP_BUILD } from '../state/appBuild';
import { LINKS } from './SettingsScreen';

export const ABOUT_COPY = {
  title: 'About',
  tagline: 'A weekly sauna streak for the people you sauna with.',
  version: 'Version',
  versionValue: (v: string, build: number) => `${v} (${build})`,
  site: 'saunafam.com',
  support: 'Email support',
  supportAddress: 'support@saunafam.com',
  made: 'Made by one person, Bryce. Sessions, photos and cheers stay inside your family. No ads, ever.',
};

/** Settings > About: the mark, the version and build, the site and support. */
export function AboutScreen({ navigation }: RootStackScreenProps<'About'>) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <SubScreen title={ABOUT_COPY.title} onBack={() => navigation.goBack()}>
      <Card padding={32} style={styles.hero}>
        <StoneMark width={88} />
        <View style={styles.word}>
          <Wordmark fontSize={28} />
        </View>
        <Text style={[type.bodySmall, styles.center]}>{ABOUT_COPY.tagline}</Text>
      </Card>
      <ListGroup style={styles.rows}>
        <ListRow title={ABOUT_COPY.version} value={ABOUT_COPY.versionValue(version, APP_BUILD)} />
        <ListRow title={ABOUT_COPY.site} onPress={() => Linking.openURL('https://saunafam.com')} accessibilityHint="Opens saunafam.com" />
        <ListRow title="Privacy" onPress={() => Linking.openURL(LINKS.privacy)} accessibilityHint="Opens saunafam.com" />
        <ListRow title={ABOUT_COPY.support} value={ABOUT_COPY.supportAddress} onPress={() => Linking.openURL(`mailto:${ABOUT_COPY.supportAddress}`)} />
      </ListGroup>
      <Text style={[type.label, styles.made]}>{ABOUT_COPY.made}</Text>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  word: { marginTop: space.s16, marginBottom: space.s12 },
  center: { textAlign: 'center' },
  rows: { marginTop: space.s24 },
  made: { marginTop: space.s16, marginHorizontal: space.s8, textAlign: 'center' },
});
