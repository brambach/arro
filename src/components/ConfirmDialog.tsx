import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { alpha, depth, layout, palette, radii, space } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';
import { SolidButton } from './SolidButton';
import { TextAction } from './TextAction';

/**
 * A designed confirm, drawn inside the screen (not the system alert): a card
 * that rises a little over a scrim. Cancel on the timer, the 3-hour prompt,
 * closing the log form with something in it.
 *
 * - `tone="dark"`: the timer room. A lifted char panel, steam text, an ember
 *   or ash button.
 * - `tone="light"`: a steam card over the birch screens.
 *
 * Actions are listed top to bottom: `primary` is the solid button, `secondary`
 * the ash or plain one, `quiet` a dim text action. Tapping the scrim does the
 * action marked `dismiss` (keep going, keep editing). Reduce Motion: a fade.
 */
export type DialogAction = {
  label: string;
  onPress: () => void;
  kind: 'primary' | 'secondary' | 'quiet';
  /** Also what tapping outside the card does. */
  dismiss?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  actions: DialogAction[];
  tone?: 'light' | 'dark';
};

export function ConfirmDialog({ visible, title, body, actions, tone = 'light' }: Props) {
  // Stays mounted through the fade out.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  if (!mounted) return null;
  return <DialogBody visible={visible} title={title} body={body} actions={actions} tone={tone} onGone={() => setMounted(false)} />;
}

function DialogBody({ visible, title, body, actions, tone, onGone }: Required<Omit<Props, 'body'>> & { body?: string; onGone: () => void }) {
  const reduceMotion = useReduceMotion();
  const shown = useSharedValue(0);
  const { rise, ...curve } = moments.roomPanel;

  useEffect(() => {
    if (visible) {
      shown.set(withTiming(1, reduceMotion === false ? curve : timing.utility));
      AccessibilityInfo.announceForAccessibility(title);
    } else {
      shown.set(
        withTiming(0, timing.utility, (finished) => {
          if (finished) scheduleOnRN(onGone);
        }),
      );
    }
    // curve is a constant from motion.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, shown, title, onGone]);

  const scrim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const card = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: reduceMotion === false ? (1 - shown.value) * rise : 0 }],
  }));
  const dark = tone === 'dark';
  const dismiss = actions.find((a) => a.dismiss);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? alpha.roomScrim : alpha.scrim }, scrim]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss?.onPress}
          accessibilityLabel={dismiss?.label}
          accessibilityRole="button"
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[styles.card, dark ? styles.cardDark : styles.cardLight, card]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Text
            style={[type.heading, { color: dark ? palette.steam : palette.char }]}
            maxFontSizeMultiplier={maxFontScale.heading}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {body ? <Text style={[type.bodySmall, styles.body, { color: dark ? alpha.steam72 : palette.smoke }]}>{body}</Text> : null}
          <View style={styles.actions}>
            {actions.map((a) =>
              a.kind === 'quiet' || (a.kind === 'secondary' && !dark) ? (
                <TextAction
                  key={a.label}
                  label={a.label}
                  onPress={a.onPress}
                  tone={dark ? 'steamDim' : a.kind === 'quiet' ? 'coal' : 'ink'}
                />
              ) : (
                <SolidButton key={a.label} title={a.label} onPress={a.onPress} tone={a.kind === 'primary' ? 'ember' : 'ash'} />
              ),
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingHorizontal: layout.inset },
  card: {
    borderRadius: radii.card,
    borderCurve: 'continuous',
    padding: space.s24,
  },
  cardDark: { backgroundColor: alpha.roomPanel, boxShadow: depth.ash },
  cardLight: { backgroundColor: palette.steam, boxShadow: depth.float },
  body: { marginTop: space.s8 },
  actions: { marginTop: space.s24, gap: space.s12 },
});
