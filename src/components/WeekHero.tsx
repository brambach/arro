import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { palette, space, WoodName } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { haptics } from '../theme/haptics';
import { maxFontScale, type } from '../theme/typography';
import { COPY, TodayView } from '../state/buildView';
import { checkInChange, checkInTimeline } from '../state/checkIn';
import { Card } from './Card';
import { RollingNumber } from './RollingNumber';
import { Slat } from './Slat';
import { SparkBurst } from './SparkBurst';
import { TextAction } from './TextAction';
import { Arrive } from './Arrive';

/**
 * Today's hero, "This week": the family streak in big coal Fraunces, your slat
 * for this week with an ember dot per counted day and "Week 9" in small caps,
 * "2 of 3 this week" and the family line.
 *
 * It plays the check-in (Key motion moment 5) when `today` moves on: the next
 * dot ignites with the save haptic at its peak and, when that session kept the
 * family's week, the slat fills with ember edge to edge, sparks fly off its
 * end with the week-kept haptic, then "Week kept, together" settles in.
 *
 * Solo founder: the streak line becomes "Your family streak starts when
 * someone joins" with an invite.
 */
type Props = {
  today: TodayView;
  wood: WoodName;
  /** Arrival indices: the number and greeting are 0, the slat 1. */
  arrive: boolean;
  onInvite: () => void;
};

export function WeekHero({ today, wood, arrive, onInvite }: Props) {
  const reduceMotion = useReduceMotion();
  const filled = today.you.countedDays;
  const [slatKept, setSlatKept] = useState(today.weekKept);
  const [burst, setBurst] = useState(0);
  const line = useSharedValue(today.weekKept ? 1 : 0);
  const before = useRef({ filled, weekKept: today.weekKept });

  useEffect(() => {
    const change = checkInChange(before.current, { filled, weekKept: today.weekKept });
    before.current = { filled, weekKept: today.weekKept };
    if (!today.weekKept) {
      // A session taken back: no moment, just the plain state.
      const t = setTimeout(() => setSlatKept(false), 0);
      line.set(withTiming(0, timing.utility));
      return () => clearTimeout(t);
    }
    if (!change.keep) return;
    const reduced = reduceMotion !== false;
    const at = checkInTimeline(change, reduced);
    const timers = [setTimeout(() => setSlatKept(true), at.fillAt)];
    if (reduced) timers.push(setTimeout(() => haptics.weekKept(), at.fullAt));
    line.set(withDelay(at.lineAt, withTiming(1, reduced ? timing.utility : moments.weekKept.line)));
    return () => timers.forEach(clearTimeout);
  }, [filled, today.weekKept, reduceMotion, line]);

  const onFilled = () => {
    haptics.weekKept();
    setBurst((b) => b + 1);
  };

  // One line out, then the other in: crossfading two lines of text in the same place reads as a smudge.
  const lineStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (line.value - 0.3) / 0.7),
    transform: [{ translateY: (1 - line.value) * moments.todayArrival.rise * 0.5 }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - line.value * 4) }));

  const solo = today.streak.kind === 'solo';
  const label = today.streak.label;

  return (
    <Card padding={space.s24}>
      <Arrive index={0} play={arrive}>
        {solo ? (
          <Text style={type.heading} maxFontSizeMultiplier={maxFontScale.heading}>
            {today.soloInvite?.title}
          </Text>
        ) : (
          <View style={styles.streak} accessible accessibilityRole="header" accessibilityLabel={`${today.streak.value} ${label}`}>
            <RollingNumber value={today.streak.value} color={palette.coal} rollIn={arrive} delay={moments.todayArrival.stagger} />
            <Text style={[type.heading, styles.streakLabel]} maxFontSizeMultiplier={maxFontScale.heading}>
              {label}
            </Text>
          </View>
        )}
      </Arrive>

      <Arrive index={1} play={arrive}>
        <View style={styles.slatWrap}>
          <Slat
            state={slatKept ? 'kept' : 'current'}
            wood={wood}
            height={54}
            seed={11}
            dots={{ filled, count: today.you.goal }}
            label={slatKept ? undefined : (today.slatLabel ?? undefined)}
            onIgnitePeak={haptics.save}
            onFilled={onFilled}
          />
          <View style={styles.sparks} pointerEvents="none">
            <SparkBurst burstKey={burst} />
          </View>
        </View>
        <View style={styles.lines}>
          <Animated.View style={progressStyle}>
            <Text style={type.bodyStrong}>{today.you.label}</Text>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, lineStyle]} pointerEvents="none">
            <Text style={[type.bodyStrong, styles.kept]} accessibilityLiveRegion="polite">
              {today.weekKept ? COPY.weekKept : ''}
            </Text>
          </Animated.View>
        </View>
        {today.familyLine ? <Text style={[type.bodySmall, styles.family]}>{today.familyLine}</Text> : null}
        {solo && today.soloInvite ? (
          <TextAction label={today.soloInvite.action} onPress={onInvite} tone="coal" size="bodySmall" style={styles.invite} />
        ) : null}
      </Arrive>
    </Card>
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: space.s12 },
  // Sits on the number's baseline: Fraunces' 24 pt descent is about 6 pt above the 64 pt one.
  streakLabel: { paddingBottom: space.s8 },
  slatWrap: { marginTop: space.s20 },
  // The top edge near the slat's end, where the fill finishes: they fly up over the
  // steam card, where they read (on the ember slat itself they vanished).
  sparks: { position: 'absolute', right: space.s40, top: 0 },
  lines: { marginTop: space.s16 },
  kept: { color: palette.coal },
  family: { marginTop: space.s4 },
  invite: { alignSelf: 'flex-start', marginTop: space.s8 },
});
