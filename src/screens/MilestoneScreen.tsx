import React, { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { milestoneView } from '../state/buildView';
import { layout, palette, space } from '../theme/tokens';
import { emberPeakMs, moments, timing, useReduceMotion } from '../theme/motion';
import { haptics } from '../theme/haptics';
import { maxFontScale, type } from '../theme/typography';
import { Backdrop } from '../components/Backdrop';
import { Card } from '../components/Card';
import { FixedDigits } from '../components/FixedDigits';
import { MilestoneShareImage, ShareImageHandle } from '../components/MilestoneShareImage';
import { SlatWall } from '../components/SlatWall';
import { SolidButton } from '../components/SolidButton';
import { SteamWisps } from '../components/SteamWisps';
import { TextAction } from '../components/TextAction';
import { milestoneColumns, milestoneSlatHeight } from '../components/milestoneLayout';

/**
 * A streak milestone, 4, 8, 12, 26 or 52 weeks, family or personal (Key
 * motion moment 6). Shown once when due (Today opens it), or from a badge on
 * Me. A full-screen card: the wall builds up from the bottom one slat every
 * 50 ms, each landing on a spring; then the number lands in large Fraunces
 * with the ember overshoot (heavy, then success haptic at its peak) as steam
 * rises behind it. Share renders a 1080 x 1350 image. Never anything about Plus.
 */
export function MilestoneScreen({ navigation, route }: RootStackScreenProps<'Milestone'>) {
  const view = useView();
  const { markMilestoneShown } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const share = useRef<ShareImageHandle>(null);
  // The due milestone is read once: marking it shown must not blank the card as it closes.
  const [m] = useState(() => (route.params ? milestoneView(route.params, view.familyName) : view.milestone));
  const [built, setBuilt] = useState(false);
  const [sharing, setSharing] = useState(false);
  const n = useSharedValue(0);

  const close = () => {
    if (!route.params) markMilestoneShown();
    navigation.goBack();
  };

  // The number lands once the wall is up.
  useEffect(() => {
    if (!built) return;
    if (reduceMotion !== false) {
      n.set(withTiming(1, timing.utility));
      return;
    }
    n.set(withTiming(1, moments.milestoneWall.number));
    const t = setTimeout(haptics.milestone, emberPeakMs);
    return () => clearTimeout(t);
  }, [built, reduceMotion, n]);

  // With Reduce Motion the wall is simply there.
  useEffect(() => {
    if (reduceMotion !== true) return;
    const t = setTimeout(() => setBuilt(true), 0);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, n.value * 2),
    transform: [{ scale: reduceMotion === true ? 1 : 0.6 + 0.4 * n.value }],
  }));

  if (!m) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.s40 }]}>
        <Backdrop />
        <Text style={[type.heading, styles.center]}>Nothing to celebrate just now</Text>
        <TextAction label="Close" onPress={() => navigation.goBack()} style={styles.done} />
      </View>
    );
  }

  const cols = milestoneColumns(m.weeks);
  const slatHeight = milestoneSlatHeight(m.weeks);
  const inner = width - layout.gutter * 2 - space.s24 * 2;
  // One column stays wall-sized; side by side they share the card.
  const colWidth = cols.length === 1 ? Math.min(inner, 240) : (inner - space.s16 * (cols.length - 1)) / cols.length;

  const onShare = async () => {
    setSharing(true);
    try {
      const b64 = await share.current?.toPng();
      if (b64) await Share.share({ url: `data:image/png;base64,${b64}`, message: `${m.title}. ${m.subtitle}` });
    } catch {
      haptics.error();
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.s8, paddingBottom: insets.bottom + space.s8 }]}>
      <Backdrop />
      <Card float style={styles.card} padding={space.s24}>
        <Text style={[type.caption, styles.center]}>{m.kind === 'family' ? 'Together' : 'Your streak'}</Text>
        <View style={styles.wallArea}>
          <View style={styles.columns} accessible accessibilityLabel={`A wall of ${m.weeks} kept weeks`}>
            {cols.map((c, i) => (
              <WallColumn
                key={i}
                slats={c.slats}
                startIndex={c.startIndex}
                slatHeight={slatHeight}
                width={colWidth}
                last={i === cols.length - 1}
                onBuilt={() => setBuilt(true)}
              />
            ))}
          </View>
        </View>
        <View style={styles.numberArea}>
          <SteamWisps width={inner} height={140} rise={0.9} base={0.92} columns={[0.38, 0.5, 0.62]} draw={built} drawDuration={moments.splash.wisps.duration * 2} />
          <Animated.View style={numberStyle}>
            <FixedDigits value={String(m.weeks)} variant="display" color={palette.coal} accessibilityLabel={m.title} />
          </Animated.View>
        </View>
        <Text style={[type.heading, styles.center]} maxFontSizeMultiplier={maxFontScale.heading} accessibilityRole="header">
          {m.title.replace(/^\d+\s/, '')}
        </Text>
        <Text style={[type.bodySmall, styles.center, styles.sub]}>{m.subtitle}</Text>
        <SolidButton title={sharing ? 'Getting it ready' : 'Share'} onPress={onShare} disabled={sharing} style={styles.share} />
        <TextAction label="Done" onPress={close} style={styles.done} />
      </Card>
      <MilestoneShareImage ref={share} weeks={m.weeks} title={m.title} familyName={view.familyName} />
    </View>
  );
}

/** One column of the wall; it mounts (and starts building) when its first slat's turn comes. */
function WallColumn({
  slats,
  startIndex,
  slatHeight,
  width,
  last,
  onBuilt,
}: {
  slats: number;
  startIndex: number;
  slatHeight: number;
  width: number;
  last: boolean;
  onBuilt: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const [on, setOn] = useState(startIndex === 0);
  useEffect(() => {
    if (on) return;
    const t = setTimeout(() => setOn(true), reduceMotion ? 0 : startIndex * moments.milestoneWall.perSlat);
    return () => clearTimeout(t);
  }, [on, startIndex, reduceMotion]);
  return (
    <View style={{ width }}>
      {on ? (
        <SlatWall
          weeks={Array.from({ length: slats }, () => ({ state: 'kept' as const }))}
          slatHeight={slatHeight}
          build
          onBuilt={last ? onBuilt : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch, paddingHorizontal: layout.gutter },
  card: { flex: 1 },
  center: { textAlign: 'center' },
  wallArea: { flex: 1, justifyContent: 'center', marginTop: space.s16 },
  columns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: space.s16 },
  // Tall enough for the steam to rise behind the number without crossing the title.
  numberArea: { alignItems: 'center', justifyContent: 'flex-end', height: 140, marginTop: space.s16 },
  sub: { marginTop: space.s8 },
  share: { marginTop: space.s24 },
  done: { marginTop: space.s8 },
});
