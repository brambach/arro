import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { springs, useReduceMotion } from '../theme/motion';
import { MemberId, WeekState } from '../data/types';
import { members } from '../data/family';
import { AvatarRing } from './AvatarRing';
import { Check, Snowflake } from './Icons';

const BEAD = 22;

type Row = { memberId: MemberId; days: WeekState[] };

/**
 * StreakChain — the family's week as linked beads, one row per person. On
 * arrival the beads fill in a diagonal wave (top-left to bottom-right), the
 * links between kept days draw in behind them, and whoever still has today
 * gets a slow breathing halo. Reduced Motion → everything appears settled and
 * the halo holds still.
 */
export function StreakChain({
  rows,
  labels,
  delay = 0,
}: {
  rows: Row[];
  labels: string[];
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  const cols = labels.length;
  const beads = useRef(rows.map(() => labels.map(() => new Animated.Value(0)))).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      beads.forEach((r) => r.forEach((b) => b.setValue(1)));
      return;
    }
    const wave = Animated.parallel(
      beads.flatMap((r, ri) =>
        r.map((b, ci) =>
          Animated.sequence([
            Animated.delay(delay + ri * 90 + ci * 60),
            Animated.spring(b, { toValue: 1, ...springs.pop, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    const breathe = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: 1800, useNativeDriver: true }),
    );
    wave.start();
    const t = setTimeout(() => breathe.start(), delay + (rows.length + cols) * 70);
    return () => {
      wave.stop();
      breathe.stop();
      clearTimeout(t);
    };
  }, [reduceMotion, beads, halo, delay, rows.length, cols]);

  return (
    <View>
      {rows.map((row, ri) => {
        const member = members[row.memberId];
        return (
          <View key={row.memberId} style={[styles.row, ri > 0 && { marginTop: 14 }]}>
            <AvatarRing member={member} size={28} />
            <View style={styles.track}>
              {row.days.map((state, ci) => {
                const p = beads[ri][ci];
                const linkedToNext = ci < cols - 1 && state !== 'today' && row.days[ci + 1] !== 'today';
                return (
                  <React.Fragment key={ci}>
                    <Animated.View
                      style={{
                        opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                      }}
                    >
                      <Bead state={state} color={member.color} halo={state === 'today' ? halo : undefined} still={!!reduceMotion} />
                    </Animated.View>
                    {ci < cols - 1 ? (
                      <Animated.View
                        style={[
                          styles.link,
                          {
                            backgroundColor: linkedToNext ? member.color : colors.divider,
                            opacity: linkedToNext
                              ? beads[ri][ci + 1].interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] })
                              : 1,
                          },
                        ]}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.labels}>
        <View style={{ width: 28 }} />
        <View style={styles.labelTrack}>
          {labels.map((l, i) => (
            <Text key={i} style={[styles.label, i === cols - 1 && styles.labelToday]}>
              {l}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function Bead({
  state,
  color,
  halo,
  still,
}: {
  state: WeekState;
  color: string;
  halo?: Animated.Value;
  still: boolean;
}) {
  if (state === 'today') {
    return (
      <View style={styles.bead}>
        {halo && !still ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                borderColor: color,
                opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
              },
            ]}
          />
        ) : null}
        <View style={[styles.bead, styles.todayRing, { borderColor: color }]}>
          <View style={[styles.todayDot, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }
  if (state === 'freeze') {
    return (
      <View style={[styles.bead, { backgroundColor: colors.freezeBg }]}>
        <Snowflake size={12} color={colors.freezeIcon} />
      </View>
    );
  }
  if (state === 'missed') return <View style={[styles.bead, { backgroundColor: colors.divider }]} />;
  return (
    <View style={[styles.bead, { backgroundColor: color }]}>
      <Check size={11} color={colors.white} strokeWidth={3.4} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  link: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: -1 },
  bead: { width: BEAD, height: BEAD, borderRadius: BEAD / 2, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 2, backgroundColor: colors.white },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  halo: { position: 'absolute', width: BEAD, height: BEAD, borderRadius: BEAD / 2, borderWidth: 2 },
  labels: { flexDirection: 'row', gap: 12, marginTop: 10 },
  labelTrack: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  label: { width: BEAD, textAlign: 'center', fontSize: 10.5, fontWeight: weights.medium, color: colors.faint3 },
  labelToday: { color: colors.primary, fontWeight: weights.bold },
});
