import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft, MapPin } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PhotoSlot } from '../components/PhotoSlot';
import { useView } from '../state/AppState';
import { WorkoutDetail } from '../data/types';
import { joinNames, workoutSourceLabels, workoutTypeLabels } from '../data/workouts';
import { RootStackScreenProps } from '../navigation/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DASH = 340;
const MAP_W = 320;

export function WorkoutDetailScreen({ navigation, route }: RootStackScreenProps<'WorkoutDetail'>) {
  const insets = useSafeAreaInsets();
  const view = useView();
  const workout: WorkoutDetail | undefined = view.workouts[route.params.workoutId];
  const hasRoute = !!workout?.route;
  const offset = useRef(new Animated.Value(DASH)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => m && setReduceMotion(v))
      .catch(() => m && setReduceMotion(false));
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => {
    if (!hasRoute || reduceMotion === null) return; // wait for the probe so reduce-motion never sees a partial draw
    if (reduceMotion) {
      offset.setValue(0);
      return;
    }
    // C6 route reveal: the route draws across the map, then the stats fade in.
    const anim = Animated.timing(offset, {
      toValue: 0,
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [hasRoute, reduceMotion, offset]);

  if (!workout) return null;

  const label = workoutTypeLabels[workout.type];
  const cheerers = workout.cheeredBy.map((id) => view.members[id]).filter(Boolean);
  const stats = [
    workout.duration ? { value: workout.duration, label: 'Time' } : null,
    { value: workoutSourceLabels[workout.source], label: 'Logged with' },
    // The map already labels the place.
    workout.place && !workout.route ? { value: workout.place, label: 'Where' } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);
  // With a route, the stats wait for the line to finish drawing.
  const statsDelay = workout.route ? 580 : 60;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {workout.route ? (
          <View style={styles.mapWrap}>
            <View style={styles.river} />
            <Svg viewBox={`0 0 ${MAP_W} 194`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
              <AnimatedPath
                d={workout.route.path}
                fill="none"
                stroke={colors.ink}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={DASH}
                strokeDashoffset={offset}
              />
              <Circle
                cx={workout.route.start.x}
                cy={workout.route.start.y}
                r={6.5}
                fill={colors.white}
                stroke={colors.ink}
                strokeWidth={3.5}
              />
            </Svg>
            <View
              style={[
                styles.pin,
                { left: `${(workout.route.pin.x / MAP_W) * 100}%`, top: workout.route.pin.y - 22 },
              ]}
            >
              <MapPin size={26} color={colors.ink} />
            </View>
            {workout.place ? (
              <View style={styles.mapLabel}>
                <Text style={styles.mapLabelText}>{workout.place}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {workout.photoUri ? <PhotoSlot uri={workout.photoUri} style={styles.photo} /> : null}

        <View style={styles.headline}>
          <Text style={styles.when}>{workout.when}</Text>
          <Text style={styles.kind}>{label}</Text>
        </View>

        <FadeInView delay={statsDelay} style={styles.statsWrap}>
          <View style={styles.stats}>
            {stats.map((s, i) => (
              <Stat key={s.label} value={s.value} label={s.label} first={i === 0} />
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={statsDelay + 120} style={styles.noteWrap}>
          {workout.note ? <Text style={styles.note}>{workout.note}</Text> : null}
          {cheerers.length > 0 ? (
            <View style={[styles.cheered, !workout.note && { marginTop: 0 }]}>
              <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
              <Text style={styles.cheeredText}>{joinNames(cheerers.map((c) => c.name))} cheered</Text>
            </View>
          ) : null}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, first }: { value: string; label: string; first?: boolean }) {
  return (
    <View style={[styles.stat, !first && styles.statBorder]}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: 16 },
  headerTitle: { ...type.name },
  mapWrap: {
    marginHorizontal: spacing.gutter,
    marginTop: 6,
    height: 194,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.track,
  },
  river: {
    position: 'absolute',
    left: '-12%',
    top: '34%',
    width: '130%',
    height: 52,
    backgroundColor: '#C9D5DA', // a muted river, the one blue on the map
    transform: [{ rotate: '-9deg' }],
    opacity: 0.9,
  },
  pin: { position: 'absolute', marginLeft: -12 },
  mapLabel: {
    position: 'absolute',
    left: 12,
    bottom: 11,
    backgroundColor: 'rgba(250,246,240,0.82)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  mapLabelText: { ...type.meta, color: colors.inkSoft, fontWeight: weights.medium },
  photo: { marginHorizontal: spacing.gutter, marginTop: 6, height: 220, borderRadius: radii.card },
  headline: { paddingHorizontal: spacing.gutter, paddingTop: 18 },
  when: { ...type.meta, color: colors.muted },
  kind: { ...type.title, fontSize: 32, lineHeight: 38, marginTop: 2 },
  statsWrap: { paddingHorizontal: spacing.gutter, paddingTop: 16 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  stat: { flex: 1, paddingVertical: 13 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 18 },
  statValue: { fontSize: 17, fontWeight: weights.semibold, color: colors.ink },
  statLabel: { ...type.meta, color: colors.muted, marginTop: 2 },
  noteWrap: { paddingHorizontal: spacing.gutter, paddingTop: 16 },
  note: { ...type.body, color: colors.inkSoft },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 15 },
  cheeredText: { ...type.meta, color: colors.muted },
});
