import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { fonts, weights } from '../theme/typography';
import { easings, useReduceMotion } from '../theme/motion';
import { Member } from '../data/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * FamilyRing — today's ring, split into one arc per person in their own colour.
 * Kept arcs draw in one after another; anyone who still has today is an empty
 * groove waiting to be filled. The centre holds the family's combined streak.
 * Reduced Motion → arcs render filled, no sweep.
 */
export function FamilyRing({
  members,
  size = 92,
  strokeWidth = 9,
  delay = 200,
}: {
  members: Member[];
  size?: number;
  strokeWidth?: number;
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = strokeWidth + 5; // round caps eat into the gap, so pad past the stroke
  const seg = circ / members.length - gap;
  const fills = useRef(members.map(() => new Animated.Value(seg))).current;
  const total = members.reduce((n, m) => n + m.streak, 0);

  useEffect(() => {
    if (reduceMotion === null) return;
    const kept = members.map((m, i) => (m.today === 'kept' ? i : -1)).filter((i) => i >= 0);
    if (reduceMotion) {
      kept.forEach((i) => fills[i].setValue(0));
      return;
    }
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.stagger(
        180,
        kept.map((i) =>
          Animated.timing(fills[i], { toValue: 0, duration: 520, easing: easings.out, useNativeDriver: false }),
        ),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, members, fills, delay]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {members.map((m, i) => {
          const rotate = -90 + (360 / members.length) * i + ((gap / 2) / circ) * 360;
          const transform = `rotate(${rotate} ${c} ${c})`;
          return (
            <React.Fragment key={m.id}>
              <Circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={colors.dividerSoft}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${seg} ${circ}`}
                transform={transform}
              />
              {m.today === 'kept' ? (
                <AnimatedCircle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${seg} ${circ}`}
                  strokeDashoffset={fills[i]}
                  transform={transform}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.total}>{total}</Text>
        <Text style={styles.caption}>days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  total: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: colors.ink },
  caption: { fontSize: 10.5, fontWeight: weights.semibold, color: colors.faint2, marginTop: -1 },
});
