import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, palette, space } from '../../theme/tokens';
import { maxFontScale, type } from '../../theme/typography';
import { moments } from '../../theme/motion';
import { Backdrop } from '../../components/Backdrop';
import { SPLASH_MARK } from '../../components/AnimatedSplash';
import { StoneMark } from '../../components/brand/StoneMark';
import { Wordmark } from '../../components/brand/Wordmark';
import { Settle } from '../../components/Settle';
import { SolidButton } from '../../components/SolidButton';
import { TextAction } from '../../components/TextAction';
import { useSplashLeaving } from '../../components/splashSignal';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';

/**
 * Welcome (spec, section 3, Onboarding, and Key motion moment 1). The stone
 * and wordmark sit exactly where the splash leaves them (centered, lifted 8 pt),
 * and they're already there under the splash, so as it fades the mark simply
 * stays. The splash's wisps thin into this screen's own haze. Then the words
 * and the actions settle in, once, as the splash lifts away.
 *
 * Where the screen is short or the type is very large, the mark moves up out of
 * the way instead of matching the splash.
 */
export const WELCOME_COPY = {
  headline: 'Keep a sauna streak together.',
  family: 'Family means whoever you sauna with.',
  start: 'Start a family',
  invite: 'I have an invite',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
};

export function WelcomeScreen({ navigation }: RootStackScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const { startFlow } = useApp();
  const go = useSplashLeaving();
  // The splash's position only fits a tall screen at ordinary sizes.
  const matchSplash = height >= 800 && fontScale <= 1.2;

  const mark = (
    <View style={styles.markInner}>
      <StoneMark width={SPLASH_MARK.stoneWidth} />
      <View style={{ marginTop: SPLASH_MARK.gap }}>
        <Wordmark fontSize={SPLASH_MARK.wordSize} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Backdrop />
      {matchSplash ? (
        <View style={[StyleSheet.absoluteFill, styles.markCenter]} pointerEvents="none">
          <View style={{ transform: [{ translateY: -moments.splash.exit.lift }] }}>{mark}</View>
        </View>
      ) : null}

      <View style={[styles.column, { paddingTop: insets.top + space.s40, paddingBottom: insets.bottom + space.s16 }]}>
        {matchSplash ? <View style={styles.flex} /> : <View style={styles.markTop}>{mark}</View>}
        {matchSplash ? null : <View style={styles.flexSmall} />}

        <Settle index={0} go={go}>
          <Text style={[type.title, styles.center]} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
            {WELCOME_COPY.headline}
          </Text>
          <Text style={[type.body, styles.center, styles.family]}>{WELCOME_COPY.family}</Text>
        </Settle>

        <Settle index={1} go={go} style={styles.actions}>
          <SolidButton
            title={WELCOME_COPY.start}
            onPress={() => {
              startFlow('founder');
              navigation.navigate('SignIn');
            }}
          />
          <TextAction
            label={WELCOME_COPY.invite}
            onPress={() => {
              startFlow('invitee');
              navigation.navigate('JoinCode');
            }}
            style={styles.invite}
          />
          <Pressable
            onPress={() => {
              startFlow('founder');
              navigation.navigate('SignIn', { returning: true });
            }}
            hitSlop={space.s8}
            accessibilityRole="button"
            accessibilityLabel={`${WELCOME_COPY.haveAccount} ${WELCOME_COPY.signIn}`}
            style={styles.signIn}
          >
            {({ pressed }) => (
              <Text style={[type.bodySmall, styles.center, pressed && styles.pressed]}>
                {WELCOME_COPY.haveAccount} <Text style={styles.signInWord}>{WELCOME_COPY.signIn}</Text>
              </Text>
            )}
          </Pressable>
        </Settle>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  markCenter: { alignItems: 'center', justifyContent: 'center' },
  markInner: { alignItems: 'center' },
  markTop: { alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: layout.inset },
  flex: { flex: 1 },
  flexSmall: { flex: 1, minHeight: space.s32 },
  center: { textAlign: 'center' },
  family: { color: palette.smoke, marginTop: space.s12 },
  actions: { marginTop: space.s40 },
  invite: { marginTop: space.s12 },
  signIn: { marginTop: space.s8, paddingVertical: space.s12 },
  signInWord: { fontWeight: '600', color: palette.char },
  pressed: { opacity: 0.55 },
});
