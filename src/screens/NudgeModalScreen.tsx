import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/tokens';
import { fonts, weights } from '../theme/typography';
import { easings, springs, useReduceMotion } from '../theme/motion';
import { AvatarRing } from '../components/AvatarRing';
import { Heart } from '../components/Icons';
import { PrimaryButton } from '../components/PrimaryButton';
import { members, today } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

/**
 * Nudge — the card rises into place, the avatar breathes in its owner's colour
 * while they still have today, and sending a cheer gets a real moment (a heart,
 * a success tick, "Sent") before the card lets go.
 */
export function NudgeModalScreen({ navigation }: RootStackScreenProps<'Nudge'>) {
  const member = members[today.pendingId];
  const reduceMotion = useReduceMotion();
  const [sent, setSent] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = () => navigation.goBack();
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.spring(enter, { toValue: 1, ...springs.settle, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: 1900, easing: easings.out, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, enter, halo]);

  const send = () => {
    if (sent) return;
    setSent(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduceMotion) {
      heart.setValue(1);
    } else {
      Animated.spring(heart, { toValue: 1, ...springs.pop, useNativeDriver: true }).start();
    }
    closeTimer.current = setTimeout(close, 1100);
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          {!reduceMotion && !sent ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  backgroundColor: member.color,
                  opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
                  transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
                },
              ]}
            />
          ) : null}
          <AvatarRing member={member} size={70} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartBadge,
              { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] },
            ]}
          >
            <Heart size={16} color={colors.white} />
          </Animated.View>
        </View>
        <Text style={styles.title}>
          {sent ? `Cheer sent to ${member.name}.` : `${member.name} still has today.`}
        </Text>
        <Text style={styles.sub}>{sent ? 'It’ll be waiting when they lace up.' : 'Usually an evening run.'}</Text>
        <View style={styles.divider} />
        <Text style={styles.prompt}>A little nudge?</Text>
        <Text style={styles.promptSub}>It’s never too late.</Text>
        <PrimaryButton title={sent ? 'Sent' : 'Send a cheer'} onPress={send} style={styles.cta} />
        <Pressable onPress={close} style={styles.notNow} hitSlop={6}>
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(28,20,12,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    width: '100%',
    backgroundColor: colors.screen,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 24 },
    elevation: 20,
  },
  avatarWrap: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 70, height: 70, borderRadius: 35 },
  heartBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.ink, marginTop: 16, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#ECE4D7', alignSelf: 'stretch', marginVertical: 20 },
  prompt: { fontSize: 16, fontWeight: weights.bold, color: colors.ink },
  promptSub: { fontSize: 13, color: colors.faint, marginTop: 4 },
  cta: { alignSelf: 'stretch', marginTop: 20 },
  notNow: { paddingVertical: 13, marginTop: 2 },
  notNowText: { fontSize: 14.5, fontWeight: weights.semibold, color: colors.muted },
});
